import { describe, expect, it } from "vitest";
import { runAttack, type ProgressSink } from "../src/main/orchestrator/orchestrator.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockSearch } from "../src/main/lib/search/mock.js";
import { SwordResultSchema } from "../src/main/shared/schemas/agents.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { AgentDeps } from "../src/main/orchestrator/deps.js";
import type { AgentStage, EvalScore } from "../src/main/shared/schemas/agents.js";

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

describe("runAttack", () => {
  it("happy path: vibe.lookup → evaluator.score → vibe.finalize", async () => {
    const score: EvalScore = {
      axes: { cynicism: 7, fact: 5, punchline: 6, vibe: 8 },
      line_critique: [
        { span: { start: 0, end: 10 }, verbatim: "ㅇㅇ 그래", note: "조금 약함" },
      ],
      final_post: "초안 1차",
      needs_verification: false,
    };
    const llm = new ScriptedLlm([
      // evaluator.scoreAndCritique (structuredChat)
      { content: "", tool_calls: [{ id: "1", name: "emit_result", input: score }] },
      // vibe.finalizeConceptPost (plain text)
      { content: "ㅇㅇ 최종 다듬은 글임 ㄹㅇ" },
    ]);
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
    const result = await runAttack(
      {
        draft: "이거 본문 봤음? ㅇㅇ 어그로네",
        page_url: "https://www.fmkorea.com/best",
      },
      deps,
      sink,
      "req_attack_1",
    );
    expect(stages).toEqual(["vibe.lookup", "evaluator.score", "vibe.finalize"]);
    expect(result.kind).toBe("sword");
    expect(result.score.final_post).toBe("ㅇㅇ 최종 다듬은 글임 ㄹㅇ");
    expect(result.vibe_used.site_id).toBe("fmkorea");
    expect(SwordResultSchema.safeParse(result).success).toBe(true);
  });
});
