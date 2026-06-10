// Single source of truth for IPC channel names. No magic strings anywhere else.
// Renderer → main: "ui:*" prefix. Main → renderer events: "evt:*" prefix.
// Page preload bridge: "page:*" prefix.

export const IPC = {
  // Smoke / diagnostics
  UI_PING: "ui:ping",

  // Tabs (renderer → main)
  UI_TAB_OPEN: "ui:tab:open",
  UI_TAB_CLOSE: "ui:tab:close",
  UI_TAB_SWITCH: "ui:tab:switch",
  UI_TAB_NAVIGATE: "ui:tab:navigate",
  UI_TAB_RELOAD: "ui:tab:reload",
  UI_TAB_BACK: "ui:tab:back",
  UI_TAB_FORWARD: "ui:tab:forward",
  UI_TAB_LIST: "ui:tab:list",
  UI_TAB_FIND_START: "ui:tab:find:start",
  UI_TAB_FIND_NEXT: "ui:tab:find:next",
  UI_TAB_FIND_STOP: "ui:tab:find:stop",
  UI_TAB_CHROME_BOUNDS: "ui:tab:chrome_bounds",

  // Drawer (renderer → main; mostly informational, state lives in renderer)
  UI_DRAWER_OPEN: "ui:drawer:open",
  UI_DRAWER_CLOSE: "ui:drawer:close",

  // Settings (stub in Phase 0)
  UI_SETTINGS_GET: "ui:settings:get",
  UI_SETTINGS_SET: "ui:settings:set",
  UI_SETTINGS_PUT_KEY: "ui:settings:put_key",
  UI_SETTINGS_CLEAR_KEY: "ui:settings:clear_key",
  UI_SETTINGS_TEST_LLM: "ui:settings:test_llm",
  UI_SETTINGS_RESET_ALL: "ui:settings:reset_all",
  UI_SETTINGS_CLEAR_BROWSING_DATA: "ui:settings:clear_browsing_data",

  // Agents (stub in Phase 0)
  UI_AGENT_DEFENSE: "ui:agent:defense",
  UI_AGENT_ATTACK: "ui:agent:attack",
  UI_AGENT_REFINE: "ui:agent:refine",
  UI_AGENT_CANCEL: "ui:agent:cancel",

  // Agent events (main → renderer)
  EVT_AGENT_PROGRESS: "evt:agent:progress",
  EVT_AGENT_RESULT: "evt:agent:result",
  EVT_AGENT_ERROR: "evt:agent:error",

  // Updater events (Phase 5)
  EVT_UPDATER_STATUS: "evt:updater:status",

  // Tab events (main → renderer)
  EVT_TAB_TITLE: "evt:tab:title",
  EVT_TAB_URL: "evt:tab:url",
  EVT_TAB_LOADING: "evt:tab:loading",
  EVT_TAB_FAVICON: "evt:tab:favicon",
  EVT_TAB_FOCUS_CHANGED: "evt:tab:focus_changed",
  EVT_TAB_CRASHED: "evt:tab:crashed",
  EVT_TAB_CLOSED: "evt:tab:closed",
  EVT_TAB_FIND_RESULT: "evt:tab:find_result",
  EVT_TAB_NAV_STATE: "evt:tab:nav_state",

  // Menu events (main → renderer)
  EVT_MENU: "evt:menu",

  // Page preload bridge (main ↔ preload)
  PAGE_SELECTION_GET: "page:selection:get",
  PAGE_TEXTAREA_FOCUSED: "page:textarea:focused",
  PAGE_TEXTAREA_INSERT: "page:textarea:insert",

  // Renderer → main proxies to the active tab's preload
  UI_PAGE_SELECTION: "ui:page:selection",
  UI_PAGE_TEXTAREA_FOCUSED: "ui:page:textarea_focused",
  UI_PAGE_TEXTAREA_INSERT: "ui:page:textarea_insert",

  // About / Privacy / Updater (Phase 5)
  UI_ABOUT_GET: "ui:about:get",
  UI_OPEN_EXTERNAL: "ui:open:external",
  UI_UPDATER_CHECK: "ui:updater:check",
  UI_UPDATER_INSTALL: "ui:updater:install",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
