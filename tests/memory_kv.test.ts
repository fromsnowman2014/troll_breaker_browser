import { describe, expect, it } from "vitest";
import { InMemoryKv, LayeredKv } from "../src/main/lib/storage/memory.js";

describe("InMemoryKv", () => {
  it("set/get round-trip", async () => {
    const kv = new InMemoryKv();
    await kv.set("a", 1);
    expect(await kv.get<number>("a")).toBe(1);
  });

  it("TTL expiry", async () => {
    const kv = new InMemoryKv();
    await kv.set("a", 1, 30);
    expect(await kv.get("a")).toBe(1);
    await new Promise((r) => setTimeout(r, 50));
    expect(await kv.get("a")).toBeNull();
  });
});

describe("LayeredKv", () => {
  it("reads from memory first, falls back to disk", async () => {
    const mem = new InMemoryKv();
    const disk = new InMemoryKv();
    const layered = new LayeredKv(mem, disk);
    await disk.set("k", "fromDisk");
    expect(await layered.get<string>("k")).toBe("fromDisk");
    // After read, memory should be re-warmed.
    expect(await mem.get<string>("k")).toBe("fromDisk");
  });

  it("set writes to both layers", async () => {
    const mem = new InMemoryKv();
    const disk = new InMemoryKv();
    const layered = new LayeredKv(mem, disk);
    await layered.set("k", "x");
    expect(await mem.get<string>("k")).toBe("x");
    expect(await disk.get<string>("k")).toBe("x");
  });

  it("del clears both layers", async () => {
    const mem = new InMemoryKv();
    const disk = new InMemoryKv();
    const layered = new LayeredKv(mem, disk);
    await layered.set("k", "x");
    await layered.del("k");
    expect(await mem.get("k")).toBeNull();
    expect(await disk.get("k")).toBeNull();
  });
});
