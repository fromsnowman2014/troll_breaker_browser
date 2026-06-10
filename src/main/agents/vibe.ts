// Vibe agent — getSiteVibe (cache → seed → fallback) + rewriteInVibe.
//
// `rewriteInVibe` takes a neutral source text (fact summary, or attack draft
// rewrite) and asks the LLM to render it in the site's tone. Returns a plain
// string (not structured — the entire response IS the rewritten text).

import type { KvStore } from "../lib/storage/kv.js";
import type { LlmClient } from "../lib/llm/types.js";
import type { VibeProfile, ChatTurn } from "../shared/schemas/agents.js";
import { VibeProfileSchema } from "../shared/schemas/agents.js";
import { loadSeed } from "./seeds_loader.js";
import { GENERIC_KOREAN_CYNICAL } from "./_vibe_fallback.js";
import { urlToSiteId } from "./_util.js";

export const VIBE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export { urlToSiteId };

export async function getSiteVibe(opts: {
  kv: KvStore;
  url: string;
}): Promise<VibeProfile> {
  const site_id = urlToSiteId(opts.url);
  // 1. Cache
  const cached = await opts.kv.get<unknown>(`vibe:${site_id}`);
  if (cached) {
    const parsed = VibeProfileSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
  }
  // 2. Bundled seed
  const seed = loadSeed(site_id);
  if (seed) {
    await opts.kv.set(`vibe:${site_id}`, seed, VIBE_TTL_MS);
    return seed;
  }
  // 3. Generic fallback (do not cache — it would mask later seed additions)
  return { ...GENERIC_KOREAN_CYNICAL, site_id };
}

// Forward declaration; the orchestrator wires this with the real refresh fn
// from vibe_refresh.ts. We use a registry pattern instead of a static or
// dynamic import to keep tests that don't touch the orchestrator from
// dragging in the full extractor/cheerio chain.
type RefreshFn = (opts: {
  kv: KvStore;
  llm: LlmClient;
  model: string;
  url: string;
}) => Promise<unknown>;

let refreshImpl: RefreshFn | null = null;

export function registerVibeRefresh(impl: RefreshFn): void {
  refreshImpl = impl;
}

/**
 * Best-effort: trigger a background refresh when the cached vibe is stale.
 * Caller does NOT await; the refresh updates the cache for the next call.
 * Safe to call on every navigation — refreshIfStale dedupes per site_id.
 */
export function maybeRefreshSiteVibe(opts: {
  kv: KvStore;
  llm: LlmClient;
  model: string;
  url: string;
}): void {
  if (!refreshImpl) return;
  void refreshImpl(opts).catch(() => undefined);
}

interface RewriteOpts {
  llm: LlmClient;
  model: string;
  vibe: VibeProfile;
  /** The neutral text to rewrite (fact summary, attack draft, etc.). */
  source_text: string;
  /** Optional additional instruction (e.g., "더 짧게" for refinement). */
  instruction?: string;
  /** Optional refinement conversation history. */
  conversation?: ChatTurn[];
  signal?: AbortSignal;
}

export async function rewriteInVibe(opts: RewriteOpts): Promise<string> {
  const system = buildSystemPrompt(opts.vibe);
  const conv = opts.conversation ?? [];
  const userMsg =
    `다음 내용을 위 사이트의 톤으로 다시 써. 정보는 유지하되 문체·종결어미·어휘는 사이트 분위기에 맞춰.\n\n` +
    `--- 원문 ---\n${opts.source_text}\n--- 끝 ---` +
    (opts.instruction ? `\n\n추가 지시: ${opts.instruction}` : "");

  const resp = await opts.llm.chat({
    model: opts.model,
    temperature: 0.7,
    max_tokens: 1024,
    messages: [
      { role: "system", content: system },
      ...conv.map((t) => ({ role: t.role, content: t.content }) as const),
      { role: "user", content: userMsg },
    ],
    ...(opts.signal && { signal: opts.signal }),
  });
  return resp.content.trim();
}

/**
 * Finalize a concept post — given the evaluator's draft + axes, polish into
 * the final community-ready version. Returns plain text.
 */
export async function finalizeConceptPost(opts: {
  llm: LlmClient;
  model: string;
  vibe: VibeProfile;
  evaluator_draft: string;
  axes: { cynicism: number; fact: number; punchline: number; vibe: number };
  signal?: AbortSignal;
}): Promise<string> {
  const weakest = (Object.entries(opts.axes) as Array<[string, number]>).sort(
    (a, b) => a[1] - b[1],
  )[0]!;
  const fewShots = opts.vibe.few_shot_posts.map((p) => `- ${p.text}`).join("\n");
  const system = `You polish concept posts for "${opts.vibe.display_name}".

Site lexicon: ${opts.vibe.lexicon.join(", ")}
Sentence shape: ${opts.vibe.sentence_shape}
Tone: ${opts.vibe.tonality}

Examples:
${fewShots}

Rules:
- The post must read like one of the examples, not like generic Korean.
- Strengthen the weakest axis: ${weakest[0]} (currently ${weakest[1]}/10).
- Keep the original claim/intent intact.
- Korean only. No code blocks. Plain text.`;

  const resp = await opts.llm.chat({
    model: opts.model,
    temperature: 0.8,
    max_tokens: 1024,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          `현재 초안:\n${opts.evaluator_draft}\n\n` +
          `위 초안을 사이트 톤에 맞춰 마지막으로 다듬어. 길이는 비슷하게 유지.`,
      },
    ],
    ...(opts.signal && { signal: opts.signal }),
  });
  return resp.content.trim();
}

function buildSystemPrompt(vibe: VibeProfile): string {
  const fewShots = vibe.few_shot_posts
    .map((p, i) => `예시 ${i + 1}: ${p.text}${p.notes ? `  (${p.notes})` : ""}`)
    .join("\n");
  return `당신은 "${vibe.display_name}" 커뮤니티의 한국어 글쓰기 어시스턴트야.

# 사이트 톤
${vibe.tonality}

# 문장 형태
${vibe.sentence_shape}

# 자주 쓰는 표현
${vibe.lexicon.join(", ")}

# 글쓰기 예시
${fewShots}

# 규칙
- 위 예시의 톤·문체·종결어미·어휘를 그대로 따라.
- 사실 정보는 유지하되, 표현 방식만 사이트 톤에 맞춤.
- 출처를 인용할 때는 짧게 (예: "출처는 ㅇㅇ뉴스 기사").
- 과한 분노나 욕설은 피해.
- 한국어로만 답변.`;
}
