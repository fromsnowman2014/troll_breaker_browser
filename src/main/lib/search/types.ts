export interface SearchSource {
  title: string;
  url: string;
  publisher?: string;
  published_at?: string;
  snippet: string;
}

export interface SearchClient {
  searchWeb(query: string, max?: number): Promise<SearchSource[]>;
}
