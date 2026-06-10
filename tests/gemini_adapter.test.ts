import { describe, expect, it, vi } from "vitest";
import { GeminiClient } from "../src/main/lib/llm/gemini.js";

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GeminiClient", () => {
  it("appends apiKey to URL and maps roles", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        candidates: [
          {
            content: { role: "model", parts: [{ text: "hello" }] },
            finishReason: "STOP",
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const c = new GeminiClient({ apiKey: "AIza-x", fetchImpl });
    const r = await c.chat({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "Be helpful" },
        { role: "user", content: "hi" },
      ],
    });
    expect(r.content).toBe("hello");
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const url = String(calls[0]?.[0]);
    expect(url).toContain("gemini-2.5-flash:generateContent");
    expect(url).toContain("key=AIza-x");
    const body = JSON.parse((calls[0]?.[1] as RequestInit).body as string);
    expect(body.systemInstruction.parts[0].text).toBe("Be helpful");
    expect(body.contents[0]).toEqual({ role: "user", parts: [{ text: "hi" }] });
  });

  it("parses functionCall parts as tool_calls", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                { text: "prelude " },
                { functionCall: { name: "emit_result", args: { x: 1 } } },
              ],
            },
            finishReason: "STOP",
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const c = new GeminiClient({ apiKey: "k", fetchImpl });
    const r = await c.chat({ model: "g", messages: [{ role: "user", content: "x" }] });
    expect(r.content).toBe("prelude ");
    expect(r.tool_calls?.[0]).toEqual({
      id: "gemini_0",
      name: "emit_result",
      input: { x: 1 },
    });
  });

  it("forwards tools and forced function call", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        candidates: [{ content: { role: "model", parts: [] }, finishReason: "STOP" }],
      }),
    ) as unknown as typeof fetch;
    const c = new GeminiClient({ apiKey: "k", fetchImpl });
    await c.chat({
      model: "g",
      messages: [{ role: "user", content: "x" }],
      tools: [{ name: "emit_result", description: "d", input_schema: { type: "object" } }],
      tool_choice: { type: "tool", name: "emit_result" },
    });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const body = JSON.parse((calls[0]?.[1] as RequestInit).body as string);
    expect(body.tools[0].functionDeclarations[0].name).toBe("emit_result");
    expect(body.toolConfig.functionCallingConfig.mode).toBe("ANY");
    expect(body.toolConfig.functionCallingConfig.allowedFunctionNames).toEqual([
      "emit_result",
    ]);
  });
});
