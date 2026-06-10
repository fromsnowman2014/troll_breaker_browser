// Provider-agnostic LLM client interface. Lifted from extension code map
// (../docs/CODE_MAP.md). Bodies in anthropic.ts/openai.ts/gemini.ts.

export interface LlmToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>; // JSON Schema; provider adapter translates as-needed
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: unknown;
}

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: LlmToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface LlmChatRequest {
  model: string;
  messages: LlmMessage[];
  tools?: LlmToolDef[];
  /**
   * Force the model to call exactly one tool. The named tool must be in `tools`.
   * Used by structuredChat to enforce structured output.
   */
  tool_choice?: { type: "tool"; name: string };
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}

export interface LlmChatResponse {
  content: string;
  tool_calls?: LlmToolCall[];
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface LlmClient {
  readonly provider: "anthropic" | "openai" | "google" | "mock";
  chat(req: LlmChatRequest): Promise<LlmChatResponse>;
}
