// Subscribe to evt:tab:* events and mirror into the zustand tab store.

import { ipc, IPC } from "../ipc.js";
import { useTabStore } from "./store.js";

type TabTitleEvt = { tab_id: string; title: string };
type TabUrlEvt = { tab_id: string; url: string };
type TabLoadingEvt = { tab_id: string; is_loading: boolean };
type TabFaviconEvt = { tab_id: string; favicon_url: string };
type TabFocusEvt = { tab_id: string };
type TabClosedEvt = { tab_id: string };
type TabNavStateEvt = { tab_id: string; can_go_back: boolean; can_go_forward: boolean };

export function wireTabEvents(): () => void {
  const off: (() => void)[] = [];

  off.push(
    ipc.on(IPC.EVT_TAB_TITLE, (raw) => {
      const e = raw as TabTitleEvt;
      useTabStore.getState().patchTab(e.tab_id, { title: e.title });
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_URL, (raw) => {
      const e = raw as TabUrlEvt;
      useTabStore.getState().patchTab(e.tab_id, { url: e.url });
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_LOADING, (raw) => {
      const e = raw as TabLoadingEvt;
      useTabStore.getState().patchTab(e.tab_id, { is_loading: e.is_loading });
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_FAVICON, (raw) => {
      const e = raw as TabFaviconEvt;
      useTabStore.getState().patchTab(e.tab_id, { favicon_url: e.favicon_url });
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_FOCUS_CHANGED, (raw) => {
      const e = raw as TabFocusEvt;
      useTabStore.getState().setActive(e.tab_id);
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_CLOSED, (raw) => {
      const e = raw as TabClosedEvt;
      useTabStore.getState().removeTab(e.tab_id);
    }),
  );

  off.push(
    ipc.on(IPC.EVT_TAB_NAV_STATE, (raw) => {
      const e = raw as TabNavStateEvt;
      useTabStore
        .getState()
        .patchTab(e.tab_id, { can_go_back: e.can_go_back, can_go_forward: e.can_go_forward });
    }),
  );

  return () => off.forEach((f) => f());
}

export async function refreshTabList(): Promise<void> {
  const list = await ipc.tabList();
  useTabStore.getState().setTabs(list);
}
