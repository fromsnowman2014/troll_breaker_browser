// Anthropic adapter tests — uses vi.fn() for fetch.

import { describe, expect, it, vi } from "vitest";
import { AnthropicClient } from "../src/main/lib/llm/anthropic.js";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("AnthropicClient", () => {
  it("sends correct headers + body shape", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "msg_1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "ok" }],
          model: "claude-sonnet-4-6",
          stop_reason: "end_turn",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    const c = new AnthropicClient({ apiKey: "sk-test", fetchImpl });
    await c.chat({
      model: "claude-sonnet-4-6",
      messages: [
        { role: "system", content: "You are X" },
        { role: "user", content: "Hi" },
      ],
      max_tokens: 100,
    });

    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
    const init = calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(headers["content-type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.system).toBe("You are X");
    expect(body.max_tokens).toBe(100);
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("parses text + tool_use blocks", async () => {
    const c = new AnthropicClient({
      apiKey: "sk",
      fetchImpl: mockFetch({
        id: "x",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Here you go: " },
          {
            type: "tool_use",
            id: "tool_1",
            name: "emit_result",
            input: { foo: "bar" },
          },
        ],
        model: "x",
        stop_reason: "tool_use",
      }),
    });
    const r = await c.chat({ model: "x", messages: [{ role: "user", content: "hi" }] });
    expect(r.content).toBe("Here you go: ");
    expect(r.tool_calls).toEqual([
      { id: "tool_1", name: "emit_result", input: { foo: "bar" } },
    ]);
  });

  it("network error → llm_unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const c = new AnthropicClient({ apiKey: "sk", fetchImpl });
    await expect(c.chat({ model: "x", messages: [] })).rejects.toThrow(/ECONNREFUSED/);
  });

  it("401 → no_api_key", async () => {
    const c = new AnthropicClient({ apiKey: "sk", fetchImpl: mockFetch({}, 401) });
    await expect(c.chat({ model: "x", messages: [] })).rejects.toThrow(/rejected/);
  });

  it("missing apiKey throws no_api_key", async () => {
    const c = new AnthropicClient({ apiKey: "" });
    await expect(c.chat({ model: "x", messages: [] })).rejects.toThrow(/missing/);
  });

  it("forwards tool definitions + tool_choice", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "x",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "" }],
          model: "x",
          stop_reason: "end_turn",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as unknown as typeof fetch;
    const c = new AnthropicClient({ apiKey: "sk", fetchImpl });
    await c.chat({
      model: "x",
      messages: [{ role: "user", content: "hi" }],
      tools: [
        {
          name: "emit_result",
          description: "d",
          input_schema: { type: "object", properties: {} },
        },
      ],
      tool_choice: { type: "tool", name: "emit_result" },
    });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const body = JSON.parse((calls[0]?.[1] as RequestInit).body as string);
    expect(body.tools).toHaveLength(1);
    expect(body.tools[0].name).toBe("emit_result");
    expect(body.tool_choice).toEqual({ type: "tool", name: "emit_result" });
  });
});
