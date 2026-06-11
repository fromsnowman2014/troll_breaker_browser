// Auto-update via electron-updater.
// Skipped in dev mode. In packaged builds, checks for updates on app ready
// and emits evt:updater:status events the renderer can subscribe to.
//
// CJS interop note: electron-updater v6.x is a CommonJS-only module (no
// `exports` field, no `type:module`). Since main is bundled as ESM
// (package.json `"type": "module"`) and electron-updater is externalized
// at build time, we must use a default import + destructure pattern. Direct
// named imports (`import { autoUpdater } from "electron-updater"`) crash at
// runtime with "Named export 'autoUpdater' not found" — Node ESM cannot
// extract named exports from CJS modules without an `exports` map.
//
// If you add another CJS-only main-process dep, mirror this pattern.

import { app, BrowserWindow } from "electron";
import electronUpdaterPkg from "electron-updater";
import { IPC } from "../shared/ipc-channels.js";

const { autoUpdater } = electronUpdaterPkg;

export type UpdaterStatus =
  | { kind: "checking" }
  | { kind: "available"; version: string }
  | { kind: "not_available" }
  | { kind: "downloading"; percent: number }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

function broadcast(status: UpdaterStatus): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!win || win.isDestroyed()) return;
  try {
    win.webContents.send(IPC.EVT_UPDATER_STATUS, status);
  } catch {
    // window destroyed mid-broadcast
  }
}

let started = false;

export function initUpdater(): void {
  if (started) return;
  started = true;

  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => broadcast({ kind: "checking" }));
  autoUpdater.on("update-available", (info) =>
    broadcast({ kind: "available", version: info.version }),
  );
  autoUpdater.on("update-not-available", () => broadcast({ kind: "not_available" }));
  autoUpdater.on("download-progress", (p) =>
    broadcast({ kind: "downloading", percent: Math.round(p.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    broadcast({ kind: "ready", version: info.version }),
  );
  autoUpdater.on("error", (err) =>
    broadcast({ kind: "error", message: err instanceof Error ? err.message : String(err) }),
  );

  void autoUpdater.checkForUpdates().catch((err) => {
    broadcast({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  });
}

export function quitAndInstallUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
