// Brave Search API adapter — fetch-based.
// API: https://api.search.brave.com/res/v1/web/search
// Header: X-Subscription-Token: <api_key>
// HTTPS-only filter; capped result count.

import type { SearchClient, SearchSource } from "./types.js";
import { makeError, IpcError } from "../../shared/errors.js";

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string; // human-readable; not parsed
  page_age?: string;
  meta_url?: { hostname?: string; netloc?: string };
  profile?: { name?: string; long_name?: string };
}

interface BraveResponseBody {
  web?: { results?: BraveWebResult[] };
}

export interface BraveOpts {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

export class BraveSearch implements SearchClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(opts: BraveOpts) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.endpoint = opts.endpoint ?? ENDPOINT;
  }

  async searchWeb(query: string, max = 6): Promise<SearchSource[]> {
    if (!this.apiKey) {
      throw new IpcError(makeError("no_api_key", "Brave Search API key missing"));
    }
    const params = new URLSearchParams({
      q: query,
      count: String(Math.max(1, Math.min(max, 20))),
      safesearch: "moderate",
    });
    const url = `${this.endpoint}?${params.toString()}`;

    let resp: Response;
    try {
      resp = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Subscription-Token": this.apiKey,
        },
      });
    } catch (err) {
      throw new IpcError(
        makeError("search_unreachable", `Network error: ${(err as Error).message}`),
      );
    }

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new IpcError(makeError("no_api_key", "Brave API key rejected"));
      }
      throw new IpcError(makeError("search_unreachable", `HTTP ${resp.status}`));
    }

    let json: BraveResponseBody;
    try {
      json = (await resp.json()) as BraveResponseBody;
    } catch {
      throw new IpcError(makeError("search_unreachable", "Bad JSON from Brave"));
    }

    const results = json.web?.results ?? [];
    const sources: SearchSource[] = [];
    for (const r of results) {
      if (!r.url || !r.title) continue;
      if (!r.url.startsWith("https://")) continue;
      const src: SearchSource = {
        title: r.title,
        url: r.url,
        snippet: r.description ?? "",
      };
      const publisher = r.profile?.long_name ?? r.profile?.name ?? r.meta_url?.hostname;
      if (publisher) src.publisher = publisher;
      if (r.page_age) src.published_at = r.page_age;
      sources.push(src);
      if (sources.length >= max) break;
    }
    return sources;
  }
}
