// STUB — Google Gemini adapter. Implemented in Phase 1.

import type { LlmChatRequest, LlmChatResponse, LlmClient } from "./types.js";

export class GeminiClient implements LlmClient {
  readonly provider = "google" as const;

  constructor(_opts: { apiKey: string; defaultModel?: string }) {
    // No-op in Phase 0.
  }

  chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    throw new Error("GeminiClient.chat — not implemented in Phase 0");
  }
}
