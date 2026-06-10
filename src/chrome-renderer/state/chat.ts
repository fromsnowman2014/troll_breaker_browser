// Chat / refinement state (Phase 2 + Phase 4 source pinning).

import { create } from "zustand";

type ChatState = {
  prior_request_id: string | null;
  revertStack: string[];
  // Phase 4: source pin/hide UX, scoped to current session.
  pinnedSourceUrls: Set<string>;
  hiddenSourceUrls: Set<string>;
  setPrior: (rid: string | null) => void;
  pushRevert: (text: string) => void;
  popRevert: () => string | null;
  pinSource: (url: string) => void;
  unpinSource: (url: string) => void;
  hideSource: (url: string) => void;
  unhideSource: (url: string) => void;
  clear: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  prior_request_id: null,
  revertStack: [],
  pinnedSourceUrls: new Set<string>(),
  hiddenSourceUrls: new Set<string>(),
  setPrior: (rid) =>
    set({
      prior_request_id: rid,
      revertStack: [],
      pinnedSourceUrls: new Set(),
      hiddenSourceUrls: new Set(),
    }),
  pushRevert: (text) =>
    set((s) => ({
      revertStack: [text, ...s.revertStack].slice(0, 5),
    })),
  popRevert: () => {
    const s = get();
    if (s.revertStack.length === 0) return null;
    const [top, ...rest] = s.revertStack;
    set({ revertStack: rest });
    return top ?? null;
  },
  pinSource: (url) =>
    set((s) => {
      const next = new Set(s.pinnedSourceUrls);
      next.add(url);
      return { pinnedSourceUrls: next };
    }),
  unpinSource: (url) =>
    set((s) => {
      const next = new Set(s.pinnedSourceUrls);
      next.delete(url);
      return { pinnedSourceUrls: next };
    }),
  hideSource: (url) =>
    set((s) => {
      const next = new Set(s.hiddenSourceUrls);
      next.add(url);
      return { hiddenSourceUrls: next };
    }),
  unhideSource: (url) =>
    set((s) => {
      const next = new Set(s.hiddenSourceUrls);
      next.delete(url);
      return { hiddenSourceUrls: next };
    }),
  clear: () =>
    set({
      prior_request_id: null,
      revertStack: [],
      pinnedSourceUrls: new Set(),
      hiddenSourceUrls: new Set(),
    }),
}));
