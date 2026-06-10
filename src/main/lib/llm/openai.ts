// STUB — OpenAI adapter. Implemented in Phase 1.

import type { LlmChatRequest, LlmChatResponse, LlmClient } from "./types.js";

export class OpenAIClient implements LlmClient {
  readonly provider = "openai" as const;

  constructor(_opts: { apiKey: string; defaultModel?: string }) {
    // No-op in Phase 0.
  }

  chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    throw new Error("OpenAIClient.chat — not implemented in Phase 0");
  }
}
