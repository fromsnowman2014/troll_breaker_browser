import { describe, expect, it } from "vitest";
import { urlToSiteId, getSiteVibe } from "../src/main/agents/vibe.js";
import { InMemoryKv } from "../src/main/lib/storage/memory.js";

describe("urlToSiteId", () => {
  const cases: [string, string][] = [
    ["https://www.fmkorea.com/best", "fmkorea"],
    ["https://fmkorea.com/best", "fmkorea"],
    ["https://theqoo.net/abc", "theqoo"],
    ["https://news.naver.com/article", "naver"],
    ["https://best.fmkorea.com/something", "fmkorea"],
    ["about:blank", "blank"],
    ["", "blank"],
    ["not a url", "unknown"],
  ];
  for (const [url, expected] of cases) {
    it(`${url} → ${expected}`, () => {
      expect(urlToSiteId(url)).toBe(expected);
    });
  }
});

describe("getSiteVibe", () => {
  it("returns bundled seed for fmkorea on first call", async () => {
    const kv = new InMemoryKv();
    const v = await getSiteVibe({ kv, url: "https://www.fmkorea.com/best" });
    expect(v.site_id).toBe("fmkorea");
    expect(v.source).toBe("seed");
    expect(v.few_shot_posts.length).toBeGreaterThanOrEqual(2);
  });

  it("returns generic fallback for unknown site (not cached)", async () => {
    const kv = new InMemoryKv();
    const v = await getSiteVibe({ kv, url: "https://nosuchsite.example.com/" });
    expect(v.source).toBe("fallback");
    expect(v.site_id).toBe("example");
    // Fallback is NOT cached so a future seed addition isn't masked.
    const cached = await kv.get("vibe:example");
    expect(cached).toBeNull();
  });

  it("caches seed reads", async () => {
    const kv = new InMemoryKv();
    await getSiteVibe({ kv, url: "https://fmkorea.com/best" });
    const cached = await kv.get("vibe:fmkorea");
    expect(cached).toBeTruthy();
  });
});
