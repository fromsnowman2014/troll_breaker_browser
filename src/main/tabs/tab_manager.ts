// TabManager — lifecycle of WebContentsView per tab. Single source of truth
// for tab state in main; the renderer mirrors via evt:tab:* events.
//
// Security invariants per ARCHITECTURE.md §4 + §9:
//   - WebContentsView: sandbox=true, contextIsolation=true, nodeIntegration=false
//   - Page preload (out/preload/page-preload.cjs) loaded into every view
//   - No Node, no fs, no fetch from page renderers
//
// Layout: tabs share one BrowserWindow's contentView. setBounds positions them
// below the chrome (top inset = current chromeTopInset). Tab switch toggles
// setVisible (do NOT destroy on switch — perf hit).

import { BrowserWindow, Menu, MenuItem, WebContentsView } from "electron";
import { ulid } from "ulid";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Tab } from "./tab.js";
import { IPC } from "../shared/ipc-channels.js";
import type { TabSummary } from "../shared/schemas/ipc.js";
import { log } from "../lib/log.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_PRELOAD = join(__dirname, "../preload/page-preload.cjs");

// Default chrome inset before the renderer measures itself + reports back via
// ui:tab:chrome_bounds. titleBarStyle="hiddenInset" (mac) reserves ~28px for
// traffic lights overlaid on the content area; TabStrip h-9 = 36, NavRow h-14
// = 56 → total ~120 on mac. Windows/Linux use a native title bar so content
// excludes it and the inset is just 92.
const DEFAULT_CHROME_INSET = process.platform === "darwin" ? 120 : 92;
const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 800;

export class TabManager {
  private readonly tabs = new Map<string, Tab>();
  private order: string[] = [];
  private activeId: string | null = null;
  private chromeTopInset = DEFAULT_CHROME_INSET;
  private destroyed = false;

  constructor(private readonly window: BrowserWindow) {
    window.on("resize", () => this.resizeActive());
    window.on("close", () => {
      this.destroyed = true;
    });
    // Race-condition defense: window can return [0, 0] from getContentSize()
    // before it's shown. Re-sync on ready-to-show + first chrome paint so the
    // active WebContentsView gets correct bounds even if openTab raced ahead.
    window.once("ready-to-show", () => {
      log.info("window ready-to-show; re-syncing tab bounds");
      this.resizeActive();
    });
    window.webContents.once("did-finish-load", () => {
      log.info("chrome renderer did-finish-load; re-syncing tab bounds");
      this.resizeActive();
    });
  }

  setChromeTopInset(px: number): void {
    this.chromeTopInset = Math.max(0, Math.round(px));
    this.resizeActive();
  }

