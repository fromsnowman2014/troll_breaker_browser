import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSession, saveSession } from "../src/main/tabs/session.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), "ts-session-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("session", () => {
  it("loadSession returns null when no file exists", async () => {
    const result = await loadSession(dir);
    expect(result).toBeNull();
  });

  it("roundtrips a valid session", async () => {
    const state = {
      tabs: [
        { url: "https://fmkorea.com", title: "FM" },
        { url: "https://theqoo.net", title: "Qoo" },
      ],
      active_index: 1,
    };
    await saveSession(dir, state);
    const loaded = await loadSession(dir);
    expect(loaded).not.toBeNull();
    expect(loaded?.tabs).toEqual(state.tabs);
    expect(loaded?.active_index).toBe(1);
    expect(typeof loaded?.written_at).toBe("string");
  });

  it("backs up and returns null on malformed JSON", async () => {
    await fs.writeFile(join(dir, "session.json"), "{ not json", "utf-8");
    const result = await loadSession(dir);
    expect(result).toBeNull();
    const backup = await fs.readFile(join(dir, "session.json.bak"), "utf-8");
    expect(backup).toContain("{ not json");
  });

  it("backs up and returns null on schema mismatch", async () => {
    await fs.writeFile(
      join(dir, "session.json"),
      JSON.stringify({ tabs: "not an array", active_index: 0, written_at: "now" }),
      "utf-8",
    );
    const result = await loadSession(dir);
    expect(result).toBeNull();
    const backup = await fs.readFile(join(dir, "session.json.bak"), "utf-8");
    expect(backup).toContain("not an array");
  });

  it("writes atomically (no .tmp left behind)", async () => {
    await saveSession(dir, { tabs: [{ url: "x", title: "y" }], active_index: 0 });
    const entries = await fs.readdir(dir);
    expect(entries.filter((e) => e.endsWith(".tmp"))).toEqual([]);
  });
});
