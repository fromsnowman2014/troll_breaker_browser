// Round-trip checks for every new agent-domain schema (Phase 1).

import { describe, expect, it } from "vitest";
import {
  SourceSchema,
  FactResultSchema,
  VibeProfileSchema,
  FallacySchema,
  EvalScoreSchema,
  ShieldResultSchema,
  SwordResultSchema,
  RefineResultSchema,
  AgentProgressEvtSchema,
  AgentResultEvtSchema,
  AgentErrorEvtSchema,
} from "../src/main/shared/schemas/agents.js";

describe("Source", () => {
  it("accepts HTTPS URL", () => {
    expect(
      SourceSchema.safeParse({ title: "t", url: "https://x.com", snippet: "s" }).success,
    ).toBe(true);
  });
  it("rejects HTTP URL", () => {
    expect(
      SourceSchema.safeParse({ title: "t", url: "http://x.com", snippet: "s" }).success,
    ).toBe(false);
  });
});

describe("VibeProfile", () => {
  const ok = {
    site_id: "fmkorea",
    display_name: "에펨코리아",
    source: "seed" as const,
    last_refreshed: "2026-06-09T00:00:00Z",
    lexicon: ["ㅇㅇ"],
    sentence_shape: "짧음",
    tonality: "냉소",
    few_shot_posts: [
      { text: "예시 1" },
      { text: "예시 2" },
    ],
  };
  it("accepts a valid profile", () => {
    expect(VibeProfileSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects when fewer than 2 few-shots", () => {
    expect(
      VibeProfileSchema.safeParse({ ...ok, few_shot_posts: [{ text: "only one" }] }).success,
    ).toBe(false);
  });
});

describe("FactResult", () => {
  const ok = {
    claim: "x",
    verdict: "true" as const,
    summary: "ok",
    sources: [{ title: "t", url: "https://x.com", snippet: "s" }],
    confidence: 0.9,
    needs_followup: false,
  };
  it("accepts a valid result", () => {
    expect(FactResultSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects confidence > 1", () => {
    expect(FactResultSchema.safeParse({ ...ok, confidence: 1.5 }).success).toBe(false);
  });
});

describe("Fallacy", () => {
  it("accepts a valid fallacy", () => {
    expect(
      FallacySchema.safeParse({
        type: "ad_hominem",
        span: { start: 0, end: 10 },
        verbatim: "x",
        explanation: "y",
        counter_punch: "z",
      }).success,
    ).toBe(true);
  });
});

describe("EvalScore", () => {
  it("accepts a valid score", () => {
    expect(
      EvalScoreSchema.safeParse({
        axes: { cynicism: 8, fact: 5, punchline: 7, vibe: 9 },
        line_critique: [],
        final_post: "abc",
        needs_verification: false,
      }).success,
    ).toBe(true);
  });
  it("rejects axes > 10", () => {
    expect(
      EvalScoreSchema.safeParse({
        axes: { cynicism: 11, fact: 5, punchline: 7, vibe: 9 },
        line_critique: [],
        final_post: "",
        needs_verification: false,
      }).success,
    ).toBe(false);
  });
});

describe("Result schemas", () => {
  const vibe = {
    site_id: "fmkorea",
    display_name: "X",
    source: "seed" as const,
    last_refreshed: "2026-06-09T00:00:00Z",
    lexicon: [],
    sentence_shape: "",
    tonality: "",
    few_shot_posts: [{ text: "1" }, { text: "2" }],
  };
  const fact = {
    claim: "c",
    verdict: "mixed" as const,
    summary: "",
    sources: [],
    confidence: 0.5,
    needs_followup: false,
  };

  it("ShieldResult accepts a complete payload", () => {
    expect(
      ShieldResultSchema.safeParse({
        kind: "shield",
        request_id: "r",
        pipeline: "fast",
        vibe_used: vibe,
        claim_excerpt: "c",
        fact,
        fallacies: [],
        vibe_adjusted_summary: "x",
        generated_at: "2026-06-09T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("SwordResult accepts a complete payload", () => {
    expect(
      SwordResultSchema.safeParse({
        kind: "sword",
        request_id: "r",
        pipeline: "fast",
        vibe_used: vibe,
        draft_excerpt: "d",
        score: {
          axes: { cynicism: 1, fact: 1, punchline: 1, vibe: 1 },
          line_critique: [],
          final_post: "",
          needs_verification: false,
        },
        generated_at: "2026-06-09T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("RefineResult roundtrips", () => {
    expect(
      RefineResultSchema.safeParse({
        kind: "refine",
        request_id: "r",
        prior_request_id: "p",
        refined_text: "x",
        generated_at: "2026-06-09T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("Agent event schemas", () => {
  it("AgentProgressEvtSchema accepts canonical stages", () => {
    expect(
      AgentProgressEvtSchema.safeParse({
        request_id: "r",
        stage: "fact.check",
      }).success,
    ).toBe(true);
  });

  it("AgentErrorEvtSchema requires AppError", () => {
    expect(
      AgentErrorEvtSchema.safeParse({
        request_id: "r",
        error: { code: "no_api_key", message: "set the key" },
      }).success,
    ).toBe(true);
  });

  it("AgentResultEvtSchema validates the discriminated payload", () => {
    const ok = AgentResultEvtSchema.safeParse({
      request_id: "r",
      payload: {
        kind: "refine",
        request_id: "r",
        prior_request_id: "p",
        refined_text: "x",
        generated_at: "2026-06-09T00:00:00Z",
      },
    });
    expect(ok.success).toBe(true);
  });
});
