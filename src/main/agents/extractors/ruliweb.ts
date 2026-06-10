import type { SiteExtractorSpec } from "../../shared/schemas/extractors.js";

export const RULIWEB: SiteExtractorSpec = {
  site_id: "ruliweb",
  display_name: "루리웹",
  best_posts_url: "https://bbs.ruliweb.com/best",
  post_selector: "table.board_list_table tr.table_body",
  title_selector: "td.subject a.deco",
  body_selector: "td.subject a.deco",
  author_selector: "td.writer a",
  max_posts: 5,
};
