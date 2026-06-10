import type { SiteExtractorSpec } from "../../shared/schemas/extractors.js";

export const FMKOREA: SiteExtractorSpec = {
  site_id: "fmkorea",
  display_name: "에펨코리아",
  best_posts_url: "https://www.fmkorea.com/best",
  // Each row in the popular list. Conservative selectors that survive minor
  // template tweaks.
  post_selector: ".fm_best_widget li, ul.bd_lst > li",
  title_selector: ".title, a.hx",
  body_selector: ".hotdeal_var8, .li_root",
  author_selector: ".author, .member",
  max_posts: 5,
};
