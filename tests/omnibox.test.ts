import { describe, expect, it } from "vitest";
import { parseOmnibox } from "../src/main/tabs/omnibox.js";

describe("parseOmnibox", () => {
  const cases: [string, ReturnType<typeof parseOmnibox>][] = [
    ["", { kind: "noop" }],
    ["   ", { kind: "noop" }],
    ["https://google.com", { kind: "url", url: "https://google.com" }],
    ["http://example.com", { kind: "url", url: "http://example.com" }],
    ["about:blank", { kind: "url", url: "about:blank" }],
    ["file:///tmp/x", { kind: "url", url: "file:///tmp/x" }],
    ["localhost", { kind: "url", url: "http://localhost" }],
    ["localhost:3000", { kind: "url", url: "http://localhost:3000" }],
    ["127.0.0.1", { kind: "url", url: "http://127.0.0.1" }],
    ["192.168.1.1", { kind: "url", url: "http://192.168.1.1" }],
    ["fmkorea.com", { kind: "url", url: "https://fmkorea.com" }],
    ["www.naver.com", { kind: "url", url: "https://www.naver.com" }],
    ["github.io", { kind: "url", url: "https://github.io" }],
    [
      "react hooks",
      { kind: "search", url: "https://www.google.com/search?q=react+hooks" },
    ],
    [
      "  trim me  ",
      { kind: "search", url: "https://www.google.com/search?q=trim+me" },
    ],
    [
      "hello.invalidTLD",
      {
        kind: "search",
        url: "https://www.google.com/search?q=hello.invalidTLD",
      },
    ],
  ];

  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)}`, () => {
      expect(parseOmnibox(input)).toEqual(expected);
    });
  }
});
