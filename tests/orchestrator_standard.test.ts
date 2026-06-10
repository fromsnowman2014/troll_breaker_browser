// Standard Defense pipeline: fact + logic in parallel, then vibe.rewrite.

import { describe, expect, it } from "vitest";
import { runDefense, type ProgressSink } from "../src/main/orchestrator/orchestrator.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockSearch } from "../src/main/lib/search/mock.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { AgentDeps } from "../src/main/orchestrator/deps.js";
import type {
  AgentStage,
  FactResult,
  Fallacy,
} from "../src/main/shared/schemas/agents.js";

// Content-aware LLM mock that picks a response based on the system prompt
// (fact / fallacy / plain rewrite). Needed because fact + logic run in
// parallel under the standard pipeline.
class ContentMatchedLlm implements LlmClient {
  readonly provider = "mock" as const;
  public callCount = 0;
  constructor(
    private readonly routes: {
      onFact?: LlmChatResponse;
      onLogic?: LlmChatResponse;
      onPlain?: LlmChatResponse;
    },
  ) {}
  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    this.callCount += 1;
    const systemMsg = req.messages.find((m) => m.role === "system");
    const sysText = systemMsg && "content" in systemMsg ? systemMsg.content : "";
    if (sysText.includes("fact-checker") && this.routes.onFact) return this.routes.onFact;
    if (sysText.includes("logic critic") && this.routes.onLogic) return this.routes.onLogic;
    if (this.routes.onPlain) return this.routes.onPlain;
    throw new Error(`no route matched for: ${sysText.slice(0, 80)}`);
  }
}

function structured<T>(input: T): LlmChatResponse {
  return {
    content: "",
    tool_calls: [{ id: "x", name: "emit_result", input }],
  };
}

describe("runDefense (standard)", () => {
  it("input >500 chars triggers fact + logic + vibe.rewrite", async () => {
    const fact: FactResult = {
      claim: "x",
      verdict: "mixed",
      summary: "ok",
      sources: [],
      confidence: 0.6,
      needs_followup: false,
    };
    const fallacies: Fallacy[] = [
      {
        type: "straw_man",
        span: { start: 0, end: 5 },
        verbatim: "ㄴㄴ",
        explanation: "상대 주장 왜곡",
        counter_punch: "ㅇㅇ 원래 주장은 다름",
      },
    ];
    const llm = new ContentMatchedLlm({
      onFact: structured(fact),
      onLogic: structured({ fallacies }),
      onPlain: { content: "정리한 답변임" },
    });
    const deps: AgentDeps = {
      llm,
      search: new MockSearch([]),
      kv: new InMemoryKv(),
      model: "claude-sonnet-4-6",
    };
    const stages: AgentStage[] = [];
    const sink: ProgressSink = {
      stage: (s) => stages.push(s),
      signal: new AbortController().signal,
    };
    const longClaim = "이 주장이 사실인지 분석해야 한다. ".repeat(40);
    const result = await runDefense(
      { claim: longClaim, page_url: "https://www.fmkorea.com/best" },
      deps,
      sink,
      "req_std",
    );
    expect(result.pipeline).toBe("standard");
    expect(result.fallacies.length).toBe(1);
    expect(result.fact.verdict).toBe("mixed");
    expect(stages).toContain("logic.detect");
    expect(stages).toContain("fact.check");
    expect(stages).toContain("vibe.rewrite");
  });

  it("explicit pipeline_hint=fast skips logic", async () => {
    const fact: FactResult = {
      claim: "x",
      verdict: "true",
      summary: "ok",
      sources: [],
      confidence: 0.9,
      needs_followup: false,
    };
    const llm = new ContentMatchedLlm({
      onFact: structured(fact),
      onPlain: { content: "ok" },
    });
    const deps: AgentDeps = {
      llm,
      search: new MockSearch([]),
      kv: new InMemoryKv(),
      model: "x",
    };
    const stages: AgentStage[] = [];
    const sink: ProgressSink = {
      stage: (s) => stages.push(s),
      signal: new AbortController().signal,
    };
    const longClaim = "x".repeat(1000);
    const result = await runDefense(
      {
        claim: longClaim,
        page_url: "https://www.fmkorea.com/best",
        pipeline_hint: "fast",
      },
      deps,
      sink,
      "r",
    );
    expect(result.pipeline).toBe("fast");
    expect(stages).not.toContain("logic.detect");
  });
});
