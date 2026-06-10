// SettingsView mirror. Hydrated on app mount via ipc.settingsGet().

import { create } from "zustand";
import type { SettingsView } from "../../main/shared/types.js";
import { defaultSettingsView } from "../../main/shared/schemas/settings.js";

type SettingsState = {
  view: SettingsView;
  hydrated: boolean;
  set: (view: SettingsView) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  view: defaultSettingsView(),
  hydrated: false,
  set: (view) => set({ view, hydrated: true }),
}));