  openTab(url?: string): TabSummary {
    const view = new WebContentsView({
      webPreferences: {
        preload: PAGE_PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    const id = ulid();
    const initialUrl = url ?? "about:blank";
    const tab: Tab = {
      tab_id: id,
      view,
      url: initialUrl,
      title: "",
      is_loading: false,
      created_at: Date.now(),
    };
    this.tabs.set(id, tab);
    this.order.push(id);
    log.info(`openTab id=${id.slice(-6)} url=${initialUrl}`);

    // Seed initial bounds BEFORE addChildView. If the window isn't shown yet,
    // getContentSize() returns [0, 0] and the view would be created at 0×0 —
    // invisible until something else triggers a resize. Fall back to the
    // intended window size; ready-to-show will re-sync to actual.
    const [w0, h0] = this.window.getContentSize();
    const initW = w0 && w0 > 0 ? w0 : FALLBACK_WIDTH;
    const initH = h0 && h0 > 0 ? h0 : FALLBACK_HEIGHT;
    const inset = this.chromeTopInset;
    view.setBounds({
      x: 0,
      y: inset,
      width: initW,
      height: Math.max(0, initH - inset),
    });

    this.window.contentView.addChildView(view);
    this.wireEvents(tab);
    void view.webContents.loadURL(initialUrl).catch((err) => {
      log.warn(`loadURL initial failed id=${id.slice(-6)} url=${initialUrl}`, err);
    });
    this.activate(id);
    log.info(
      `openTab done id=${id.slice(-6)} bounds=${initW}x${Math.max(0, initH - inset)} inset=${inset}`,
    );

    // Debug-only: auto-open page DevTools so we can inspect what the page is
    // actually doing (network, console). Detached so it doesn't steal real
    // estate from the small panel.
    if (process.env["TS_DEBUG"] === "1") {
      setTimeout(() => {
        try {
          view.webContents.openDevTools({ mode: "detach" });
        } catch {
          /* noop */
        }
      }, 500);
    }

    return this.toSummary(tab);
  }

  closeTab(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    this.tabs.delete(id);
    this.order = this.order.filter((x) => x !== id);
    try {
      this.window.contentView.removeChildView(tab.view);
    } catch {
      // window destroyed
    }
    try {
      tab.view.webContents.close();
    } catch {
      // already closed
    }
    this.emit(IPC.EVT_TAB_CLOSED, { tab_id: id });

    if (this.activeId === id) {
      const next = this.order[this.order.length - 1];
      if (next) {
        this.activate(next);
      } else if (!this.destroyed) {
        this.openTab("about:blank");
      }
    }
  }

  switchTab(id: string): void {
    if (!this.tabs.has(id)) return;
    this.activate(id);
  }

  navigate(id: string, url: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    log.info(`navigate id=${id.slice(-6)} url=${url}`);
    void tab.view.webContents.loadURL(url).catch((err) => {
      log.warn(`loadURL failed id=${id.slice(-6)} url=${url}`, err);
    });
  }

  reload(id: string, hard: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (hard) tab.view.webContents.reloadIgnoringCache();
    else tab.view.webContents.reload();
  }

  back(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (tab.view.webContents.navigationHistory.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack();
    }
  }

  forward(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (tab.view.webContents.navigationHistory.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward();
    }
  }

  findStart(id: string, text: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.view.webContents.findInPage(text);
  }

  findNext(id: string, forward: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.view.webContents.findInPage("", { forward, findNext: true });
  }

  findStop(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.view.webContents.stopFindInPage("clearSelection");
  }

  list(): TabSummary[] {
    return this.order
      .map((id) => this.tabs.get(id))
      .filter((t): t is Tab => !!t)
      .map((t) => this.toSummary(t));
  }

  snapshot(): { tabs: { url: string; title: string }[]; active_index: number } {
    const tabs = this.order
      .map((id) => this.tabs.get(id))
      .filter((t): t is Tab => !!t)
      .map((t) => ({ url: t.url, title: t.title }));
    const active_index = this.activeId ? Math.max(0, this.order.indexOf(this.activeId)) : 0;
    return { tabs, active_index };
  }

  activeTabId(): string | null {
    return this.activeId;
  }

  activeWebContents(): Electron.WebContents | null {
    if (!this.activeId) return null;
    const tab = this.tabs.get(this.activeId);
    return tab?.view.webContents ?? null;
  }

  // ─────────────────────────────────────────────
  // internals
  // ─────────────────────────────────────────────

  private activate(id: string): void {
    if (this.activeId === id) return;
    if (this.activeId) {
      const prev = this.tabs.get(this.activeId);
      if (prev) prev.view.setVisible(false);
    }
    const next = this.tabs.get(id);
    if (!next) return;
    next.view.setVisible(true);
    this.activeId = id;
    this.resizeActive();
    this.emit(IPC.EVT_TAB_FOCUS_CHANGED, { tab_id: id });
  }

  private resizeActive(): void {
    if (this.destroyed || !this.activeId) return;
    const active = this.tabs.get(this.activeId);
    if (!active) return;
    const size = this.window.getContentSize();
    // Use fallback sizes when window isn't shown yet, so the view is still
    // visible (rather than 0×0 and invisible).
    const w = size[0] && size[0] > 0 ? size[0] : FALLBACK_WIDTH;
    const h = size[1] && size[1] > 0 ? size[1] : FALLBACK_HEIGHT;
    const top = this.chromeTopInset;
    const bounds = {
      x: 0,
      y: top,
      width: Math.max(0, w),
      height: Math.max(0, h - top),
    };
    active.view.setBounds(bounds);
    log.info(
      `resizeActive id=${this.activeId.slice(-6)} bounds=${bounds.width}x${bounds.height} y=${bounds.y}`,
    );
  }

  private toSummary(tab: Tab): TabSummary {
    const summary: TabSummary = {
      tab_id: tab.tab_id,
      url: tab.url,
      title: tab.title,
      is_loading: tab.is_loading,
      can_go_back: tab.view.webContents.navigationHistory.canGoBack(),
      can_go_forward: tab.view.webContents.navigationHistory.canGoForward(),
    };
    if (tab.favicon_url) summary.favicon_url = tab.favicon_url;
    return summary;
  }

  private emit(channel: string, payload: unknown): void {
    if (this.destroyed || this.window.isDestroyed()) return;
    this.window.webContents.send(channel, payload);
  }

  private emitNavState(tab: Tab): void {
    this.emit(IPC.EVT_TAB_NAV_STATE, {
      tab_id: tab.tab_id,
      can_go_back: tab.view.webContents.navigationHistory.canGoBack(),
      can_go_forward: tab.view.webContents.navigationHistory.canGoForward(),
    });
  }

  private wireEvents(tab: Tab): void {
    const wc = tab.view.webContents;

    wc.on("page-title-updated", (_e, title) => {
      tab.title = title;
      this.emit(IPC.EVT_TAB_TITLE, { tab_id: tab.tab_id, title });
    });

    wc.on("page-favicon-updated", (_e, favicons) => {
      const first = favicons[0];
      if (first) {
        tab.favicon_url = first;
        this.emit(IPC.EVT_TAB_FAVICON, { tab_id: tab.tab_id, favicon_url: first });
      }
    });

    wc.on("did-start-loading", () => {
      tab.is_loading = true;
      this.emit(IPC.EVT_TAB_LOADING, { tab_id: tab.tab_id, is_loading: true });
    });

    wc.on("did-stop-loading", () => {
      tab.is_loading = false;
      this.emit(IPC.EVT_TAB_LOADING, { tab_id: tab.tab_id, is_loading: false });
      this.emitNavState(tab);
    });

    wc.on("did-navigate", (_e, url) => {
      tab.url = url;
      log.info(`did-navigate id=${tab.tab_id.slice(-6)} url=${url}`);
      this.emit(IPC.EVT_TAB_URL, { tab_id: tab.tab_id, url });
      this.emitNavState(tab);
    });

    wc.on("did-navigate-in-page", (_e, url) => {
      tab.url = url;
      this.emit(IPC.EVT_TAB_URL, { tab_id: tab.tab_id, url });
      this.emitNavState(tab);
    });

    // Surface main-frame navigation failures via the existing tab-crash
    // channel. -3 == ERR_ABORTED happens on user-initiated cancellations
    // (typing a new URL mid-load); ignore.
    wc.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      if (errorCode === -3) return;
      log.warn(
        `did-fail-load id=${tab.tab_id.slice(-6)} code=${errorCode} url=${validatedURL} desc=${errorDescription}`,
      );
      this.emit(IPC.EVT_TAB_CRASHED, {
        tab_id: tab.tab_id,
        reason: `${errorDescription} (${errorCode}) — ${validatedURL}`,
      });
    });

    wc.on("render-process-gone", (_e, details) => {
      log.error(`render-process-gone id=${tab.tab_id.slice(-6)} reason=${details.reason}`);
      this.emit(IPC.EVT_TAB_CRASHED, { tab_id: tab.tab_id, reason: details.reason });
    });

    // Debug-only: forward page console messages to main stdout so the user
    // can see what the page is doing without opening DevTools manually.
    if (process.env["TS_DEBUG"] === "1") {
      wc.on("console-message", (event) => {
        const msg = event.message?.slice(0, 200) ?? "";
        log.info(`[page id=${tab.tab_id.slice(-6)}] ${msg}`);
      });
    }

    wc.on("found-in-page", (_e, result) => {
      this.emit(IPC.EVT_TAB_FIND_RESULT, {
        tab_id: tab.tab_id,
        active: result.activeMatchOrdinal,
        matches: result.matches,
      });
    });

    // Open new tabs for links with target=_blank instead of letting Electron
    // create a separate native window.
    wc.setWindowOpenHandler(({ url }) => {
      this.openTab(url);
      return { action: "deny" };
    });

    // Right-click on selected page text → Fact Check / Defense / Attack menu.
    // Selected text rides into existing agentDefense/agentAttack via the
    // EVT_AGENT_FROM_SELECTION renderer event.
    wc.on("context-menu", (_e, params) => {
      const sel = params.selectionText?.trim();
      if (!sel) return;
      const pageUrl = wc.getURL();
      const kinds = [
        { kind: "fact-check" as const, label: "Fact Check", cap: 2000 },
        { kind: "defense" as const, label: "🛡 Defense", cap: 2000 },
        { kind: "attack" as const, label: "⚔ Attack", cap: 4000 },
      ];
      const menu = new Menu();
      for (const { kind, label, cap } of kinds) {
        menu.append(
          new MenuItem({
            label,
            click: () => {
              this.emit(IPC.EVT_AGENT_FROM_SELECTION, {
                kind,
                selected_text: sel.slice(0, cap),
                page_url: pageUrl,
              });
            },
          }),
        );
      }
      menu.popup({ window: this.window });
    });
  }
}
