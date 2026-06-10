// Provider factory.

import { AnthropicClient } from "./anthropic.js";
import { OpenAIClient } from "./openai.js";
import { GeminiClient } from "./gemini.js";
import type { LlmClient } from "./types.js";

export type LlmProviderName = "anthropic" | "openai" | "google";

export function createLlmClient(
  provider: LlmProviderName,
  opts: { apiKey: string; defaultModel?: string },
): LlmClient {
  switch (provider) {
    case "anthropic":
      return new AnthropicClient(opts);
    case "openai":
      return new OpenAIClient(opts);
    case "google":
      return new GeminiClient(opts);
  }
}

export { structuredChat } from "./structured.js";
export type { LlmClient, LlmChatRequest, LlmChatResponse, LlmMessage, LlmToolDef, LlmToolCall } from "./types.js";
