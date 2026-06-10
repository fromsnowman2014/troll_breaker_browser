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

import { BrowserWindow, WebContentsView } from "electron";
import { ulid } from "ulid";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Tab } from "./tab.js";
import { IPC } from "../shared/ipc-channels.js";
import type { TabSummary } from "../shared/schemas/ipc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_PRELOAD = join(__dirname, "../preload/page-preload.cjs");

export class TabManager {
  private readonly tabs = new Map<string, Tab>();
  private order: string[] = [];
  private activeId: string | null = null;
  private chromeTopInset = 92; // tabstrip 36 + navrow 56; updated by renderer
  private destroyed = false;

  constructor(private readonly window: BrowserWindow) {
    window.on("resize", () => this.resizeActive());
    window.on("close", () => {
      this.destroyed = true;
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
    this.window.contentView.addChildView(view);
    this.wireEvents(tab);
    void view.webContents.loadURL(initialUrl).catch(() => {
      // navigation errors surface via did-fail-load; ignore the promise rejection.
    });
    this.activate(id);
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
    void tab.view.webContents.loadURL(url).catch(() => undefined);
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
    const w = size[0] ?? 0;
    const h = size[1] ?? 0;
    const top = this.chromeTopInset;
    active.view.setBounds({
      x: 0,
      y: top,
      width: Math.max(0, w),
      height: Math.max(0, h - top),
    });
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
      this.emit(IPC.EVT_TAB_URL, { tab_id: tab.tab_id, url });
      this.emitNavState(tab);
    });

    wc.on("did-navigate-in-page", (_e, url) => {
      tab.url = url;
      this.emit(IPC.EVT_TAB_URL, { tab_id: tab.tab_id, url });
      this.emitNavState(tab);
    });

    wc.on("render-process-gone", (_e, details) => {
      this.emit(IPC.EVT_TAB_CRASHED, { tab_id: tab.tab_id, reason: details.reason });
    });

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
  }
}
