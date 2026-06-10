// Agent domain schemas — VibeProfile, FactResult, Fallacy, EvalScore, Source,
// ShieldResult (Defense), SwordResult (Attack), RefineResult, AgentStage events.
//
// Mirrors doc/DATA_SCHEMAS.md §1 + AGENT_DESIGN.md §2. The internal type names
// keep Shield/Sword for stability; UI uses Defense/Attack labels.

import { z } from "zod";
import { AppErrorSchema } from "../errors.js";

// ─────────────────────────────────────────────
// Sources & Facts
// ─────────────────────────────────────────────

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url().refine((u) => u.startsWith("https://"), {
    message: "Source URLs must be HTTPS",
  }),
  publisher: z.string().optional(),
  published_at: z.string().optional(), // ISO 8601 if present
  snippet: z.string(),
});
export type Source = z.infer<typeof SourceSchema>;

export const FactVerdictSchema = z.enum(["true", "false", "mixed", "unverifiable"]);
export type FactVerdict = z.infer<typeof FactVerdictSchema>;

export const FactResultSchema = z.object({
  claim: z.string(),
  verdict: FactVerdictSchema,
  summary: z.string(),
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(1),
  needs_followup: z.boolean(),
});
export type FactResult = z.infer<typeof FactResultSchema>;

// ─────────────────────────────────────────────
// Vibe
// ─────────────────────────────────────────────

export const VibeSourceSchema = z.enum(["seed", "sampled", "fallback"]);

export const FewShotPostSchema = z.object({
  text: z.string(),
  notes: z.string().optional(),
});

export const VibeProfileSchema = z.object({
  site_id: z.string().min(1),
  display_name: z.string(),
  source: VibeSourceSchema,
  last_refreshed: z.string(), // ISO 8601
  lexicon: z.array(z.string()),
  sentence_shape: z.string(),
  tonality: z.string(),
  few_shot_posts: z.array(FewShotPostSchema).min(2).max(5),
});
export type VibeProfile = z.infer<typeof VibeProfileSchema>;

// ─────────────────────────────────────────────
// Fallacies (Phase 3 usage; schema declared now so all results share the shape)
// ─────────────────────────────────────────────

export const FallacyTypeSchema = z.enum([
  "ad_hominem",
  "straw_man",
  "whataboutism",
  "false_dichotomy",
  "slippery_slope",
  "appeal_to_authority",
  "tu_quoque",
  "circular_reasoning",
  "hasty_generalization",
  "other",
]);
export type FallacyType = z.infer<typeof FallacyTypeSchema>;

export const TextSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const FallacySchema = z.object({
  type: FallacyTypeSchema,
  span: TextSpanSchema,
  verbatim: z.string(),
  explanation: z.string(),
  counter_punch: z.string(),
});
export type Fallacy = z.infer<typeof FallacySchema>;

// ─────────────────────────────────────────────
// Evaluator (Attack rubric)
// ─────────────────────────────────────────────

export const EvalAxisSchema = z.number().int().min(0).max(10);

export const EvalAxesSchema = z.object({
  cynicism: EvalAxisSchema,
  fact: EvalAxisSchema,
  punchline: EvalAxisSchema,
  vibe: EvalAxisSchema,
});

export const LineNoteSchema = z.object({
  span: TextSpanSchema,
  verbatim: z.string(),
  note: z.string(),
});

export const EvalScoreSchema = z.object({
  axes: EvalAxesSchema,
  line_critique: z.array(LineNoteSchema),
  final_post: z.string(),
  needs_verification: z.boolean(),
});
export type EvalScore = z.infer<typeof EvalScoreSchema>;

// ─────────────────────────────────────────────
// Pipeline kind
// ─────────────────────────────────────────────

export const PipelineSchema = z.enum(["fast", "standard", "deep"]);
export type Pipeline = z.infer<typeof PipelineSchema>;

// ─────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────

export const ShieldResultSchema = z.object({
  kind: z.literal("shield"),
  request_id: z.string().min(1),
  pipeline: PipelineSchema,
  vibe_used: VibeProfileSchema,
  claim_excerpt: z.string(),
  fact: FactResultSchema,
  fallacies: z.array(FallacySchema),
  vibe_adjusted_summary: z.string(),
  generated_at: z.string(),
});
export type ShieldResult = z.infer<typeof ShieldResultSchema>;

export const SwordResultSchema = z.object({
  kind: z.literal("sword"),
  request_id: z.string().min(1),
  pipeline: PipelineSchema,
  vibe_used: VibeProfileSchema,
  draft_excerpt: z.string(),
  score: EvalScoreSchema,
  generated_at: z.string(),
});
export type SwordResult = z.infer<typeof SwordResultSchema>;

export const RefineResultSchema = z.object({
  kind: z.literal("refine"),
  request_id: z.string().min(1),
  prior_request_id: z.string().min(1),
  refined_text: z.string(),
  generated_at: z.string(),
});
export type RefineResult = z.infer<typeof RefineResultSchema>;

export const AgentResultPayloadSchema = z.discriminatedUnion("kind", [
  ShieldResultSchema,
  SwordResultSchema,
  RefineResultSchema,
]);
export type AgentResultPayload = z.infer<typeof AgentResultPayloadSchema>;

// UI-facing aliases (per AGENT_DESIGN.md §2.2)
export const DefenseResultSchema = ShieldResultSchema;
export const AttackResultSchema = SwordResultSchema;
export type DefenseResult = ShieldResult;
export type AttackResult = SwordResult;

// ─────────────────────────────────────────────
// Stage events
// ─────────────────────────────────────────────

export const AgentStageSchema = z.enum([
  "vibe.lookup",
  "fact.check",
  "logic.detect",
  "vibe.rewrite",
  "evaluator.score",
  "vibe.finalize",
  "refine.rewrite",
]);
export type AgentStage = z.infer<typeof AgentStageSchema>;

export const AgentProgressEvtSchema = z.object({
  request_id: z.string().min(1),
  stage: AgentStageSchema,
  label: z.string().optional(),
});
export type AgentProgressEvt = z.infer<typeof AgentProgressEvtSchema>;

export const AgentResultEvtSchema = z.object({
  request_id: z.string().min(1),
  payload: AgentResultPayloadSchema,
});
export type AgentResultEvt = z.infer<typeof AgentResultEvtSchema>;

export const AgentErrorEvtSchema = z.object({
  request_id: z.string().min(1),
  error: AppErrorSchema,
});
export type AgentErrorEvt = z.infer<typeof AgentErrorEvtSchema>;

// ─────────────────────────────────────────────
// Refinement session memory (main-side, not over IPC)
// ─────────────────────────────────────────────

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;
