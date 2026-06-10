import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DiskKv } from "../src/main/lib/storage/disk.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), "ts-kv-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("DiskKv", () => {
  it("set/get round-trip", async () => {
    const kv = new DiskKv(dir);
    await kv.set("vibe:fmkorea", { hello: "world" });
    expect(await kv.get<{ hello: string }>("vibe:fmkorea")).toEqual({ hello: "world" });
  });

  it("returns null when missing", async () => {
    const kv = new DiskKv(dir);
    expect(await kv.get("vibe:none")).toBeNull();
  });

  it("respects TTL on read", async () => {
    const kv = new DiskKv(dir);
    await kv.set("fact:abc", { v: 1 }, 50);
    expect(await kv.get("fact:abc")).toEqual({ v: 1 });
    await new Promise((r) => setTimeout(r, 80));
    expect(await kv.get("fact:abc")).toBeNull();
  });

  it("del removes the entry", async () => {
    const kv = new DiskKv(dir);
    await kv.set("vibe:foo", { a: 1 });
    await kv.del("vibe:foo");
    expect(await kv.get("vibe:foo")).toBeNull();
  });

  it("returns null for corrupt JSON", async () => {
    const kv = new DiskKv(dir);
    await fs.mkdir(join(dir, "vibe"), { recursive: true });
    await fs.writeFile(join(dir, "vibe", "x.json"), "{ not json", "utf-8");
    expect(await kv.get("vibe:x")).toBeNull();
  });

  it("has() reflects presence", async () => {
    const kv = new DiskKv(dir);
    expect(await kv.has("k")).toBe(false);
    await kv.set("k", "v");
    expect(await kv.has("k")).toBe(true);
  });

  it("uses namespace from key prefix as subdir", async () => {
    const kv = new DiskKv(dir);
    await kv.set("vibe:fmkorea", { x: 1 });
    const entries = await fs.readdir(join(dir, "vibe"));
    expect(entries).toContain("fmkorea.json");
  });
});
