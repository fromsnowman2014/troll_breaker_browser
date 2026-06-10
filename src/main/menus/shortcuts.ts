// Centralized accelerator strings. The Menu accelerators (BROWSER_CORE §4 + §5)
// own all keyboard shortcuts; globalShortcut is deliberately NOT used because
// it would intercept even when the app is unfocused.

export const ACCEL = {
  NEW_TAB: "CmdOrCtrl+T",
  CLOSE_TAB: "CmdOrCtrl+W",
  REOPEN_TAB: "CmdOrCtrl+Shift+T",
  FOCUS_URL_BAR: "CmdOrCtrl+L",
  RELOAD: "CmdOrCtrl+R",
  HARD_RELOAD: "CmdOrCtrl+Shift+R",
  BACK: "CmdOrCtrl+[",
  FORWARD: "CmdOrCtrl+]",
  FIND: "CmdOrCtrl+F",
  TOGGLE_DRAWER: "CmdOrCtrl+,",
  ZOOM_IN: "CmdOrCtrl+=",
  ZOOM_OUT: "CmdOrCtrl+-",
  ZOOM_RESET: "CmdOrCtrl+0",
  NEXT_TAB: "Control+Tab",
  PREV_TAB: "Control+Shift+Tab",
  // Tools (disabled in Phase 0)
  DEFENSE: "CmdOrCtrl+Shift+D",
  ATTACK: "CmdOrCtrl+Shift+A",
} as const;
