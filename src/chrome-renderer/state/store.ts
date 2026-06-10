import { create } from "zustand";
import type { TabSummary } from "../../main/shared/types.js";

type TabState = {
  tabs: TabSummary[];
  activeId: string | null;
  setTabs: (tabs: TabSummary[]) => void;
  patchTab: (id: string, patch: Partial<TabSummary>) => void;
  setActive: (id: string | null) => void;
  removeTab: (id: string) => void;
};

type UiState = {
  drawerOpen: boolean;
  findOpen: boolean;
  urlBarFocusToken: number; // increment to ask UrlBar to focus+selectAll
  setDrawerOpen: (v: boolean) => void;
  setFindOpen: (v: boolean) => void;
  bumpUrlBarFocus: () => void;
};

type FindState = {
  query: string;
  matches: number;
  active: number;
  setQuery: (q: string) => void;
  setResult: (active: number, matches: number) => void;
};

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  activeId: null,
  setTabs: (tabs) => set({ tabs }),
  patchTab: (id, patch) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.tab_id === id ? { ...t, ...patch } : t)) })),
  setActive: (id) => set({ activeId: id }),
  removeTab: (id) =>
    set((s) => ({
      tabs: s.tabs.filter((t) => t.tab_id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),
}));

export const useUiStore = create<UiState>((set) => ({
  drawerOpen: false,
  findOpen: false,
  urlBarFocusToken: 0,
  setDrawerOpen: (v) => set({ drawerOpen: v }),
  setFindOpen: (v) => set({ findOpen: v }),
  bumpUrlBarFocus: () => set((s) => ({ urlBarFocusToken: s.urlBarFocusToken + 1 })),
}));

export const useFindStore = create<FindState>((set) => ({
  query: "",
  matches: 0,
  active: 0,
  setQuery: (q) => set({ query: q }),
  setResult: (active, matches) => set({ active, matches }),
}));
