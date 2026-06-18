// OpenAI Chat Completions adapter. fetch-based, no SDK.
// API: https://platform.openai.com/docs/api-reference/chat
// Tool-use: response.choices[0].message.tool_calls[] (function-calling format).

import type { LlmChatRequest, LlmChatResponse, LlmClient, LlmMessage } from "./types.js";
import { makeError, IpcError } from "../../shared/errors.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function toOpenAIMessages(messages: LlmMessage[]): OpenAIMessage[] {
  return messages.map((m): OpenAIMessage => {
    if (m.role === "system") return { role: "system", content: m.content };
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant") {
      const out: OpenAIMessage = { role: "assistant", content: m.content || null };
      if (m.tool_calls) {
        out.tool_calls = m.tool_calls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.input) },
        }));
      }
      return out;
    }
    return {
      role: "tool",
      tool_call_id: m.tool_call_id,
      content: m.content,
    };
  });
}

export interface OpenAIOpts {
  apiKey: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

export class OpenAIClient implements LlmClient {
  readonly provider = "openai" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(opts: OpenAIOpts) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.endpoint = opts.endpoint ?? ENDPOINT;
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: toOpenAIMessages(req.messages),
    };
    if (req.temperature !== undefined) body["temperature"] = req.temperature;
    if (req.max_tokens !== undefined) body["max_tokens"] = req.max_tokens;
    if (req.tools && req.tools.length > 0) {
      body["tools"] = req.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }
    if (req.tool_choice) {
      body["tool_choice"] = {
        type: "function",
        function: { name: req.tool_choice.name },
      };
    }

    let resp: Response;
    try {
      resp = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
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
      if (resp.status === 401 || resp.status === 403) {
        throw new IpcError(makeError("no_api_key", "OpenAI API key rejected"));
      }
      const text = await resp.text().catch(() => "");
      throw new IpcError(makeError("llm_unreachable", text || `HTTP ${resp.status}`));
    }

    let json: OpenAIResponse;
    try {
      json = (await resp.json()) as OpenAIResponse;
    } catch (err) {
      throw new IpcError(
        makeError("schema_validation_failed", `Bad JSON: ${(err as Error).message}`),
      );
    }

    const choice = json.choices[0];
    if (!choice) {
      throw new IpcError(makeError("schema_validation_failed", "No choices in response"));
    }
    const out: LlmChatResponse = { content: choice.message.content ?? "" };
    if (choice.message.tool_calls) {
      out.tool_calls = choice.message.tool_calls.map((c) => {
        let input: unknown;
        try {
          input = JSON.parse(c.function.arguments);
        } catch {
          input = c.function.arguments;
        }
        return { id: c.id, name: c.function.name, input };
      });
    }
    if (choice.finish_reason) out.stop_reason = choice.finish_reason;
    if (json.usage) {
      out.usage = {
        input_tokens: json.usage.prompt_tokens,
        output_tokens: json.usage.completion_tokens,
      };
    }
    return out;
  }
}
