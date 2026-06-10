// TTL-aware KV interface used by vibe / fact caches. Phase 1 lands the disk
// implementation; this is the contract.

export interface KvStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
