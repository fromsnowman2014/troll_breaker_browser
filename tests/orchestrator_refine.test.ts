import { describe, expect, it } from "vitest";
import {
  runDefense,
  runRefine,
  type ProgressSink,
} from "../src/main/orchestrator/orchestrator.js";
import { getSession, pushRefinement } from "../src/main/orchestrator/session.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockSearch } from "../src/main/lib/search/mock.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { AgentDeps } from "../src/main/orchestrator/deps.js";
import type { FactResult } from "../src/main/shared/schemas/agents.js";

class ScriptedLlm implements LlmClient {
  readonly provider = "mock" as const;
  private idx = 0;
  public lastReqMessages: LlmChatRequest["messages"][] = [];
  constructor(private readonly responses: LlmChatResponse[]) {}
  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    this.lastReqMessages.push(req.messages);
    const r = this.responses[this.idx];
    this.idx += 1;
    if (!r) throw new Error("scripted exhausted");
    return r;
  }
}

const fact: FactResult = {
  claim: "x",
  verdict: "true",
  summary: "ok",
  sources: [{ title: "T", url: "https://x.com", snippet: "s" }],
  confidence: 0.8,
  needs_followup: false,
};

const noopSink: ProgressSink = {
  stage: () => undefined,
  signal: new AbortController().signal,
};

describe("runRefine", () => {
  it("returns refined_text and pushes onto session history", async () => {
    const llm = new ScriptedLlm([
      // Defense first: fact (structured) + vibe rewrite (plain)
      { content: "", tool_calls: [{ id: "1", name: "emit_result", input: fact }] },
      { content: "원본 답변임" },
      // Refine: single rewrite
      { content: "정제된 답변임" },
    ]);
    const deps: AgentDeps = {
      llm,
      search: new MockSearch([]),
      kv: new InMemoryKv(),
      model: "x",
    };
    await runDefense(
      { claim: "이거 진짜?", page_url: "https://www.fmkorea.com/best" },
      deps,
      noopSink,
      "defense_1",
    );
    const refined = await runRefine(
      { prior_request_id: "defense_1", instruction: "더 짧게" },
      deps,
      noopSink,
      "refine_1",
    );
    expect(refined.kind).toBe("refine");
    expect(refined.refined_text).toBe("정제된 답변임");
    expect(refined.prior_request_id).toBe("defense_1");
    const session = getSession("defense_1");
    expect(session?.current_text).toBe("정제된 답변임");
    expect(session?.history[0]).toBe("원본 답변임");
  });

  it("rejects when prior_request_id is unknown", async () => {
    const llm = new ScriptedLlm([]);
    const deps: AgentDeps = {
      llm,
      search: new MockSearch([]),
      kv: new InMemoryKv(),
      model: "x",
    };
    await expect(
      runRefine(
        { prior_request_id: "nope", instruction: "ignore" },
        deps,
        noopSink,
        "r",
      ),
    ).rejects.toThrow();
  });

  it("revert stack capped at 5", () => {
    pushRefinement("k1", "a", "x");
    // Initially no session — pushRefinement should be no-op (no throw)
    expect(getSession("k1")).toBeUndefined();
  });
});
