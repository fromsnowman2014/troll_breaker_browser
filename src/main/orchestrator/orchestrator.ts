// Pipeline entry points — runDefense / runAttack / runRefine.
//
// Phase 1: Defense Fast
// Phase 2: Attack Fast + Refine + session memory
// Phase 3: Defense Standard (fact + logic in parallel)

import type {
  DefenseRequest,
  AttackRequest,
  RefineRequest,
} from "../shared/schemas/ipc.js";
import type {
  ShieldResult,
  SwordResult,
  RefineResult,
  AgentStage,
  Pipeline,
} from "../shared/schemas/agents.js";
import {
  getSiteVibe,
  rewriteInVibe,
  finalizeConceptPost,
  maybeRefreshSiteVibe,
} from "../agents/vibe.js";
import { verifyFactWithLinks } from "../agents/fact.js";
import { scoreAndCritique } from "../agents/evaluator.js";
import { detectFallacies } from "../agents/logic.js";
import type { AgentDeps } from "./deps.js";
import {
  recordSession,
  getSession,
  pushRefinement,
  detectRetrigger,
} from "./session.js";
import { makeError, IpcError } from "../shared/errors.js";

export interface ProgressSink {
  stage(stage: AgentStage, label?: string): void;
  readonly signal: AbortSignal;
}

export function pickPipeline(text: string, hint?: Pipeline): Pipeline {
  if (hint) return hint;
  return text.length > 500 ? "standard" : "fast";
}

const STAGE_LABELS: Record<AgentStage, string> = {
  "vibe.lookup": "사이트 분위기 파악 중…",
  "fact.check": "사실 확인 중…",
  "logic.detect": "논리 점검 중…",
  "vibe.rewrite": "톤 적용 중…",
  "evaluator.score": "점수 매기는 중…",
  "vibe.finalize": "최종 글 다듬는 중…",
  "refine.rewrite": "다시 쓰는 중…",
};

export function stageLabel(stage: AgentStage): string {
  return STAGE_LABELS[stage];
}

import type { Fallacy } from "../shared/schemas/agents.js";
const emptyFallacies: Fallacy[] = [];

const VERDICT_KR: Record<"true" | "false" | "mixed" | "unverifiable", string> = {
  true: "사실",
  false: "거짓",
  mixed: "부분적 사실",
  unverifiable: "확인 불가",
};

export async function runDefense(
  req: DefenseRequest,
  deps: AgentDeps,
  sink: ProgressSink,
  request_id: string,
): Promise<ShieldResult> {
  const pipeline = pickPipeline(req.claim, req.pipeline_hint);

  sink.stage("vibe.lookup");
  const vibe = await getSiteVibe({ kv: deps.kv, url: req.page_url });
  maybeRefreshSiteVibe({ kv: deps.kv, llm: deps.llm, model: deps.model, url: req.page_url });

  // Fast: fact only. Standard: fact + logic in parallel. Deep: same as
  // Standard for now (Phase 5 will revisit).
  const runLogic = pipeline !== "fast";

  if (runLogic) sink.stage("logic.detect");
  if (!runLogic) sink.stage("fact.check");

  const factPromise = verifyFactWithLinks({
    llm: deps.llm,
    model: deps.model,
    search: deps.search,
    kv: deps.kv,
    claim: req.claim,
    locale: "ko",
    signal: sink.signal,
  });

  let fallaciesPromise: Promise<typeof emptyFallacies> = Promise.resolve(emptyFallacies);
  if (runLogic) {
    fallaciesPromise = detectFallacies({
      llm: deps.llm,
      model: deps.model,
      claim: req.claim,
      vibe,
      ...(sink.signal && { signal: sink.signal }),
    });
  }

  const [fact, fallacies] = await Promise.all([factPromise, fallaciesPromise]);
  // After parallel finishes, emit the missing stage for UI clarity.
  if (runLogic) sink.stage("fact.check");

  sink.stage("vibe.rewrite");
  const sourceText =
    `주장: ${req.claim}\n` +
    `판정: ${VERDICT_KR[fact.verdict]}\n` +
    `근거: ${fact.summary}` +
    (fact.sources.length > 0
      ? `\n출처: ${fact.sources.map((s) => s.publisher ?? s.url).join(", ")}`
      : "") +
    (fallacies.length > 0
      ? `\n오류 ${fallacies.length}건 검출`
      : "");

  const vibeAdjusted = await rewriteInVibe({
    llm: deps.llm,
    model: deps.model,
    vibe,
    source_text: sourceText,
    ...(sink.signal && { signal: sink.signal }),
  });

  const result: ShieldResult = {
    kind: "shield",
    request_id,
    pipeline,
    vibe_used: vibe,
    claim_excerpt: req.claim.slice(0, 200),
    fact,
    fallacies,
    vibe_adjusted_summary: vibeAdjusted,
    generated_at: new Date().toISOString(),
  };

  recordSession(request_id, {
    kind: "defense",
    page_url: req.page_url,
    base_result: result,
    conversation: [],
    current_text: vibeAdjusted,
    history: [],
  });

  return result;
}

export async function runAttack(
  req: AttackRequest,
  deps: AgentDeps,
  sink: ProgressSink,
  request_id: string,
): Promise<SwordResult> {
  const pipeline: Pipeline = "fast";

  sink.stage("vibe.lookup");
  const vibe = await getSiteVibe({ kv: deps.kv, url: req.page_url });
  maybeRefreshSiteVibe({ kv: deps.kv, llm: deps.llm, model: deps.model, url: req.page_url });

  sink.stage("evaluator.score");
  const score = await scoreAndCritique({
    llm: deps.llm,
    model: deps.model,
    draft: req.draft,
    vibe,
    ...(sink.signal && { signal: sink.signal }),
  });

  sink.stage("vibe.finalize");
  const finalPost = await finalizeConceptPost({
    llm: deps.llm,
    model: deps.model,
    vibe,
    evaluator_draft: score.final_post,
    axes: score.axes,
    ...(sink.signal && { signal: sink.signal }),
  });

  const finalizedScore = { ...score, final_post: finalPost };

  const result: SwordResult = {
    kind: "sword",
    request_id,
    pipeline,
    vibe_used: vibe,
    draft_excerpt: req.draft.slice(0, 200),
    score: finalizedScore,
    generated_at: new Date().toISOString(),
  };

  recordSession(request_id, {
    kind: "attack",
    page_url: req.page_url,
    base_result: result,
    conversation: [],
    current_text: finalPost,
    history: [],
  });

  return result;
}

export async function runRefine(
  req: RefineRequest,
  deps: AgentDeps,
  sink: ProgressSink,
  request_id: string,
): Promise<RefineResult> {
  const session = getSession(req.prior_request_id);
  if (!session) {
    throw new IpcError(makeError("unknown", "Refine session not found"));
  }

  // Phase 2: just do a single rewrite. Phase 3 will re-run fact / score
  // when detectRetrigger matches.
  void detectRetrigger(req.instruction);

  sink.stage("refine.rewrite");
  const vibe = session.base_result.vibe_used;
  const refined = await rewriteInVibe({
    llm: deps.llm,
    model: deps.model,
    vibe,
    source_text: session.current_text,
    instruction: req.instruction,
    conversation: session.conversation.slice(-6),
    ...(sink.signal && { signal: sink.signal }),
  });

  pushRefinement(req.prior_request_id, refined, req.instruction);

  const result: RefineResult = {
    kind: "refine",
    request_id,
    prior_request_id: req.prior_request_id,
    refined_text: refined,
    generated_at: new Date().toISOString(),
  };
  return result;
}
