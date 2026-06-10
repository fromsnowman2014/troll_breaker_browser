// STUB — fs-backed KvStore under userData/cache. Phase 1.

import type { KvStore } from "./kv.js";

export class DiskKv implements KvStore {
  constructor(_baseDir: string) {
    // No-op in Phase 0.
  }

  get<T>(_key: string): Promise<T | null> {
    throw new Error("DiskKv.get — not implemented in Phase 0");
  }

  set<T>(_key: string, _value: T, _ttlMs?: number): Promise<void> {
    throw new Error("DiskKv.set — not implemented in Phase 0");
  }

  del(_key: string): Promise<void> {
    throw new Error("DiskKv.del — not implemented in Phase 0");
  }

  has(_key: string): Promise<boolean> {
    throw new Error("DiskKv.has — not implemented in Phase 0");
  }
}
