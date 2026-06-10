// Live integration test against the real Anthropic API.
// Skipped automatically when ANTHROPIC_API_KEY is not set.
//
// Run: ANTHROPIC_API_KEY=sk-... npm run test:integration

import { describe, expect, it } from "vitest";
import { AnthropicClient } from "../../src/main/lib/llm/anthropic.js";
import { structuredChat } from "../../src/main/lib/llm/structured.js";
import { z } from "zod";

const apiKey = process.env["ANTHROPIC_API_KEY"];

describe.skipIf(!apiKey)("Anthropic LIVE", () => {
  it("returns text content for a 1-token request", { timeout: 30_000 }, async () => {
    const c = new AnthropicClient({ apiKey: apiKey! });
    const r = await c.chat({
      model: "claude-haiku-4-5",
      max_tokens: 5,
      messages: [{ role: "user", content: "Say hi" }],
    });
    expect(typeof r.content).toBe("string");
    expect(r.content.length).toBeGreaterThan(0);
  });

  it("structuredChat returns valid output", { timeout: 30_000 }, async () => {
    const c = new AnthropicClient({ apiKey: apiKey! });
    const Schema = z.object({
      greeting: z.string(),
      polite: z.boolean(),
    });
    const r = await structuredChat<z.infer<typeof Schema>>(c, Schema, {
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content:
            "Use the emit_result tool to emit a friendly greeting in English with polite=true.",
        },
      ],
    });
    expect(typeof r.greeting).toBe("string");
    expect(r.greeting.length).toBeGreaterThan(0);
    expect(r.polite).toBe(true);
  });
});
