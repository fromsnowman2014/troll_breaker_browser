// STUB — structured-output helper (zod schema + one retry on validation error).
// Implemented in Phase 1 once we have real adapters to test against.

import type { ZodTypeAny } from "zod";
import type { LlmChatRequest, LlmClient } from "./types.js";

export async function structuredChat<T>(
  _llm: LlmClient,
  _schema: ZodTypeAny,
  _req: LlmChatRequest,
): Promise<T> {
  throw new Error("structuredChat — not implemented in Phase 0");
}
