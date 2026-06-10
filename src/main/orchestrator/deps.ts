// Build the agent dependency bundle from current settings + secrets.
// Used by the orchestrator at request_id creation time so the bundle is
// "frozen" against mid-flight provider changes (AGENT_DESIGN.md §6).

import { join } from "node:path";
import { app } from "electron";
import type { Settings } from "../shared/schemas/settings.js";
import { createLlmClient } from "../lib/llm/index.js";
import type { LlmClient } from "../lib/llm/types.js";
import { BraveSearch } from "../lib/search/brave.js";
import { MockSearch } from "../lib/search/mock.js";
import type { SearchClient } from "../lib/search/types.js";
import type { SecretsStore } from "../lib/storage/secrets.js";
import { DiskKv } from "../lib/storage/disk.js";
import { InMemoryKv, LayeredKv } from "../lib/storage/memory.js";
import type { KvStore } from "../lib/storage/kv.js";
import { makeError, IpcError } from "../shared/errors.js";

export interface AgentDeps {
  llm: LlmClient;
  search: SearchClient;
  kv: KvStore;
  model: string;
}

let memoryKvSingleton: InMemoryKv | null = null;
function getSharedMemoryKv(): InMemoryKv {
  if (!memoryKvSingleton) memoryKvSingleton = new InMemoryKv();
  return memoryKvSingleton;
}

export async function buildAgentDeps(
  settings: Settings,
  secrets: SecretsStore,
): Promise<AgentDeps> {
  const llmKey = await secrets.getKey("llm");
  if (!llmKey) {
    throw new IpcError(makeError("no_api_key", "LLM API key not configured"));
  }

  const llm = createLlmClient(settings.llm.provider, {
    apiKey: llmKey,
    defaultModel: settings.llm.model_id,
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
    model: settings.llm.model_id,
  };
}
