import type { SearchClient, SearchSource } from "./types.js";

export class MockSearch implements SearchClient {
  constructor(private readonly canned: SearchSource[] = []) {}

  async searchWeb(_query: string, _max?: number): Promise<SearchSource[]> {
    return this.canned;
  }
}
