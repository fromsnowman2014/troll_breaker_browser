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

export type AgentMode = "defense" | "attack" | "fact-check";

type UiState = {
  drawerOpen: boolean;
  findOpen: boolean;
  urlBarFocusToken: number; // increment to ask UrlBar to focus+selectAll
  sidebarCollapsed: boolean;
  chatInputFocusToken: number;
  pendingAgentMode: AgentMode | null;
  setDrawerOpen: (v: boolean) => void;
  setFindOpen: (v: boolean) => void;
  bumpUrlBarFocus: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  bumpChatInputFocus: () => void;
  setPendingAgentMode: (m: AgentMode | null) => void;
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
  sidebarCollapsed: true,
  chatInputFocusToken: 0,
  pendingAgentMode: null,
  setDrawerOpen: (v) => set({ drawerOpen: v }),
  setFindOpen: (v) => set({ findOpen: v }),
  bumpUrlBarFocus: () => set((s) => ({ urlBarFocusToken: s.urlBarFocusToken + 1 })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  bumpChatInputFocus: () =>
    set((s) => ({ chatInputFocusToken: s.chatInputFocusToken + 1 })),
  setPendingAgentMode: (m) => set({ pendingAgentMode: m }),
}));

export const useFindStore = create<FindState>((set) => ({
  query: "",
  matches: 0,
  active: 0,
  setQuery: (q) => set({ query: q }),
  setResult: (active, matches) => set({ active, matches }),
}));
