// cheerio-based DOM extraction from an HTML fixture.

import { describe, expect, it } from "vitest";
import { extractPostsFromHtml } from "../src/main/agents/vibe_extract.js";
import { FMKOREA, THEQOO } from "../src/main/agents/extractors/index.js";

const FMKOREA_FIXTURE = `<!DOCTYPE html>
<html><body>
<ul class="bd_lst">
  <li>
    <a class="hx">본문 어그로 ㅈㄴ 끔 ㅋㅋ</a>
    <span class="member">user1</span>
  </li>
  <li>
    <a class="hx">팩트 점검 좀</a>
    <span class="member">user2</span>
  </li>
  <li>
    <a class="hx">또 시작 ㄷㄷ</a>
    <span class="member">user3</span>
  </li>
</ul>
</body></html>`;

const THEQOO_FIXTURE = `<!DOCTYPE html>
<html><body>
<table class="bd_lst">
<tbody>
  <tr>
    <td class="title"><a href="/x">와 헐 진짜?</a></td>
    <td class="author">user1</td>
  </tr>
  <tr>
    <td class="title"><a href="/y">출처 좀 ㅎㅎ</a></td>
    <td class="author">user2</td>
  </tr>
</tbody>
</table>
</body></html>`;

describe("extractPostsFromHtml", () => {
  it("fmkorea: picks up to max_posts from fixture", () => {
    const posts = extractPostsFromHtml(FMKOREA_FIXTURE, FMKOREA);
    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts[0]?.title).toContain("어그로");
    expect(posts[0]?.author).toBe("user1");
  });

  it("theqoo: titles + authors", () => {
    const posts = extractPostsFromHtml(THEQOO_FIXTURE, THEQOO);
    expect(posts).toHaveLength(2);
    expect(posts[0]?.title).toContain("와 헐");
    expect(posts[1]?.author).toBe("user2");
  });

  it("respects max_posts cap", () => {
    const big = `<html><body><ul class="bd_lst">${"<li><a class='hx'>t</a></li>".repeat(
      20,
    )}</ul></body></html>`;
    const posts = extractPostsFromHtml(big, FMKOREA);
    expect(posts.length).toBeLessThanOrEqual(FMKOREA.max_posts);
  });

  it("returns [] when no posts match selector", () => {
    const posts = extractPostsFromHtml("<html><body><p>nothing</p></body></html>", FMKOREA);
    expect(posts).toEqual([]);
  });
});
