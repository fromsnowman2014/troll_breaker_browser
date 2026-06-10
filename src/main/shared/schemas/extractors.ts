// Per-site DOM extractor specs (Phase 4).
// Each entry tells fetch_page where to GET the site's "best posts" listing
// and what CSS selectors to use to pull out title/body/etc.

import { z } from "zod";

export const SiteExtractorSpecSchema = z.object({
  site_id: z.string().min(1),
  display_name: z.string(),
  // URL pattern to fetch best/popular posts on the site (cookie-aware)
  best_posts_url: z.string().url(),
  // CSS selector for each post wrapper element
  post_selector: z.string(),
  // CSS selector relative to post_selector for the post title
  title_selector: z.string(),
  // CSS selector relative to post_selector for the post body / preview
  body_selector: z.string(),
  // Optional selectors
  author_selector: z.string().optional(),
  score_selector: z.string().optional(),
  // Cap on posts to extract per refresh
  max_posts: z.number().int().positive().default(5),
});
export type SiteExtractorSpec = z.infer<typeof SiteExtractorSpecSchema>;
