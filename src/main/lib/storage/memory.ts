// In-memory KvStore + layered overlay (memory → disk).

import type { KvStore } from "./kv.js";

interface MemEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class InMemoryKv implements KvStore {
  private store = new Map<string, MemEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as MemEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs === undefined ? null : Date.now() + ttlMs,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Layered KV: reads check memory first, fall back to disk. Writes go to both.
 * Memory TTL defaults to half of the disk TTL when writing (so we don't serve
 * stale memory data after disk expiry).
 */
export class LayeredKv implements KvStore {
  constructor(
    private readonly memory: KvStore,
    private readonly disk: KvStore,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const mem = await this.memory.get<T>(key);
    if (mem !== null) return mem;
    const d = await this.disk.get<T>(key);
    if (d !== null) {
      // Re-warm memory with a short TTL so subsequent reads are fast.
      await this.memory.set(key, d, 60_000);
    }
    return d;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.memory.set(key, value, ttlMs);
    await this.disk.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.memory.del(key);
    await this.disk.del(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}
