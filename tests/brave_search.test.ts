import { describe, expect, it, vi } from "vitest";
import { BraveSearch } from "../src/main/lib/search/brave.js";

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BraveSearch", () => {
  it("sends correct headers + query", async () => {
    const fetchImpl = vi.fn(async () => jsonResp({ web: { results: [] } })) as unknown as typeof fetch;
    const s = new BraveSearch({ apiKey: "key123", fetchImpl });
    await s.searchWeb("hello world", 3);
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
    const url = String(calls[0]?.[0]);
    expect(url).toContain("q=hello+world");
    expect(url).toContain("count=3");
    const init = calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Subscription-Token"]).toBe("key123");
  });

  it("filters out non-HTTPS results", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        web: {
          results: [
            { title: "ok", url: "https://example.com", description: "s" },
            { title: "bad", url: "http://insecure.com", description: "s" },
            { title: "ok2", url: "https://other.com", description: "s" },
          ],
        },
      }),
    ) as unknown as typeof fetch;
    const s = new BraveSearch({ apiKey: "k", fetchImpl });
    const out = await s.searchWeb("x", 5);
    expect(out.map((r) => r.url)).toEqual([
      "https://example.com",
      "https://other.com",
    ]);
  });

  it("caps result count at max param", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResp({
        web: {
          results: Array.from({ length: 10 }, (_, i) => ({
            title: `r${i}`,
            url: `https://x${i}.com`,
            description: "",
          })),
        },
      }),
    ) as unknown as typeof fetch;
    const s = new BraveSearch({ apiKey: "k", fetchImpl });
    const out = await s.searchWeb("x", 4);
    expect(out).toHaveLength(4);
  });

  it("401 throws no_api_key", async () => {
    const fetchImpl = vi.fn(async () => jsonResp({}, 401)) as unknown as typeof fetch;
    const s = new BraveSearch({ apiKey: "k", fetchImpl });
    await expect(s.searchWeb("x")).rejects.toThrow();
  });

  it("missing key throws", async () => {
    const s = new BraveSearch({ apiKey: "" });
    await expect(s.searchWeb("x")).rejects.toThrow(/missing/);
  });
});
