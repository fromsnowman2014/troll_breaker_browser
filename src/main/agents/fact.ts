// Fact agent — verifyFactWithLinks(claim) → FactResult.
//
// Flow:
//   1. Cache hit (fact:<sha256>) → return.
//   2. search.searchWeb(claim, 6) → SearchSource[]
//   3. structuredChat(FactResultSchema, ...) with the search results as
//      context → FactResult (verdict + summary + filtered sources).
//   4. Cache for 24h.

import type { KvStore } from "../lib/storage/kv.js";
import type { LlmClient } from "../lib/llm/types.js";
import type { SearchClient } from "../lib/search/types.js";
import type { FactResult } from "../shared/schemas/agents.js";
import { FactResultSchema } from "../shared/schemas/agents.js";
import { structuredChat } from "../lib/llm/structured.js";
import { sha256 } from "./_util.js";

export const FACT_TTL_MS = 24 * 60 * 60 * 1000;

interface VerifyOpts {
  llm: LlmClient;
  model: string;
  search: SearchClient;
  kv: KvStore;
  claim: string;
  locale?: string;
  signal?: AbortSignal;
}

export async function verifyFactWithLinks(opts: VerifyOpts): Promise<FactResult> {
  const locale = opts.locale ?? "ko";
  const key = `fact:${sha256(`${opts.claim}|${locale}`)}`;
  const cached = await opts.kv.get<unknown>(key);
  if (cached) {
    const parsed = FactResultSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
  }

  // Search the web
  let searchSources: Awaited<ReturnType<SearchClient["searchWeb"]>> = [];
  let searchFailed = false;
  try {
    searchSources = await opts.search.searchWeb(opts.claim, 6);
  } catch {
    // If search fails, we still try to render a result via the LLM (with
    // confidence dropped and verdict forced to unverifiable below).
    searchFailed = true;
  }

  const sourcesContext =
    searchSources.length === 0
      ? "(검색 결과 없음)"
      : searchSources
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title}\n    URL: ${s.url}\n    Publisher: ${
                s.publisher ?? "unknown"
              }\n    ${s.snippet}`,
          )
          .join("\n\n");

  const result = await structuredChat<FactResult>(
    opts.llm,
    FactResultSchema,
    {
      model: opts.model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous fact-checker. Given a claim and a list of search results, " +
            "return a structured FactResult. Rules:\n" +
            "- verdict ∈ {true, false, mixed, unverifiable}\n" +
            "- summary: 2-3 sentences in Korean, plain language, evidence-based\n" +
            "- sources: only include sources actually relevant; preserve their URL exactly\n" +
            "- confidence: 0.0–1.0 reflecting source quality + agreement\n" +
            "- needs_followup: true if sources are sparse or contradictory\n" +
            "- claim: echo the original claim verbatim",
        },
        {
          role: "user",
          content: `Claim:\n${opts.claim}\n\nLocale: ${locale}\n\nSearch results:\n${sourcesContext}`,
        },
      ],
      ...(opts.signal && { signal: opts.signal }),
    },
  );

  // If search failed entirely, force unverifiable.
  if (searchFailed && result.sources.length === 0) {
    result.verdict = "unverifiable";
    result.confidence = Math.min(result.confidence, 0.3);
    result.needs_followup = true;
  }

  await opts.kv.set(key, result, FACT_TTL_MS);
  return result;
}
