// Build the agent dependency bundle from current settings.
// LLM calls are routed through the shared Vercel proxy (no per-user API key).

import { join } from "node:path";
import { app } from "electron";
import type { Settings } from "../shared/schemas/settings.js";
import { OpenAIClient } from "../lib/llm/openai.js";
import type { LlmClient } from "../lib/llm/types.js";
import { BraveSearch } from "../lib/search/brave.js";
import { MockSearch } from "../lib/search/mock.js";
import type { SearchClient } from "../lib/search/types.js";
import type { SecretsStore } from "../lib/storage/secrets.js";
import { DiskKv } from "../lib/storage/disk.js";
import { InMemoryKv, LayeredKv } from "../lib/storage/memory.js";
import type { KvStore } from "../lib/storage/kv.js";

export interface AgentDeps {
  llm: LlmClient;
  search: SearchClient;
  kv: KvStore;
  model: string;
}

const PROXY_ENDPOINT = "https://troll-breaker-browser.vercel.app/api/llm";
const PROXY_MODEL = "text-prime";

let memoryKvSingleton: InMemoryKv | null = null;
function getSharedMemoryKv(): InMemoryKv {
  if (!memoryKvSingleton) memoryKvSingleton = new InMemoryKv();
  return memoryKvSingleton;
}

export async function buildAgentDeps(
  settings: Settings,
  secrets: SecretsStore,
): Promise<AgentDeps> {
  // All users share the proxy endpoint; no API key required from the user.
  const llm = new OpenAIClient({
    apiKey: "proxy",
    endpoint: PROXY_ENDPOINT,
  });

  let search: SearchClient;
  if (settings.search.provider === "brave") {
    const searchKey = await secrets.getKey("search");
    if (searchKey) {
      search = new BraveSearch({ apiKey: searchKey });
    } else {
      search = new MockSearch([]);
    }
  } else {
    search = new MockSearch([]);
  }

  const cacheDir = join(app.getPath("userData"), "cache");
  const disk = new DiskKv(cacheDir);
  const mem = getSharedMemoryKv();
  const kv = new LayeredKv(mem, disk);

  return {
    llm,
    search,
    kv,
    model: PROXY_MODEL,
  };
}
