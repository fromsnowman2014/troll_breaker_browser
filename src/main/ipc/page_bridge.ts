// Helper to invoke a page-preload responder and await its reply.
//
// Pattern: main does `wc.send(channel, replyChannel, payload?)`. The preload
// listens on `channel` and replies via `ipcRenderer.send(replyChannel, data)`.
// We register `ipcMain.once(replyChannel, ...)` here with a timeout.
//
// Used by handlers.page.ts (renderer can ask, via IPC, for the active tab's
// selection or focused-textarea state without crossing the page boundary
// directly).

import { ipcMain } from "electron";
import type { WebContents } from "electron";
import { randomUUID } from "node:crypto";

export interface InvokeOpts {
  timeoutMs?: number;
}

export async function invokePage<T>(
  wc: WebContents,
  channel: string,
  payload?: unknown,
  opts: InvokeOpts = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const replyChannel = `page:reply:${randomUUID()}`;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      ipcMain.removeAllListeners(replyChannel);
      reject(new Error("page_preload_unavailable"));
    }, timeoutMs);
    ipcMain.once(replyChannel, (_event, data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
    try {
      wc.send(channel, replyChannel, payload);
    } catch (err) {
      clearTimeout(timer);
      ipcMain.removeAllListeners(replyChannel);
      reject(err);
    }
  });
}
