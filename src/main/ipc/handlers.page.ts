// Page bridge IPC — proxies between the chrome renderer and the page preload.
// The chrome renderer calls one of these channels; we forward to the focused
// tab's WebContentsView via the invokePage helper.

import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { invokePage } from "./page_bridge.js";
import { EmptyReqSchema, PageTextareaInsertReqSchema } from "../shared/schemas/ipc.js";
import { makeError, IpcError } from "../shared/errors.js";
import type { TabManager } from "../tabs/tab_manager.js";

type Sel = { text: string; url: string };
type Focused = { has_focus: boolean; token?: string; hint?: string };
type InsertResult = { ok: boolean; reason?: string };

function activeWebContents(getTm: () => TabManager | null): Electron.WebContents | null {
  const tm = getTm();
  if (!tm) return null;
  const id = tm.activeTabId();
  if (!id) return null;
  // Reach into the tab manager's tabs map via a public accessor we add below.
  const wc = tm.activeWebContents();
  return wc ?? null;
}

export function registerPageHandlers(getTm: () => TabManager | null): void {
  register<undefined, Sel | { has_focus: false }>(
    IPC.UI_PAGE_SELECTION,
    EmptyReqSchema.optional(),
    async () => {
      const wc = activeWebContents(getTm);
      if (!wc) throw new IpcError(makeError("page_preload_unavailable", "No active tab"));
      try {
        return await invokePage<Sel>(wc, IPC.PAGE_SELECTION_GET);
      } catch {
        throw new IpcError(
          makeError("page_preload_unavailable", "Page preload did not respond"),
        );
      }
    },
  );

  register<undefined, Focused>(
    IPC.UI_PAGE_TEXTAREA_FOCUSED,
    EmptyReqSchema.optional(),
    async () => {
      const wc = activeWebContents(getTm);
      if (!wc) return { has_focus: false };
      try {
        return await invokePage<Focused>(wc, IPC.PAGE_TEXTAREA_FOCUSED);
      } catch {
        return { has_focus: false };
      }
    },
  );

  register<{ token: string; text: string }, InsertResult>(
    IPC.UI_PAGE_TEXTAREA_INSERT,
    PageTextareaInsertReqSchema,
    async (req) => {
      const wc = activeWebContents(getTm);
      if (!wc) {
        return { ok: false, reason: "page_preload_unavailable" };
      }
      try {
        return await invokePage<InsertResult>(wc, IPC.PAGE_TEXTAREA_INSERT, req);
      } catch {
        return { ok: false, reason: "page_preload_unavailable" };
      }
    },
  );
}
