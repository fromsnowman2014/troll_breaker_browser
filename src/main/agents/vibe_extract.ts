// Vibe extraction: given HTML + a SiteExtractorSpec, pull best posts with
// cheerio and ask the LLM (via structuredChat) to synthesize a fresh
// VibeProfile.

import { load as loadHtml } from "cheerio";
import type { LlmClient } from "../lib/llm/types.js";
import type { SiteExtractorSpec } from "../shared/schemas/extractors.js";
import { VibeProfileSchema } from "../shared/schemas/agents.js";
import type { VibeProfile } from "../shared/schemas/agents.js";
import { structuredChat } from "../lib/llm/structured.js";

export interface ExtractedPost {
  title: string;
  body: string;
  author?: string;
}

export function extractPostsFromHtml(
  html: string,
  spec: SiteExtractorSpec,
): ExtractedPost[] {
  const $ = loadHtml(html);
  const posts: ExtractedPost[] = [];
  $(spec.post_selector).each((_i, el) => {
    if (posts.length >= spec.max_posts) return false;
    const $el = $(el);
    const title = $el.find(spec.title_selector).first().text().trim();
    const body = $el.find(spec.body_selector).first().text().trim();
    if (!title) return;
    const post: ExtractedPost = { title, body: body || title };
    if (spec.author_selector) {
      const author = $el.find(spec.author_selector).first().text().trim();
      if (author) post.author = author;
    }
    posts.push(post);
    return;
  });
  return posts;
}

export interface SynthesizeOpts {
  llm: LlmClient;
  model: string;
  spec: SiteExtractorSpec;
  posts: ExtractedPost[];
  signal?: AbortSignal;
}

export async function synthesizeVibe(opts: SynthesizeOpts): Promise<VibeProfile> {
  if (opts.posts.length === 0) {
    throw new Error("no posts to synthesize from");
  }
  const postsContext = opts.posts
    .map(
      (p, i) =>
        `[${i + 1}] ${p.title}\n${p.body.slice(0, 300)}${p.author ? `\n— ${p.author}` : ""}`,
    )
    .join("\n\n");

  const system =
    "You analyze the writing style of an online Korean community and produce a VibeProfile. " +
    "Read the sample posts and emit a profile that captures lexicon, sentence shape, " +
    "and tonality. The few_shot_posts must be representative posts (you may lightly " +
    "edit for clarity but preserve voice). source=\"sampled\".";

  const seed = await structuredChat<VibeProfile>(
    opts.llm,
    VibeProfileSchema,
    {
      model: opts.model,
      temperature: 0.3,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Site: ${opts.spec.display_name} (${opts.spec.site_id})\n\n` +
            `Sample posts:\n\n${postsContext}\n\n` +
            `Emit a VibeProfile. site_id="${opts.spec.site_id}", display_name="${opts.spec.display_name}", source="sampled", last_refreshed="${new Date().toISOString()}".`,
        },
      ],
      ...(opts.signal && { signal: opts.signal }),
    },
  );
  // Hard-set fields we already know to prevent LLM drift.
  return {
    ...seed,
    site_id: opts.spec.site_id,
    display_name: opts.spec.display_name,
    source: "sampled",
    last_refreshed: new Date().toISOString(),
  };
}
