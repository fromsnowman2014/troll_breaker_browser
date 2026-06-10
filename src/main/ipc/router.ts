// Flat dispatcher for ipcMain.handle. Every channel runs the registered zod
// schema before forwarding to the handler. Schema violations return AppError
// with code "schema_validation_failed" — they do NOT throw across the wire.

import { ipcMain } from "electron";
import type { ZodTypeAny } from "zod";
import { makeError } from "../shared/errors.js";
import type { AppError } from "../shared/errors.js";

type Handler<Req, Res> = (req: Req) => Promise<Res> | Res;

export type Reply<T> = { ok: true; data: T } | { ok: false; error: AppError };

const registered = new Set<string>();

export function register<Req, Res>(
  channel: string,
  schema: ZodTypeAny,
  handler: Handler<Req, Res>,
): void {
  if (registered.has(channel)) {
    throw new Error(`Channel "${channel}" registered twice`);
  }
  registered.add(channel);

  ipcMain.handle(channel, async (_event, raw: unknown): Promise<Reply<Res>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: makeError(
          "schema_validation_failed",
          `Invalid payload for ${channel}`,
          parsed.error.issues,
        ),
      };
    }
    try {
      const data = await handler(parsed.data as Req);
      return { ok: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: makeError("unknown", message) };
    }
  });
}

export function unregisterAll(): void {
  for (const channel of registered) ipcMain.removeHandler(channel);
  registered.clear();
}
