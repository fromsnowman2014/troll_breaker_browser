// Background vibe refresh — when the cached VibeProfile for a site is older
// than the stale threshold, fetch best posts + extract + re-synthesize +
// cache. Idempotent: site_id has at most one in-flight refresh at a time
// (subsequent callers await the same Promise).

import type { KvStore } from "../lib/storage/kv.js";
import type { LlmClient } from "../lib/llm/types.js";
import type { VibeProfile } from "../shared/schemas/agents.js";
import { VibeProfileSchema } from "../shared/schemas/agents.js";
import { getExtractor } from "./extractors/index.js";
import { fetchPage } from "./fetch_page.js";
import { extractPostsFromHtml, synthesizeVibe } from "./vibe_extract.js";
import { urlToSiteId } from "./_util.js";
import { VIBE_TTL_MS } from "./vibe.js";

export const STALE_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

const inFlight = new Map<string, Promise<VibeProfile | null>>();

interface RefreshOpts {
  kv: KvStore;
  llm: LlmClient;
  model: string;
  url: string;
  /** Override the stale threshold (for tests). */
  staleMs?: number;
  signal?: AbortSignal;
}

/**
 * Returns the cached VibeProfile, or null if no refresh needed.
 * Fires off a refresh in the background if the cache is stale.
 */
export async function refreshIfStale(opts: RefreshOpts): Promise<VibeProfile | null> {
  const site_id = urlToSiteId(opts.url);
  const spec = getExtractor(site_id);
  if (!spec) return null;

  const cached = await opts.kv.get<unknown>(`vibe:${site_id}`);
  const stale = isStale(cached, opts.staleMs ?? STALE_THRESHOLD_MS);
  if (!stale) return null;

  // Dedup concurrent refreshes per site.
  const existing = inFlight.get(site_id);
  if (existing) return existing;

  const p = (async (): Promise<VibeProfile | null> => {
    try {
      const html = await fetchPage(spec.best_posts_url, {
        ...(opts.signal && { signal: opts.signal }),
      });
      const posts = extractPostsFromHtml(html, spec);
      if (posts.length === 0) return null;
      const vibe = await synthesizeVibe({
        llm: opts.llm,
        model: opts.model,
        spec,
        posts,
        ...(opts.signal && { signal: opts.signal }),
      });
      await opts.kv.set(`vibe:${site_id}`, vibe, VIBE_TTL_MS);
      return vibe;
    } catch {
      return null;
    } finally {
      inFlight.delete(site_id);
    }
  })();

  inFlight.set(site_id, p);
  return p;
}

function isStale(cached: unknown, thresholdMs: number): boolean {
  if (!cached) return true;
  const parsed = VibeProfileSchema.safeParse(cached);
  if (!parsed.success) return true;
  const refreshedAt = Date.parse(parsed.data.last_refreshed);
  if (!Number.isFinite(refreshedAt)) return true;
  return Date.now() - refreshedAt > thresholdMs;
}

/** For tests. */
export function clearInFlight(): void {
  inFlight.clear();
}
