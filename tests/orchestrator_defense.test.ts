import { describe, expect, it } from "vitest";
import { runDefense, type ProgressSink } from "../src/main/orchestrator/orchestrator.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockSearch } from "../src/main/lib/search/mock.js";
import { ShieldResultSchema } from "../src/main/shared/schemas/agents.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { AgentDeps } from "../src/main/orchestrator/deps.js";
import type { AgentStage, FactResult } from "../src/main/shared/schemas/agents.js";

class ScriptedLlm implements LlmClient {
  readonly provider = "mock" as const;
  private idx = 0;
  constructor(private readonly responses: LlmChatResponse[]) {}
  async chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    const r = this.responses[this.idx];
    this.idx += 1;
    if (!r) throw new Error("scripted exhausted");
    return r;
  }
}

function structuredResp<T>(input: T): LlmChatResponse {
  return {
    content: "",
    tool_calls: [{ id: "1", name: "emit_result", input }],
  };
}

describe("runDefense", () => {
  it("happy path emits stages in order and returns valid ShieldResult", async () => {
    const factResult: FactResult = {
      claim: "이거 진짜야?",
      verdict: "true",
      summary: "사실로 확인됨",
      sources: [
        { title: "한겨레 기사", url: "https://hani.co.kr/x", snippet: "..." },
      ],
      confidence: 0.85,
      needs_followup: false,
    };
    const llm = new ScriptedLlm([
      structuredResp(factResult), // fact agent structured call
      { content: "ㅇㅇ 사실임 ㄹㅇ. 출처는 한겨레 기사임" }, // vibe rewrite (plain text)
    ]);
    const search = new MockSearch([
      { title: "한겨레", url: "https://hani.co.kr/x", snippet: "..." },
    ]);
    const kv = new InMemoryKv();
    const deps: AgentDeps = { llm, search, kv, model: "claude-sonnet-4-6" };

    const stages: AgentStage[] = [];
    const sink: ProgressSink = {
      stage: (s) => stages.push(s),
      signal: new AbortController().signal,
    };

    const result = await runDefense(
      {
        claim: "이거 진짜야?",
        page_url: "https://www.fmkorea.com/best",
      },
      deps,
      sink,
      "req_test",
    );

    expect(stages).toEqual(["vibe.lookup", "fact.check", "vibe.rewrite"]);
    expect(result.kind).toBe("shield");
    expect(result.request_id).toBe("req_test");
    expect(result.pipeline).toBe("fast");
    expect(result.vibe_used.site_id).toBe("fmkorea");
    expect(result.fact.verdict).toBe("true");
    expect(result.vibe_adjusted_summary).toContain("ㅇㅇ");
    // Schema validation
    expect(ShieldResultSchema.safeParse(result).success).toBe(true);
  });
});
