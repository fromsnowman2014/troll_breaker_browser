import { describe, expect, it, vi } from "vitest";
import { OpenAIClient } from "../src/main/lib/llm/openai.js";

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OpenAIClient", () => {
  it("sends bearer auth + correct shape", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        id: "x",
        choices: [{ message: { role: "assistant", content: "hi" }, finish_reason: "stop" }],
      }),
    ) as unknown as typeof fetch;
    const c = new OpenAIClient({ apiKey: "sk-x", fetchImpl });
    await c.chat({
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 50,
    });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const init = calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-x");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("gpt-4o");
    expect(body.max_tokens).toBe(50);
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("parses function tool_calls", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        id: "x",
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "emit_result", arguments: '{"foo":"bar"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const c = new OpenAIClient({ apiKey: "sk", fetchImpl });
    const r = await c.chat({ model: "gpt-4o", messages: [{ role: "user", content: "x" }] });
    expect(r.content).toBe("");
    expect(r.tool_calls).toEqual([
      { id: "call_1", name: "emit_result", input: { foo: "bar" } },
    ]);
  });

  it("forwards tools + tool_choice in OpenAI shape", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        id: "x",
        choices: [{ message: { role: "assistant", content: "" }, finish_reason: "stop" }],
      }),
    ) as unknown as typeof fetch;
    const c = new OpenAIClient({ apiKey: "sk", fetchImpl });
    await c.chat({
      model: "gpt-4o",
      messages: [{ role: "user", content: "x" }],
      tools: [
        { name: "emit_result", description: "d", input_schema: { type: "object" } },
      ],
      tool_choice: { type: "tool", name: "emit_result" },
    });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const body = JSON.parse((calls[0]?.[1] as RequestInit).body as string);
    expect(body.tools[0].type).toBe("function");
    expect(body.tools[0].function.name).toBe("emit_result");
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "emit_result" } });
  });

  it("401 → no_api_key", async () => {
    const fetchImpl = vi.fn(async () => jsonResp({}, 401)) as unknown as typeof fetch;
    const c = new OpenAIClient({ apiKey: "sk", fetchImpl });
    await expect(c.chat({ model: "x", messages: [] })).rejects.toThrow(/rejected/);
  });
});
