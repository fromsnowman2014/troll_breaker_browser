// vibe_refresh uses fetch_page internally. fetch_page imports `electron` so
// we need to mock both. We provide a mock LLM that returns a structured
// VibeProfile when called.

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({ net: {}, session: {} }));
vi.mock("../src/main/agents/fetch_page.js", () => ({
  fetchPage: vi.fn(async () => "<html><body>fixture</body></html>"),
}));
vi.mock("../src/main/agents/vibe_extract.js", () => ({
  extractPostsFromHtml: vi.fn(() => [
    { title: "p1", body: "b1" },
    { title: "p2", body: "b2" },
  ]),
  synthesizeVibe: vi.fn(async ({ spec }: { spec: { site_id: string; display_name: string } }) => ({
    site_id: spec.site_id,
    display_name: spec.display_name,
    source: "sampled" as const,
    last_refreshed: new Date().toISOString(),
    lexicon: ["x"],
    sentence_shape: "y",
    tonality: "z",
    few_shot_posts: [{ text: "1" }, { text: "2" }],
  })),
}));

import {
  refreshIfStale,
  STALE_THRESHOLD_MS,
  clearInFlight,
} from "../src/main/agents/vibe_refresh.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";
import { MockLlmClient } from "../src/main/lib/llm/mock.js";

beforeEach(() => {
  clearInFlight();
});

describe("refreshIfStale", () => {
  it("returns null for unknown sites (no extractor)", async () => {
    const kv = new InMemoryKv();
    const llm = new MockLlmClient();
    const r = await refreshIfStale({
      kv,
      llm,
      model: "x",
      url: "https://nosuchsite.example.com",
    });
    expect(r).toBeNull();
  });

  it("returns null when cache is fresh", async () => {
    const kv = new InMemoryKv();
    await kv.set("vibe:fmkorea", {
      site_id: "fmkorea",
      display_name: "에펨코리아",
      source: "seed",
      last_refreshed: new Date().toISOString(),
      lexicon: [],
      sentence_shape: "",
      tonality: "",
      few_shot_posts: [{ text: "1" }, { text: "2" }],
    });
    const r = await refreshIfStale({
      kv,
      llm: new MockLlmClient(),
      model: "x",
      url: "https://www.fmkorea.com/best",
    });
    expect(r).toBeNull();
  });

  it("refreshes when cache is stale", async () => {
    const kv = new InMemoryKv();
    const oldTime = new Date(Date.now() - STALE_THRESHOLD_MS - 1000).toISOString();
    await kv.set("vibe:fmkorea", {
      site_id: "fmkorea",
      display_name: "에펨코리아",
      source: "seed",
      last_refreshed: oldTime,
      lexicon: [],
      sentence_shape: "",
      tonality: "",
      few_shot_posts: [{ text: "1" }, { text: "2" }],
    });
    const r = await refreshIfStale({
      kv,
      llm: new MockLlmClient(),
      model: "x",
      url: "https://www.fmkorea.com/best",
    });
    expect(r).not.toBeNull();
    expect(r?.source).toBe("sampled");
    // Cache should be updated
    const cached = await kv.get<{ source: string }>("vibe:fmkorea");
    expect(cached?.source).toBe("sampled");
  });

  it("dedupes concurrent calls per site", async () => {
    const kv = new InMemoryKv();
    const oldTime = new Date(Date.now() - STALE_THRESHOLD_MS - 1000).toISOString();
    await kv.set("vibe:fmkorea", {
      site_id: "fmkorea",
      display_name: "에펨코리아",
      source: "seed",
      last_refreshed: oldTime,
      lexicon: [],
      sentence_shape: "",
      tonality: "",
      few_shot_posts: [{ text: "1" }, { text: "2" }],
    });
    const llm = new MockLlmClient();
    const [a, b] = await Promise.all([
      refreshIfStale({ kv, llm, model: "x", url: "https://www.fmkorea.com/best" }),
      refreshIfStale({ kv, llm, model: "x", url: "https://www.fmkorea.com/best" }),
    ]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });
});
