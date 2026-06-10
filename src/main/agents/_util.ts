// Shared agent utilities — timeout wrappers, hashing, URL → site_id mapping.

import { createHash } from "node:crypto";

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * Promise.race with timeout. The timeout side rejects with an Error("timeout").
 * If signal is provided, aborting it also rejects with Error("cancelled").
 */
export function withTimeout<T>(p: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      reject(new Error("cancelled"));
    };
    if (signal?.aborted) {
      reject(new Error("cancelled"));
      return;
    }
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("timeout"));
    }, ms);
    p.then(
      (v) => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

/**
 * Hostname → vibe site_id. Strips "www.", drops TLD when host has ≥2 labels
 * and the second-level looks "site-like" (best-effort heuristic).
 *
 * Examples:
 *   https://www.fmkorea.com/best → "fmkorea"
 *   https://theqoo.net/abc → "theqoo"
 *   https://news.naver.com/article → "naver"
 *   about:blank → "blank"
 */
export function urlToSiteId(url: string): string {
  if (url === "about:blank" || url === "") return "blank";
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "unknown";
  }
  if (!host) return "unknown";
  host = host.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".");
  if (labels.length === 0) return host;
  // Strategy: pick the most meaningful label.
  //   - 2 labels (foo.com)        → "foo"
  //   - 3+ labels (news.naver.com) → second-to-last if it's not a common TLD
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return labels[0]!;
  // For news.naver.com, prefer "naver" over "news".
  // For best.fmkorea.com, prefer "fmkorea" over "best".
  return labels[labels.length - 2]!;
}
