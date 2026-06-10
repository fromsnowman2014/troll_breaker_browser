// Phase 2: Anthropic, OpenAI, Gemini, Brave all LIVE. This file now only
// covers the mock helpers used by other tests.

import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../src/main/lib/llm/mock.js";
import { MockSearch } from "../src/main/lib/search/mock.js";

describe("mocks", () => {
  it("MockLlmClient returns canned content", async () => {
    const c = new MockLlmClient({ content: "hi" });
    const r = await c.chat({ model: "x", messages: [] });
    expect(r.content).toBe("hi");
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
