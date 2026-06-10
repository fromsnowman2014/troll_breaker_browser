// STUB — Brave Search adapter. Implemented in Phase 1.

import type { SearchClient, SearchSource } from "./types.js";

export class BraveSearch implements SearchClient {
  constructor(_opts: { apiKey: string }) {
    // No-op in Phase 0.
  }

  searchWeb(_query: string, _max?: number): Promise<SearchSource[]> {
    throw new Error("BraveSearch.searchWeb — not implemented in Phase 0");
  }
}
