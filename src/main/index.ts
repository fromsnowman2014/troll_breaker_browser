// Electron main entry. Order:
//   1. app.whenReady → register all IPC handlers BEFORE creating the window
//      (renderer might invoke ui:settings:get during first paint).
//   2. createMainWindow + TabManager bound to it.
//   3. Restore session.json if present; else open one about:blank tab.
//   4. Save session.json on before-quit.

import { app, BrowserWindow, ipcMain } from "electron";
import { createMainWindow } from "./window.js";
import { TabManager } from "./tabs/tab_manager.js";
import { loadSession, saveSession } from "./tabs/session.js";
import { register, unregisterAll } from "./ipc/router.js";
import { registerTabHandlers } from "./ipc/handlers.tab.js";
import { registerDrawerHandlers } from "./ipc/handlers.drawer.js";
import { registerSettingsHandlers } from "./ipc/handlers.settings.js";
import { registerAgentHandlers } from "./ipc/handlers.agent.js";
import { registerPageHandlers } from "./ipc/handlers.page.js";
import { registerAboutHandlers } from "./ipc/handlers.about.js";
import { installAppMenu } from "./menus/app_menu.js";
import { IPC } from "./shared/ipc-channels.js";
import { EmptyReqSchema } from "./shared/schemas/ipc.js";
import { registerVibeRefresh } from "./agents/vibe.js";
import { refreshIfStale } from "./agents/vibe_refresh.js";
import { initUpdater } from "./lib/updater.js";

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;

function registerCoreHandlers(): void {
  // Smoke channel — verifies the IPC pipeline end-to-end.
  register(IPC.UI_PING, EmptyReqSchema.optional(), () => "pong" as const);

  // Wire vibe refresh so the orchestrator can fire it without a static import.
  registerVibeRefresh((opts) => refreshIfStale(opts));

  registerTabHandlers(() => tabManager);
  registerDrawerHandlers();
  registerSettingsHandlers();
  registerAgentHandlers();
  registerPageHandlers(() => tabManager);
  registerAboutHandlers();
}

async function bootstrap(): Promise<void> {
  registerCoreHandlers();
  installAppMenu();

  mainWindow = createMainWindow();
  tabManager = new TabManager(mainWindow);

  const userDataDir = app.getPath("userData");
  const restored = await loadSession(userDataDir);
  if (restored && restored.tabs.length > 0) {
    for (const t of restored.tabs) tabManager.openTab(t.url);
    const safeIdx = Math.min(restored.active_index, restored.tabs.length - 1);
    const ids = tabManager.list().map((s) => s.tab_id);
    const targetId = ids[safeIdx];
    if (targetId) tabManager.switchTab(targetId);
  } else {
    tabManager.openTab("about:blank");
  }

  initUpdater();

  mainWindow.on("closed", () => {
    mainWindow = null;
    tabManager = null;
  });
}

void app.whenReady().then(() => {
  void bootstrap();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void bootstrap();
  });
});

// Save session before quit. Use 'before-quit' instead of 'will-quit' so the
// window still exists when we snapshot it.
let didSave = false;
app.on("before-quit", async (event) => {
  if (didSave || !tabManager) return;
  event.preventDefault();
  didSave = true;
  try {
    const snap = tabManager.snapshot();
    const userDataDir = app.getPath("userData");
    if (snap.tabs.length > 0) await saveSession(userDataDir, snap);
  } catch (err) {
    console.error("[Truth & Strike] failed to save session:", err);
  }
  unregisterAll();
  // Drain any pending invocations so the renderer doesn't hang.
  ipcMain.removeAllListeners();
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
