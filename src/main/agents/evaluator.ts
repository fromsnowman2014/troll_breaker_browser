// Evaluator agent — scoreAndCritique(draft, vibe) → EvalScore.
// Single structured-output call. Returns:
//   axes: 4-axis score (cynicism/fact/punchline/vibe each 0..10)
//   line_critique: per-span notes
//   final_post: a first-pass rewrite (Phase 2 ships, finalize step refines)
//   needs_verification: true if fact-check still recommended

import type { LlmClient } from "../lib/llm/types.js";
import type { EvalScore, VibeProfile } from "../shared/schemas/agents.js";
import { EvalScoreSchema } from "../shared/schemas/agents.js";
import { structuredChat } from "../lib/llm/structured.js";

interface ScoreOpts {
  llm: LlmClient;
  model: string;
  draft: string;
  vibe: VibeProfile;
  signal?: AbortSignal;
}

export async function scoreAndCritique(opts: ScoreOpts): Promise<EvalScore> {
  const vibeContext =
    `Lexicon: ${opts.vibe.lexicon.join(", ")}\n` +
    `Sentence shape: ${opts.vibe.sentence_shape}\n` +
    `Tonality: ${opts.vibe.tonality}\n` +
    `Few-shots:\n` +
    opts.vibe.few_shot_posts.map((p, i) => `${i + 1}. ${p.text}`).join("\n");

  const system =
    `You are a sharp critic for the community "${opts.vibe.display_name}".\n` +
    `Score the user's draft on a 4-axis rubric (each 0–10):\n` +
    `- cynicism: how dry / sarcastic / weary the tone is\n` +
    `- fact: how well-grounded in evidence / how rebuttal-proof it is\n` +
    `- punchline: how memorable / quotable the kicker is\n` +
    `- vibe: how natural it would read on this specific community\n\n` +
    `Then produce line_critique entries pointing at weak spans, and a final_post that is your rewritten version in the community's voice. Set needs_verification if the draft makes claims that should be fact-checked.\n\n` +
    `# Community context\n${vibeContext}`;

  const result = await structuredChat<EvalScore>(opts.llm, EvalScoreSchema, {
    model: opts.model,
    temperature: 0.4,
    max_tokens: 2048,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `다음 초안을 평가하고 다시 써:\n\n${opts.draft}` },
    ],
    ...(opts.signal && { signal: opts.signal }),
  });

  return result;
}
