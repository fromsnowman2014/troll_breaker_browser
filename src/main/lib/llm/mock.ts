// LIVE — used by Vitest. Returns canned responses without network.

import type { LlmChatRequest, LlmChatResponse, LlmClient } from "./types.js";

export class MockLlmClient implements LlmClient {
  readonly provider = "mock" as const;

  constructor(private readonly canned: LlmChatResponse = { content: "ok" }) {}

  async chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    return this.canned;
  }
}
