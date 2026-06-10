// Anthropic Messages API adapter. Uses fetch directly (no SDK).
// API: https://docs.anthropic.com/en/api/messages
//
// Tool-use shape:
//   request.tools = [{ name, description, input_schema }]
//   response content blocks: [{type: "text", text}, {type: "tool_use", id, name, input}]

import type { LlmChatRequest, LlmChatResponse, LlmClient, LlmMessage } from "./types.js";
import { makeError, IpcError } from "../../shared/errors.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 4096;

interface AnthropicTextBlock {
  type: "text";
  text: string;
}
interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
}

interface AnthropicErrorBody {
  type: "error";
  error: { type: string; message: string };
}

interface AnthropicReqMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "tool_result"; tool_use_id: string; content: string }
        | { type: "tool_use"; id: string; name: string; input: unknown }
      >;
}

function toAnthropicMessages(messages: LlmMessage[]): {
  system: string | undefined;
  msgs: AnthropicReqMessage[];
} {
  let system: string | undefined;
  const systemParts: string[] = [];
  const msgs: AnthropicReqMessage[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    if (m.role === "user") {
      msgs.push({ role: "user", content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const blocks: AnthropicReqMessage["content"] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      if (m.tool_calls) {
        for (const c of m.tool_calls) {
          blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.input });
        }
      }
      msgs.push({ role: "assistant", content: blocks });
      continue;
    }
    // tool role
    msgs.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: m.tool_call_id, content: m.content },
      ],
    });
  }

  if (systemParts.length > 0) system = systemParts.join("\n\n");
  return { system, msgs };
}

export interface AnthropicOpts {
  apiKey: string;
  defaultModel?: string;
  /** Override for testing. */
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

export class AnthropicClient implements LlmClient {
  readonly provider = "anthropic" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(opts: AnthropicOpts) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.endpoint = opts.endpoint ?? ENDPOINT;
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!this.apiKey) {
      throw new IpcError(makeError("no_api_key", "Anthropic API key missing"));
    }
    const { system, msgs } = toAnthropicMessages(req.messages);
    const body: Record<string, unknown> = {
      model: req.model,
      max_tokens: req.max_tokens ?? DEFAULT_MAX_TOKENS,
      messages: msgs,
    };
    if (system !== undefined) body["system"] = system;
    if (req.temperature !== undefined) body["temperature"] = req.temperature;
    if (req.tools && req.tools.length > 0) {
      body["tools"] = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));
    }
    if (req.tool_choice) {
      body["tool_choice"] = { type: "tool", name: req.tool_choice.name };
    }

    let resp: Response;
    try {
      resp = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new IpcError(makeError("cancelled", "Request cancelled"));
      }
      throw new IpcError(
        makeError("llm_unreachable", `Network error: ${(err as Error).message}`),
      );
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      let parsed: AnthropicErrorBody | null = null;
      try {
        parsed = JSON.parse(text) as AnthropicErrorBody;
      } catch {
        // not JSON
      }
      const msg = parsed?.error?.message ?? text ?? `HTTP ${resp.status}`;
      if (resp.status === 401 || resp.status === 403) {
        throw new IpcError(makeError("no_api_key", "API key rejected"));
      }
      if (resp.status === 408 || resp.status === 504) {
        throw new IpcError(makeError("timeout", msg));
      }
      throw new IpcError(makeError("llm_unreachable", msg));
    }

    let json: AnthropicResponse;
    try {
      json = (await resp.json()) as AnthropicResponse;
    } catch (err) {
      throw new IpcError(
        makeError("schema_validation_failed", `Bad JSON: ${(err as Error).message}`),
      );
    }

    let content = "";
    const tool_calls: LlmChatResponse["tool_calls"] = [];
    for (const block of json.content) {
      if (block.type === "text") content += block.text;
      else if (block.type === "tool_use") {
        tool_calls.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    const out: LlmChatResponse = { content };
    if (tool_calls.length > 0) out.tool_calls = tool_calls;
    if (json.stop_reason) out.stop_reason = json.stop_reason;
    if (json.usage) out.usage = json.usage;
    return out;
  }
}
