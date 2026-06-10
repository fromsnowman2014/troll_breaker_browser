// Logic agent — detectFallacies(claim, vibe) → Fallacy[].
// Single structuredChat call asking the LLM to spot up to N fallacies in the
// claim. Returns [] when the claim is clean. Counter-punches are written in
// the site's vibe so they're ready to copy/paste into a reply.

import { z } from "zod";
import type { LlmClient } from "../lib/llm/types.js";
import type { Fallacy, VibeProfile } from "../shared/schemas/agents.js";
import { FallacySchema } from "../shared/schemas/agents.js";
import { structuredChat } from "../lib/llm/structured.js";

const FallaciesArraySchema = z.object({
  fallacies: z.array(FallacySchema),
});

interface LogicOpts {
  llm: LlmClient;
  model: string;
  claim: string;
  vibe: VibeProfile;
  signal?: AbortSignal;
}

export async function detectFallacies(opts: LogicOpts): Promise<Fallacy[]> {
  const vibeContext =
    `Lexicon: ${opts.vibe.lexicon.join(", ")}\n` +
    `Tone: ${opts.vibe.tonality}`;

  const system =
    "You are a sharp logic critic. Identify formal/informal fallacies in the user's claim. " +
    "For each, return:\n" +
    "- type: one of ad_hominem, straw_man, whataboutism, false_dichotomy, slippery_slope, " +
    "appeal_to_authority, tu_quoque, circular_reasoning, hasty_generalization, other\n" +
    "- span: { start, end } character offsets into the original claim (best-effort)\n" +
    "- verbatim: the exact substring at that span\n" +
    "- explanation: 1-2 sentences in Korean, plain language\n" +
    "- counter_punch: a 1-line rebuttal written in the community's voice\n\n" +
    "If the claim is clean, return { fallacies: [] }. Do not invent fallacies.\n\n" +
    "# Community context\n" +
    vibeContext;

  const result = await structuredChat<z.infer<typeof FallaciesArraySchema>>(
    opts.llm,
    FallaciesArraySchema,
    {
      model: opts.model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Claim:\n${opts.claim}\n\nDetect fallacies. Return an empty array if clean.`,
        },
      ],
      ...(opts.signal && { signal: opts.signal }),
    },
  );

  return result.fallacies;
}
