// Registry of per-site DOM extractors.

import type { SiteExtractorSpec } from "../../shared/schemas/extractors.js";
import { FMKOREA } from "./fmkorea.js";
import { THEQOO } from "./theqoo.js";
import { RULIWEB } from "./ruliweb.js";
import { DCINSIDE } from "./dcinside.js";

const EXTRACTORS: SiteExtractorSpec[] = [FMKOREA, THEQOO, RULIWEB, DCINSIDE];

export function getExtractor(site_id: string): SiteExtractorSpec | null {
  return EXTRACTORS.find((e) => e.site_id === site_id) ?? null;
}

export function listExtractors(): readonly SiteExtractorSpec[] {
  return EXTRACTORS;
}

export { FMKOREA, THEQOO, RULIWEB, DCINSIDE };
