// structuredChat: single-tool emit_result + 1 retry on validation failure.

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { structuredChat } from "../src/main/lib/llm/structured.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";

const Schema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

class ScriptedLlm implements LlmClient {
  readonly provider = "mock" as const;
  private idx = 0;
  constructor(private readonly responses: LlmChatResponse[]) {}
  async chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    const r = this.responses[this.idx];
    this.idx += 1;
    if (!r) throw new Error("scripted llm exhausted");
    return r;
  }
}

describe("structuredChat", () => {
  it("returns parsed result on first valid output", async () => {
    const llm = new ScriptedLlm([
      {
        content: "",
        tool_calls: [
          { id: "1", name: "emit_result", input: { name: "Alice", age: 30 } },
        ],
      },
    ]);
    const r = await structuredChat<z.infer<typeof Schema>>(llm, Schema, {
      model: "x",
      messages: [{ role: "user", content: "go" }],
    });
    expect(r).toEqual({ name: "Alice", age: 30 });
  });

  it("retries once on validation failure", async () => {
    const llm = new ScriptedLlm([
      {
        content: "",
        tool_calls: [{ id: "1", name: "emit_result", input: { name: "X", age: -1 } }],
      },
      {
        content: "",
        tool_calls: [{ id: "2", name: "emit_result", input: { name: "Y", age: 5 } }],
      },
    ]);
    const r = await structuredChat<z.infer<typeof Schema>>(llm, Schema, {
      model: "x",
      messages: [{ role: "user", content: "go" }],
    });
    expect(r).toEqual({ name: "Y", age: 5 });
  });

  it("throws after second failure", async () => {
    const llm = new ScriptedLlm([
      {
        content: "",
        tool_calls: [{ id: "1", name: "emit_result", input: { name: "X", age: -1 } }],
      },
      {
        content: "",
        tool_calls: [{ id: "2", name: "emit_result", input: { name: "Y", age: -1 } }],
      },
    ]);
    await expect(
      structuredChat(llm, Schema, { model: "x", messages: [{ role: "user", content: "g" }] }),
    ).rejects.toThrow(/schema|retry|Bad/);
  });

  it("throws if no tool call returned", async () => {
    const llm = new ScriptedLlm([
      { content: "no tool" },
      { content: "still no tool" },
    ]);
    await expect(
      structuredChat(llm, Schema, { model: "x", messages: [{ role: "user", content: "g" }] }),
    ).rejects.toThrow();
  });
});
