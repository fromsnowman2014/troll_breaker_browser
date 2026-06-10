// TTL-aware KV interface used by vibe / fact caches.
// Implementations: disk.ts (DiskKv), memory.ts (InMemoryKv + LayeredKv).

export interface KvStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
