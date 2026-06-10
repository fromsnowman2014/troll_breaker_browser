// Typed wrapper over window.truthAndStrike. Every channel goes through
// `invoke` and returns the router's Reply envelope; we unwrap into either
// the data or a thrown IpcError-like object.

import { IPC } from "../main/shared/ipc-channels.js";
import type { AppError } from "../main/shared/errors.js";
import type {
  Settings,
  SettingsView,
  TabSummary,
} from "../main/shared/types.js";

type Reply<T> = { ok: true; data: T } | { ok: false; error: AppError };

interface Bridge {
  invoke<T>(channel: string, payload?: unknown): Promise<Reply<T>>;
  on(channel: string, handler: (payload: unknown) => void): () => void;
}

declare global {
  interface Window {
    truthAndStrike: Bridge;
  }
}

async function call<T>(channel: string, payload?: unknown): Promise<T> {
  const reply = await window.truthAndStrike.invoke<T>(channel, payload);
  if (!reply.ok) {
    const err = new Error(reply.error.message) as Error & { code?: string };
    err.code = reply.error.code;
    throw err;
  }
  return reply.data;
}

export const ipc = {
  ping: () => call<string>(IPC.UI_PING),

  // Tabs
  tabOpen: (url?: string) => call<{ tab_id: string }>(IPC.UI_TAB_OPEN, { url }),
  tabClose: (tab_id: string) => call<{ ok: true }>(IPC.UI_TAB_CLOSE, { tab_id }),
  tabSwitch: (tab_id: string) => call<{ ok: true }>(IPC.UI_TAB_SWITCH, { tab_id }),
  tabNavigate: (tab_id: string, url: string) =>
    call<{ ok: true }>(IPC.UI_TAB_NAVIGATE, { tab_id, url }),
  tabReload: (tab_id: string, hard = false) =>
    call<{ ok: true }>(IPC.UI_TAB_RELOAD, { tab_id, hard }),
  tabBack: (tab_id: string) => call<{ ok: true }>(IPC.UI_TAB_BACK, { tab_id }),
  tabForward: (tab_id: string) => call<{ ok: true }>(IPC.UI_TAB_FORWARD, { tab_id }),
  tabList: () => call<TabSummary[]>(IPC.UI_TAB_LIST),
  tabFindStart: (tab_id: string, text: string) =>
    call<{ ok: true }>(IPC.UI_TAB_FIND_START, { tab_id, text }),
  tabFindNext: (tab_id: string, forward: boolean) =>
    call<{ ok: true }>(IPC.UI_TAB_FIND_NEXT, { tab_id, forward }),
  tabFindStop: (tab_id: string) => call<{ ok: true }>(IPC.UI_TAB_FIND_STOP, { tab_id }),
  tabChromeBounds: (top: number) => call<{ ok: true }>(IPC.UI_TAB_CHROME_BOUNDS, { top }),

  // Drawer
  drawerOpen: () => call<{ ok: true }>(IPC.UI_DRAWER_OPEN),
  drawerClose: () => call<{ ok: true }>(IPC.UI_DRAWER_CLOSE),

  // Settings (Phase 0 only `get`)
  settingsGet: () => call<SettingsView>(IPC.UI_SETTINGS_GET),
  settingsSet: (partial: Partial<Settings>) =>
    call<SettingsView>(IPC.UI_SETTINGS_SET, partial),

  // Event subscriptions
  on: (channel: string, handler: (payload: unknown) => void) =>
    window.truthAndStrike.on(channel, handler),
};

export { IPC };
