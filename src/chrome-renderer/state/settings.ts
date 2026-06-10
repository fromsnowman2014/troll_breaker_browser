// SettingsView mirror — Phase 0 reads defaults from main once on mount.
// Phase 1 wires put_key / set / test_llm mutations.

import { create } from "zustand";
import type { SettingsView } from "../../main/shared/types.js";
import { defaultSettingsView } from "../../main/shared/schemas/settings.js";

type SettingsState = {
  view: SettingsView;
  set: (view: SettingsView) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  view: defaultSettingsView(),
  set: (view) => set({ view }),
}));
