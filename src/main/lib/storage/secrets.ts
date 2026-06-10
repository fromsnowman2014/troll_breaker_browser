// STUB — safeStorage wrapper for API keys (LLM + search). Phase 1.
// Spec: userData/secrets.bin via Electron safeStorage.encryptString.
// See doc/API_KEY_SECURITY.md §3.

export class SecretsStore {
  constructor(_userDataDir: string) {
    // No-op in Phase 0.
  }

  isEncryptionAvailable(): boolean {
    return false;
  }

  putKey(_which: "llm" | "search", _key: string): Promise<void> {
    throw new Error("SecretsStore.putKey — not implemented in Phase 0");
  }

  getKey(_which: "llm" | "search"): Promise<string | null> {
    throw new Error("SecretsStore.getKey — not implemented in Phase 0");
  }

  clearKey(_which: "llm" | "search"): Promise<void> {
    throw new Error("SecretsStore.clearKey — not implemented in Phase 0");
  }
}
