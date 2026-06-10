// Drawer open/close — the actual state lives in the renderer (zustand);
// these handlers exist so the app menu (Cmd+,) can broadcast intent to
// the renderer. The ack reply is enough; nothing else happens in main.

import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { EmptyReqSchema } from "../shared/schemas/ipc.js";

export function registerDrawerHandlers(): void {
  register<undefined, { ok: true }>(IPC.UI_DRAWER_OPEN, EmptyReqSchema.optional(), () => ({ ok: true }));
  register<undefined, { ok: true }>(IPC.UI_DRAWER_CLOSE, EmptyReqSchema.optional(), () => ({ ok: true }));
}
