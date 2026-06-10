// Structured-output helper. We force the LLM to call a single tool named
// `emit_result` whose input_schema is the zod schema's JSON Schema. The
// tool_use.input becomes our typed output. One retry on validation failure
// (zod error injected back into the conversation).

import { z, type ZodTypeAny } from "zod";
import type { LlmChatRequest, LlmClient, LlmMessage } from "./types.js";
import { makeError, IpcError } from "../../shared/errors.js";

const TOOL_NAME = "emit_result";

interface StructuredOpts {
  description?: string;
  /** Whether to retry once on validation failure (default true). */
  retry?: boolean;
}

export async function structuredChat<T>(
  llm: LlmClient,
  schema: ZodTypeAny,
  req: Omit<LlmChatRequest, "tools" | "tool_choice">,
  opts: StructuredOpts = {},
): Promise<T> {
  const jsonSchemaRaw = z.toJSONSchema(schema, { target: "draft-7" });
  // Anthropic requires `type: "object"` at the top level. Wrap primitives/arrays.
  const inputSchema = wrapAsObject(jsonSchemaRaw);

  const tool = {
    name: TOOL_NAME,
    description:
      opts.description ?? "Emit the structured result conforming to the input schema.",
    input_schema: inputSchema,
  };

  const first = await llm.chat({
    ...req,
    tools: [tool],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const firstParsed = extractAndValidate<T>(first, schema);
  if (firstParsed.ok) return firstParsed.value;

  if (opts.retry === false) {
    throw new IpcError(
      makeError("schema_validation_failed", `Bad structured output: ${firstParsed.reason}`),
    );
  }

  // Retry once with error injection.
  const retryMessages: LlmMessage[] = [
    ...req.messages,
    {
      role: "assistant",
      content: "",
      tool_calls: first.tool_calls ?? [],
    },
    {
      role: "user",
      content:
        "The previous output did not match the required schema. " +
        `Validation error: ${firstParsed.reason}. ` +
        "Re-emit the result using the tool, matching the schema exactly.",
    },
  ];

  const second = await llm.chat({
    ...req,
    messages: retryMessages,
    tools: [tool],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const secondParsed = extractAndValidate<T>(second, schema);
  if (secondParsed.ok) return secondParsed.value;

  throw new IpcError(
    makeError("schema_validation_failed", `Bad structured output (retry): ${secondParsed.reason}`),
  );
}

function extractAndValidate<T>(
  resp: { tool_calls?: { name: string; input: unknown }[] },
  schema: ZodTypeAny,
): { ok: true; value: T } | { ok: false; reason: string } {
  const call = resp.tool_calls?.find((c) => c.name === TOOL_NAME);
  if (!call) {
    return { ok: false, reason: `No ${TOOL_NAME} tool call in response` };
  }
  const result = schema.safeParse(call.input);
  if (!result.success) {
    return { ok: false, reason: JSON.stringify(result.error.issues).slice(0, 800) };
  }
  return { ok: true, value: result.data as T };
}

interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
}

function wrapAsObject(schema: unknown): Record<string, unknown> {
  const s = schema as JsonSchemaLike;
  if (s && typeof s === "object" && s.type === "object") {
    return s as Record<string, unknown>;
  }
  // Wrap arrays / primitives in { result: ... } so tool input_schema is object.
  return {
    type: "object",
    properties: { result: schema as Record<string, unknown> },
    required: ["result"],
  };
}
