import { z } from "zod";

export const AppErrorCodeSchema = z.enum([
  "no_api_key",
  "llm_unreachable",
  "search_unreachable",
  "schema_validation_failed",
  "timeout",
  "cancelled",
  "page_preload_unavailable",
  "textarea_token_stale",
  "input_too_long",
  "encryption_unavailable",
  "not_implemented",
  "tab_not_found",
  "invalid_url",
  "unknown",
]);

export const AppErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});

export type AppErrorCode = z.infer<typeof AppErrorCodeSchema>;
export type AppError = z.infer<typeof AppErrorSchema>;

export function makeError(code: AppErrorCode, message: string, details?: unknown): AppError {
  return details !== undefined ? { code, message, details } : { code, message };
}

export class IpcError extends Error {
  constructor(public readonly app: AppError) {
    super(app.message);
    this.name = "IpcError";
  }
}
