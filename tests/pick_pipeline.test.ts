import { describe, expect, it } from "vitest";
import { pickPipeline } from "../src/main/orchestrator/orchestrator.js";

describe("pickPipeline", () => {
  it("short text → fast", () => {
    expect(pickPipeline("이거 진짜야?")).toBe("fast");
  });
  it("text = 500 chars → fast (boundary inclusive)", () => {
    expect(pickPipeline("x".repeat(500))).toBe("fast");
  });
  it("text > 500 chars → standard", () => {
    expect(pickPipeline("x".repeat(501))).toBe("standard");
  });
  it("hint overrides length heuristic", () => {
    expect(pickPipeline("x".repeat(1000), "fast")).toBe("fast");
    expect(pickPipeline("short", "deep")).toBe("deep");
  });
});
