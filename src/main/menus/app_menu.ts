// Application menu (macOS menubar + Windows menu). Every interactive item
// dispatches an EVT_MENU event to the renderer; the renderer routes to the
// right action (new tab, focus url bar, etc.).
//
// Defense / Attack are visible but disabled in Phase 0.

import { app, BrowserWindow, Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { ACCEL } from "./shortcuts.js";
import { IPC } from "../shared/ipc-channels.js";

function send(action: string, index?: number) {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!win) return;
  const payload = index !== undefined ? { action, index } : { action };
  win.webContents.send(IPC.EVT_MENU, payload);
}

export function installAppMenu(): void {
  const isMac = process.platform === "darwin";

  const tabSwitchItems: MenuItemConstructorOptions[] = [];
  for (let i = 1; i <= 9; i++) {
    tabSwitchItems.push({
      label: `Switch to Tab ${i}`,
      accelerator: `CmdOrCtrl+${i}`,
      click: () => send("switch_tab", i - 1),
      visible: false, // accelerator-only; clutter otherwise
    });
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: ACCEL.TOGGLE_DRAWER,
                click: () => send("toggle_drawer"),
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Tab", accelerator: ACCEL.NEW_TAB, click: () => send("new_tab") },
        { label: "Close Tab", accelerator: ACCEL.CLOSE_TAB, click: () => send("close_tab") },
        {
          label: "Reopen Closed Tab",
          accelerator: ACCEL.REOPEN_TAB,
          click: () => send("reopen_tab"),
        },
        { type: "separator" },
        ...(!isMac
          ? [
              {
                label: "Settings",
                accelerator: ACCEL.TOGGLE_DRAWER,
                click: () => send("toggle_drawer"),
              } satisfies MenuItemConstructorOptions,
              { role: "quit" as const, label: "Quit" } satisfies MenuItemConstructorOptions,
            ]
          : []),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Focus URL Bar",
          accelerator: ACCEL.FOCUS_URL_BAR,
          click: () => send("focus_url_bar"),
        },
        { label: "Find in Page…", accelerator: ACCEL.FIND, click: () => send("find") },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: ACCEL.RELOAD, click: () => send("reload") },
        {
          label: "Hard Reload",
          accelerator: ACCEL.HARD_RELOAD,
          click: () => send("hard_reload"),
        },
        { type: "separator" },
        { role: "zoomIn", accelerator: ACCEL.ZOOM_IN },
        { role: "zoomOut", accelerator: ACCEL.ZOOM_OUT },
        { role: "resetZoom", label: "Actual Size", accelerator: ACCEL.ZOOM_RESET },
        { type: "separator" },
        { label: "Back", accelerator: ACCEL.BACK, click: () => send("back") },
        { label: "Forward", accelerator: ACCEL.FORWARD, click: () => send("forward") },
        { type: "separator" },
        { label: "Next Tab", accelerator: ACCEL.NEXT_TAB, click: () => send("next_tab") },
        { label: "Previous Tab", accelerator: ACCEL.PREV_TAB, click: () => send("prev_tab") },
        ...tabSwitchItems,
      ],
    },
    {
      label: "Tools",
      submenu: [
        {
          label: "Defense (Phase 1)",
          accelerator: ACCEL.DEFENSE,
          enabled: false,
          click: () => send("defense"),
        },
        {
          label: "Attack (Phase 1)",
          accelerator: ACCEL.ATTACK,
          enabled: false,
          click: () => send("attack"),
        },
      ],
    },
    ...(isMac
      ? [
          {
            label: "Window",
            submenu: [
              { role: "minimize" as const },
              { role: "zoom" as const },
              { role: "front" as const },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            // No-op in Phase 0; future: open external URL.
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
