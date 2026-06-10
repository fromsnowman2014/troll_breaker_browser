import type { SiteExtractorSpec } from "../../shared/schemas/extractors.js";

export const DCINSIDE: SiteExtractorSpec = {
  site_id: "dcinside",
  display_name: "디시인사이드",
  best_posts_url: "https://gall.dcinside.com/board/lists/?id=dcbest",
  post_selector: ".gall_list tbody tr.us-post",
  title_selector: ".gall_tit a",
  body_selector: ".gall_tit a",
  author_selector: ".gall_writer .nickname",
  max_posts: 5,
};
