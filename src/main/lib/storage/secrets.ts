// API key storage via Electron safeStorage (OS keychain).
//   - File: userData/secrets.bin
//   - Format: JSON { llm?: base64 ciphertext, search?: base64 ciphertext }
//   - When safeStorage is unavailable (e.g. headless Linux without a keyring),
//     keys are held in memory only for the lifetime of the app. We surface
//     this via isEncryptionAvailable() so the renderer can show a banner.
//
// See doc/API_KEY_SECURITY.md §3.

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { safeStorage } from "electron";

export type SecretKind = "llm" | "search";

interface OnDiskShape {
  llm?: string;
  search?: string;
}

const FILENAME = "secrets.bin";

export class SecretsStore {
  private readonly path: string;
  private memory = new Map<SecretKind, string>();
  private loaded = false;

  constructor(userDataDir: string) {
    this.path = join(userDataDir, FILENAME);
  }

  isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.isEncryptionAvailable()) return;

    let raw: string;
    try {
      raw = await fs.readFile(this.path, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }

    let parsed: OnDiskShape;
    try {
      parsed = JSON.parse(raw) as OnDiskShape;
    } catch {
      return;
    }

    for (const kind of ["llm", "search"] as const) {
      const b64 = parsed[kind];
      if (!b64) continue;
      try {
        const buf = Buffer.from(b64, "base64");
        const decrypted = safeStorage.decryptString(buf);
        this.memory.set(kind, decrypted);
      } catch {
        // Decryption failed; ignore this entry.
      }
    }
  }

  private async flush(): Promise<void> {
    if (!this.isEncryptionAvailable()) return;
    const out: OnDiskShape = {};
    for (const [kind, key] of this.memory) {
      const ciphertext = safeStorage.encryptString(key);
      out[kind] = ciphertext.toString("base64");
    }
    await fs.mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(out), "utf-8");
    await fs.rename(tmp, this.path);
  }

  async putKey(kind: SecretKind, key: string): Promise<void> {
    await this.ensureLoaded();
    this.memory.set(kind, key);
    await this.flush();
  }

  async getKey(kind: SecretKind): Promise<string | null> {
    await this.ensureLoaded();
    return this.memory.get(kind) ?? null;
  }

  async clearKey(kind: SecretKind): Promise<void> {
    await this.ensureLoaded();
    this.memory.delete(kind);
    await this.flush();
  }

  async clearAll(): Promise<void> {
    await this.ensureLoaded();
    this.memory.clear();
    try {
      await fs.unlink(this.path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  /** Used by SettingsView — does NOT expose the actual key. */
  async last4(kind: SecretKind): Promise<string | null> {
    const key = await this.getKey(kind);
    if (!key) return null;
    return key.length <= 4 ? key : key.slice(-4);
  }

  async hasKey(kind: SecretKind): Promise<boolean> {
    return (await this.getKey(kind)) !== null;
  }
}
