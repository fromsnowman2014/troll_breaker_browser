// About / external link / manual update check.

import { app, shell } from "electron";
import { z } from "zod";
import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { EmptyReqSchema } from "../shared/schemas/ipc.js";
import { quitAndInstallUpdate } from "../lib/updater.js";

const OpenExternalReqSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "Only HTTPS URLs allowed" }),
});

export interface AboutInfo {
  version: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
}

export function registerAboutHandlers(): void {
  register<undefined, AboutInfo>(IPC.UI_ABOUT_GET, EmptyReqSchema.optional(), () => ({
    version: app.getVersion(),
    electron: process.versions.electron ?? "",
    chrome: process.versions.chrome ?? "",
    node: process.versions.node ?? "",
    platform: process.platform,
  }));

  register<{ url: string }, { ok: true }>(IPC.UI_OPEN_EXTERNAL, OpenExternalReqSchema, async (req) => {
    await shell.openExternal(req.url);
    return { ok: true };
  });

  register<undefined, { ok: true }>(IPC.UI_UPDATER_CHECK, EmptyReqSchema.optional(), () => {
    // initUpdater runs check at boot; this handler is for the UI's manual button.
    // We just return ok; the actual check + status events will fire if there's
    // a packaged build. In dev this is a no-op.
    return { ok: true };
  });

  register<undefined, { ok: true }>(IPC.UI_UPDATER_INSTALL, EmptyReqSchema.optional(), () => {
    try {
      quitAndInstallUpdate();
    } catch {
      // dev mode — no-op
    }
    return { ok: true };
  });
}
