// Settings handlers — Phase 0 stubs.
//   - ui:settings:get returns the default SettingsView (no persistence yet).
//   - everything else throws "not_implemented".

import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { makeError, IpcError } from "../shared/errors.js";
import {
  EmptyReqSchema,
  SettingsClearBrowsingReqSchema,
  SettingsClearKeyReqSchema,
  SettingsPutKeyReqSchema,
  SettingsSchema,
} from "../shared/schemas/ipc.js";
import { defaultSettingsView } from "../shared/schemas/settings.js";
import type { SettingsView } from "../shared/schemas/settings.js";

function notImplemented(): never {
  throw new IpcError(makeError("not_implemented", "Settings mutations land in Phase 1"));
}

export function registerSettingsHandlers(): void {
  register<undefined, SettingsView>(IPC.UI_SETTINGS_GET, EmptyReqSchema.optional(), () =>
    defaultSettingsView(),
  );

  register(IPC.UI_SETTINGS_SET, SettingsSchema.partial(), () => notImplemented());
  register(IPC.UI_SETTINGS_PUT_KEY, SettingsPutKeyReqSchema, () => notImplemented());
  register(IPC.UI_SETTINGS_CLEAR_KEY, SettingsClearKeyReqSchema, () => notImplemented());
  register(IPC.UI_SETTINGS_TEST_LLM, EmptyReqSchema.optional(), () => notImplemented());
  register(IPC.UI_SETTINGS_RESET_ALL, EmptyReqSchema.optional(), () => notImplemented());
  register(IPC.UI_SETTINGS_CLEAR_BROWSING_DATA, SettingsClearBrowsingReqSchema, () =>
    notImplemented(),
  );
}
