import { describe, expect, it } from "vitest";
import { verifyFactWithLinks } from "../src/main/agents/fact.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockLlmClient } from "../src/main/lib/llm/mock.js";
import { MockSearch } from "../src/main/lib/search/mock.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { FactResult } from "../src/main/shared/schemas/agents.js";

class ScriptedLlm implements LlmClient {
  readonly provider = "mock" as const;
  public lastReq: LlmChatRequest | null = null;
  constructor(private readonly response: LlmChatResponse) {}
  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    this.lastReq = req;
    return this.response;
  }
}

function structuredResp(input: unknown): LlmChatResponse {
  return {
    content: "",
    tool_calls: [{ id: "1", name: "emit_result", input }],
  };
}

const baseFact: FactResult = {
  claim: "x",
  verdict: "mixed",
  summary: "ok",
  sources: [{ title: "T", url: "https://x.com", snippet: "s" }],
  confidence: 0.8,
  needs_followup: false,
};

describe("verifyFactWithLinks", () => {
  it("calls search then LLM, caches result", async () => {
    const kv = new InMemoryKv();
    const llm = new ScriptedLlm(structuredResp(baseFact));
    const search = new MockSearch([
      { title: "T1", url: "https://example.com", snippet: "s" },
    ]);
    const result = await verifyFactWithLinks({
      llm,
      model: "x",
      search,
      kv,
      claim: "이거 진짜야?",
    });
    expect(result.verdict).toBe("mixed");

    // Cache hit on second call
    const llm2 = new ScriptedLlm(structuredResp({ ...baseFact, verdict: "true" }));
    const search2 = new MockSearch([]);
    const cached = await verifyFactWithLinks({
      llm: llm2,
      model: "x",
      search: search2,
      kv,
      claim: "이거 진짜야?",
    });
    expect(cached.verdict).toBe("mixed");
    expect(llm2.lastReq).toBeNull();
  });

  it("forces unverifiable when search fails and no sources", async () => {
    const kv = new InMemoryKv();
    const failingSearch = {
      async searchWeb() {
        throw new Error("Network down");
      },
    };
    const llm = new ScriptedLlm(
      structuredResp({
        ...baseFact,
        verdict: "true",
        sources: [],
      }),
    );
    const result = await verifyFactWithLinks({
      llm,
      model: "x",
      search: failingSearch,
      kv,
      claim: "x",
    });
    expect(result.verdict).toBe("unverifiable");
    expect(result.needs_followup).toBe(true);
  });

  void MockLlmClient; // referenced for import keep
});
