import { describe, expect, it } from "vitest";
import { detectFallacies } from "../src/main/agents/logic.js";
import type { LlmChatRequest, LlmChatResponse, LlmClient } from "../src/main/lib/llm/types.js";
import type { VibeProfile, Fallacy } from "../src/main/shared/schemas/agents.js";

class ScriptedLlm implements LlmClient {
  readonly provider = "mock" as const;
  constructor(private readonly resp: LlmChatResponse) {}
  async chat(_req: LlmChatRequest): Promise<LlmChatResponse> {
    return this.resp;
  }
}

const vibe: VibeProfile = {
  site_id: "fmkorea",
  display_name: "에펨코리아",
  source: "seed",
  last_refreshed: "2026-06-10T00:00:00Z",
  lexicon: ["ㅇㅇ"],
  sentence_shape: "짧음",
  tonality: "냉소",
  few_shot_posts: [{ text: "예시 1" }, { text: "예시 2" }],
};

describe("detectFallacies", () => {
  it("returns parsed fallacies on a structured tool call", async () => {
    const fallacy: Fallacy = {
      type: "ad_hominem",
      span: { start: 0, end: 5 },
      verbatim: "넌 멍청",
      explanation: "주장 대신 사람을 공격",
      counter_punch: "ㄴㄴ 주장 자체에 대해 얘기해보자",
    };
    const llm = new ScriptedLlm({
      content: "",
      tool_calls: [
        { id: "1", name: "emit_result", input: { fallacies: [fallacy] } },
      ],
    });
    const result = await detectFallacies({
      llm,
      model: "x",
      claim: "넌 멍청해서 그런 주장 하는 거임",
      vibe,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("ad_hominem");
  });

  it("returns empty array for clean input", async () => {
    const llm = new ScriptedLlm({
      content: "",
      tool_calls: [{ id: "1", name: "emit_result", input: { fallacies: [] } }],
    });
    const result = await detectFallacies({
      llm,
      model: "x",
      claim: "이 데이터는 X 출처에서 가져왔으며 ...",
      vibe,
    });
    expect(result).toEqual([]);
  });
});
