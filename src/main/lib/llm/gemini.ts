// Google Gemini adapter. fetch-based, no SDK.
// API: https://ai.google.dev/api/generate-content
// Endpoint: https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent
// Auth: ?key=<apiKey> query parameter.

import type { LlmChatRequest, LlmChatResponse, LlmClient, LlmMessage } from "./types.js";
import { makeError, IpcError } from "../../shared/errors.js";

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: { content: string } };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

function toGeminiContents(messages: LlmMessage[]): {
  system: string | undefined;
  contents: GeminiContent[];
} {
  let system: string | undefined;
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }
    if (m.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.tool_calls) {
        for (const c of m.tool_calls) {
          parts.push({
            functionCall: { name: c.name, args: (c.input ?? {}) as Record<string, unknown> },
          });
        }
      }
      contents.push({ role: "model", parts });
      continue;
    }
    // tool role
    contents.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: m.tool_call_id,
            response: { content: m.content },
          },
        },
      ],
    });
  }

  if (systemParts.length > 0) system = systemParts.join("\n\n");
  return { system, contents };
}

export interface GeminiOpts {
  apiKey: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
  endpointBase?: string;
}

export class GeminiClient implements LlmClient {
  readonly provider = "google" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly endpointBase: string;

  constructor(opts: GeminiOpts) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.endpointBase = opts.endpointBase ?? ENDPOINT_BASE;
  }

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!this.apiKey) {
      throw new IpcError(makeError("no_api_key", "Gemini API key missing"));
    }
    const { system, contents } = toGeminiContents(req.messages);

    const body: Record<string, unknown> = { contents };
    if (system) body["systemInstruction"] = { parts: [{ text: system }] };
    if (req.temperature !== undefined || req.max_tokens !== undefined) {
      const gc: Record<string, unknown> = {};
      if (req.temperature !== undefined) gc["temperature"] = req.temperature;
      if (req.max_tokens !== undefined) gc["maxOutputTokens"] = req.max_tokens;
      body["generationConfig"] = gc;
    }
    if (req.tools && req.tools.length > 0) {
      body["tools"] = [
        {
          functionDeclarations: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          })),
        },
      ];
    }
    if (req.tool_choice) {
      body["toolConfig"] = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [req.tool_choice.name],
        },
      };
    }

    const url = `${this.endpointBase}/${encodeURIComponent(req.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    let resp: Response;
    try {
      resp = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        throw new IpcError(makeError("no_api_key", "Gemini API key rejected"));
      }
      const text = await resp.text().catch(() => "");
      throw new IpcError(makeError("llm_unreachable", text || `HTTP ${resp.status}`));
    }

    let json: GeminiResponse;
    try {
      json = (await resp.json()) as GeminiResponse;
    } catch (err) {
      throw new IpcError(
        makeError("schema_validation_failed", `Bad JSON: ${(err as Error).message}`),
      );
    }

    const candidate = json.candidates?.[0];
    if (!candidate) {
      throw new IpcError(makeError("schema_validation_failed", "No candidates"));
    }

    let content = "";
    const tool_calls: LlmChatResponse["tool_calls"] = [];
    let funcCallIdx = 0;
    for (const part of candidate.content.parts) {
      if (part.text) content += part.text;
      else if (part.functionCall) {
        tool_calls.push({
          id: `gemini_${funcCallIdx++}`,
          name: part.functionCall.name,
          input: part.functionCall.args,
        });
      }
    }
    const out: LlmChatResponse = { content };
    if (tool_calls.length > 0) out.tool_calls = tool_calls;
    if (candidate.finishReason) out.stop_reason = candidate.finishReason;
    if (json.usageMetadata) {
      out.usage = {
        input_tokens: json.usageMetadata.promptTokenCount,
        output_tokens: json.usageMetadata.candidatesTokenCount,
      };
    }
    return out;
  }
}
