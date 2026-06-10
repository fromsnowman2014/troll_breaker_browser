import { describe, expect, it } from "vitest";
import { AnthropicClient } from "../src/main/lib/llm/anthropic.js";
import { OpenAIClient } from "../src/main/lib/llm/openai.js";
import { GeminiClient } from "../src/main/lib/llm/gemini.js";
import { MockLlmClient } from "../src/main/lib/llm/mock.js";
import { BraveSearch } from "../src/main/lib/search/brave.js";
import { MockSearch } from "../src/main/lib/search/mock.js";

describe("LLM adapter stubs", () => {
  it("AnthropicClient throws not-implemented", () => {
    const c = new AnthropicClient({ apiKey: "fake" });
    expect(() => c.chat({ model: "x", messages: [] })).toThrow(/Phase 0/);
  });

  it("OpenAIClient throws not-implemented", () => {
    const c = new OpenAIClient({ apiKey: "fake" });
    expect(() => c.chat({ model: "x", messages: [] })).toThrow(/Phase 0/);
  });

  it("GeminiClient throws not-implemented", () => {
    const c = new GeminiClient({ apiKey: "fake" });
    expect(() => c.chat({ model: "x", messages: [] })).toThrow(/Phase 0/);
  });

  it("MockLlmClient returns canned content", async () => {
    const c = new MockLlmClient({ content: "hi" });
    const r = await c.chat({ model: "x", messages: [] });
    expect(r.content).toBe("hi");
  });
});

describe("Search adapter stubs", () => {
  it("BraveSearch throws", () => {
    const s = new BraveSearch({ apiKey: "fake" });
    expect(() => s.searchWeb("q")).toThrow(/Phase 0/);
  });

  it("MockSearch returns canned sources", async () => {
    const s = new MockSearch([
      { title: "T", url: "https://x.com", snippet: "s" },
    ]);
    const r = await s.searchWeb("q");
    expect(r).toHaveLength(1);
    expect(r[0]?.title).toBe("T");
  });
});
