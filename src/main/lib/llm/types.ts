// Provider-agnostic LLM client interface. Lifted from extension code map
// (../docs/CODE_MAP.md). Phase 1 fills in the bodies.

export interface LlmToolDef {
  name: string;
  description: string;
  input_schema: unknown; // JSON Schema-like; provider adapter translates
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
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}

export interface LlmChatResponse {
  content: string;
  tool_calls?: LlmToolCall[];
  usage?: { input_tokens: number; output_tokens: number };
}

export interface LlmClient {
  readonly provider: "anthropic" | "openai" | "google" | "mock";
  chat(req: LlmChatRequest): Promise<LlmChatResponse>;
}
