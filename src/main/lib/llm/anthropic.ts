// STUB — Anthropic adapter. Implemented in Phase 1.

import type { LlmChatRequest, LlmChatResponse, LlmClient } from "./types.js";

export class AnthropicClient implements LlmClient {
  readonly provider = "anthropic" as const;

  constructor(_opts: { apiKey: string; defaultModel?: string }) {
    // No-op in Phase 0.
  }

  chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    throw new Error("AnthropicClient.chat — not implemented in Phase 0");
  }
}
