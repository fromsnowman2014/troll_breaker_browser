// Listens to evt:menu broadcasts from main and translates them into UI store
// actions. Most accelerators are owned by the Electron Menu (in main); the
// renderer's job is just to react.
//
// The renderer ALSO handles a few in-renderer key events that the menu doesn't
// cover (e.g., Esc to dismiss the drawer).

import { useEffect } from "react";
import { ipc, IPC } from "../ipc.js";
import { useTabStore, useUiStore, useFindStore } from "../state/store.js";

type MenuEvt = { action: string; index?: number };

export function useMenuRouting(): void {
  useEffect(() => {
    const off = ipc.on(IPC.EVT_MENU, (raw) => {
      const e = raw as MenuEvt;
      void route(e);
    });
    return off;
  }, []);
}

async function route(e: MenuEvt): Promise<void> {
  const tabState = useTabStore.getState();
  const uiState = useUiStore.getState();
  const findState = useFindStore.getState();
  const activeId = tabState.activeId;

  switch (e.action) {
    case "new_tab": {
      const { tab_id } = await ipc.tabOpen("about:blank");
      const list = await ipc.tabList();
      useTabStore.setState({ tabs: list, activeId: tab_id });
      return;
    }
    case "close_tab": {
      if (activeId) {
        await ipc.tabClose(activeId);
        const list = await ipc.tabList();
        const next = list[list.length - 1]?.tab_id ?? null;
        useTabStore.setState({ tabs: list, activeId: next });
      }
      return;
    }
    case "focus_url_bar":
      uiState.bumpUrlBarFocus();
      return;
    case "reload":
      if (activeId) await ipc.tabReload(activeId, false);
      return;
    case "hard_reload":
      if (activeId) await ipc.tabReload(activeId, true);
      return;
    case "back":
      if (activeId) await ipc.tabBack(activeId);
      return;
    case "forward":
      if (activeId) await ipc.tabForward(activeId);
      return;
    case "find":
      uiState.setFindOpen(true);
      return;
    case "toggle_drawer":
      uiState.setDrawerOpen(!uiState.drawerOpen);
      return;
    case "next_tab": {
      const idx = tabState.tabs.findIndex((t) => t.tab_id === activeId);
      const next = tabState.tabs[(idx + 1) % tabState.tabs.length];
      if (next) await ipc.tabSwitch(next.tab_id);
      return;
    }
    case "prev_tab": {
      const idx = tabState.tabs.findIndex((t) => t.tab_id === activeId);
      const prev = tabState.tabs[(idx - 1 + tabState.tabs.length) % tabState.tabs.length];
      if (prev) await ipc.tabSwitch(prev.tab_id);
      return;
    }
    case "switch_tab": {
      if (typeof e.index === "number") {
        const target = tabState.tabs[e.index];
        if (target) await ipc.tabSwitch(target.tab_id);
      }
      return;
    }
    case "defense":
    case "attack":
      // Phase 1.
      return;
    case "reopen_tab":
      // Phase 1 — keep last-closed stack.
      return;
    default:
      // Touch unused variable so linter is quiet — find state not used yet,
      // wired here for forward compat.
      void findState;
      return;
  }
}

export function useEscapeRouting(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const ui = useUiStore.getState();
      const find = useFindStore.getState();
      const tab = useTabStore.getState();
      if (find.matches > 0 || useUiStore.getState().findOpen) {
        ui.setFindOpen(false);
        find.setResult(0, 0);
        find.setQuery("");
        if (tab.activeId) void ipc.tabFindStop(tab.activeId);
      } else if (ui.drawerOpen) {
        ui.setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
