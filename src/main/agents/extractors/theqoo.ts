import type { SiteExtractorSpec } from "../../shared/schemas/extractors.js";

export const THEQOO: SiteExtractorSpec = {
  site_id: "theqoo",
  display_name: "더쿠",
  best_posts_url: "https://theqoo.net/hot",
  post_selector: "table.bd_lst tbody tr",
  title_selector: "td.title a",
  body_selector: "td.title a",
  author_selector: "td.author",
  max_posts: 5,
};
