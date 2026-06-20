// createMainWindow — the one BrowserWindow that hosts the chrome.
// WebContentsViews for each tab are added on top of its contentView and
// positioned below the React-rendered chrome via TabManager bounds.

import { BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CHROME_PRELOAD = join(__dirname, "../preload/chrome-preload.cjs");

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Truth & Strike",
    backgroundColor: "#0f0f12",
    show: false, // wait for ready-to-show to avoid blank-flash + 0-size races
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: CHROME_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false — chrome preload needs ipcRenderer.
      // Security asymmetry vs page renderers is intentional;
      // see ARCHITECTURE.md §4 + tab_manager.ts.
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}
