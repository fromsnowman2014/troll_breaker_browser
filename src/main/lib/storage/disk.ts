// fs-backed KvStore under userData/cache/<namespace>/<key>.json.
// Atomic write (tmp + rename), mtime-based TTL on read.

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import type { KvStore } from "./kv.js";

interface DiskEntry<T> {
  v: number;
  ttl_ms: number | null;
  value: T;
}

const VERSION = 1;

function keyToPath(baseDir: string, key: string): string {
  // Keys are like "vibe:fmkorea" or "fact:<sha256>". Split on first colon →
  // first segment becomes subdir, rest is filename. Sanitize filename.
  const colon = key.indexOf(":");
  const namespace = colon === -1 ? "misc" : key.slice(0, colon);
  const rest = colon === -1 ? key : key.slice(colon + 1);
  const safe = rest.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  return join(baseDir, namespace, `${safe}.json`);
}

export class DiskKv implements KvStore {
  constructor(private readonly baseDir: string) {}

  async get<T>(key: string): Promise<T | null> {
    const path = keyToPath(this.baseDir, key);
    let raw: string;
    try {
      raw = await fs.readFile(path, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }

    let parsed: DiskEntry<T>;
    try {
      parsed = JSON.parse(raw) as DiskEntry<T>;
    } catch {
      return null;
    }

    if (parsed.v !== VERSION) return null;

    if (parsed.ttl_ms !== null) {
      try {
        const stat = await fs.stat(path);
        const age = Date.now() - stat.mtimeMs;
        if (age > parsed.ttl_ms) return null;
      } catch {
        return null;
      }
    }

    return parsed.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const path = keyToPath(this.baseDir, key);
    await fs.mkdir(dirname(path), { recursive: true });
    const entry: DiskEntry<T> = {
      v: VERSION,
      ttl_ms: ttlMs ?? null,
      value,
    };
    const json = JSON.stringify(entry);
    const tmp = `${path}.tmp`;
    await fs.writeFile(tmp, json, "utf-8");
    await fs.rename(tmp, path);
  }

  async del(key: string): Promise<void> {
    const path = keyToPath(this.baseDir, key);
    try {
      await fs.unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}
