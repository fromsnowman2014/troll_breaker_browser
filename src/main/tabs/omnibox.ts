// parseOmnibox(input) — decide whether the omnibox value is a URL or a search
// query. Heuristic from doc/BROWSER_CORE.md §3.2.
//
// In MVP the search engine is hard-coded to Google.

export type OmniboxResult =
  | { kind: "url"; url: string }
  | { kind: "search"; url: string }
  | { kind: "noop" };

const SCHEME_RE = /^[a-z][a-z0-9+.\-]*:\/\//i;
const ABOUT_RE = /^(about|file|chrome|edge|view-source):/i;
const HOSTNAME_RE = /^[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)*$/i;
const IPV4_RE = /^(\d{1,3})(\.\d{1,3}){3}$/;
const TLDS = new Set([
  "com",
  "net",
  "org",
  "io",
  "dev",
  "app",
  "ai",
  "co",
  "kr",
  "jp",
  "us",
  "uk",
  "de",
  "edu",
  "gov",
  "mil",
  "info",
  "biz",
  "me",
  "tv",
  "cc",
  "ws",
  "xyz",
  "tech",
  "online",
  "store",
  "site",
  "page",
  "fyi",
  "to",
  "im",
  "fm",
  "so",
  "is",
  "sh",
  "ly",
]);

function hasValidTld(host: string): boolean {
  const parts = host.split(".");
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (!tld) return false;
  return TLDS.has(tld.toLowerCase());
}

function looksLikeHostWithPort(input: string): boolean {
  // host:port pattern, e.g. localhost:3000 or fmkorea.com:8080
  const m = input.match(/^([a-z0-9][a-z0-9.\-]*):(\d{1,5})$/i);
  if (!m) return false;
  const port = Number(m[2]);
  return port > 0 && port <= 65535;
}

export function parseOmnibox(rawInput: string): OmniboxResult {
  const input = rawInput.trim();
  if (input.length === 0) return { kind: "noop" };

  if (ABOUT_RE.test(input)) return { kind: "url", url: input };

  if (SCHEME_RE.test(input)) return { kind: "url", url: input };

  if (input === "localhost" || input.startsWith("localhost:") || input.startsWith("localhost/")) {
    return { kind: "url", url: `http://${input}` };
  }

  if (looksLikeHostWithPort(input)) {
    return { kind: "url", url: `http://${input}` };
  }

  if (IPV4_RE.test(input.split("/")[0] ?? input)) {
    return { kind: "url", url: `http://${input}` };
  }

  // No whitespace, has a dot, and the TLD is in our small allow-list → treat as URL.
  if (!/\s/.test(input) && input.includes(".")) {
    const hostPart = input.split(/[/?#]/)[0] ?? input;
    if (HOSTNAME_RE.test(hostPart) && hasValidTld(hostPart)) {
      return { kind: "url", url: `https://${input}` };
    }
  }

  // Fallback: search via Google.
  const q = encodeURIComponent(input).replace(/%20/g, "+");
  return { kind: "search", url: `https://www.google.com/search?q=${q}` };
}
