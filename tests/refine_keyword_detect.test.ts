import { describe, expect, it } from "vitest";
import { detectRetrigger } from "../src/main/orchestrator/session.js";

describe("detectRetrigger", () => {
  it("Korean fact triggers", () => {
    expect(detectRetrigger("이거 다시 팩트체크 해줘")).toBe("fact");
    expect(detectRetrigger("팩트 다시 확인")).toBe("fact");
  });
  it("Korean score triggers", () => {
    expect(detectRetrigger("다시 점수 매겨")).toBe("score");
    expect(detectRetrigger("점수 다시 보자")).toBe("score");
  });
  it("English score triggers", () => {
    expect(detectRetrigger("rescore please")).toBe("score");
    expect(detectRetrigger("re-score")).toBe("score");
  });
  it("English fact triggers", () => {
    expect(detectRetrigger("fact check again")).toBe("fact");
    expect(detectRetrigger("verify again")).toBe("fact");
  });
  it("no trigger for ordinary refinement", () => {
    expect(detectRetrigger("더 짧게")).toBeNull();
    expect(detectRetrigger("팩트 줄이기")).toBeNull(); // no "다시"
    expect(detectRetrigger("make it shorter")).toBeNull();
  });
});
