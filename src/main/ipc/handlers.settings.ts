// Settings IPC handlers.
//   - settings.json at userData/settings.json (atomic tmp+rename)
//   - secrets via SecretsStore (safeStorage)
//   - test_llm: 1-token chat to verify the configured key/provider/model
//   - clear_browsing_data: defaultSession.clearStorageData(...)
//
// Module-level Settings singleton is hydrated on first GET (lazy).

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { app, session as electronSession } from "electron";
import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { makeError, IpcError } from "../shared/errors.js";
import {
  EmptyReqSchema,
  SettingsClearBrowsingReqSchema,
  SettingsClearKeyReqSchema,
  SettingsPutKeyReqSchema,
  SettingsSchema,
} from "../shared/schemas/ipc.js";
import {
  defaultSettings,
  defaultSettingsView,
  isValidModelForProvider,
} from "../shared/schemas/settings.js";
import type { Settings, SettingsView } from "../shared/schemas/settings.js";
import { SecretsStore } from "../lib/storage/secrets.js";
import { createLlmClient } from "../lib/llm/index.js";

const SETTINGS_FILE = "settings.json";

class SettingsManager {
  private settings: Settings = defaultSettings();
  private loaded = false;
  readonly secrets: SecretsStore;

  constructor() {
    this.secrets = new SecretsStore(app.getPath("userData"));
  }

  private path(): string {
    return join(app.getPath("userData"), SETTINGS_FILE);
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const p = this.path();
    let raw: string;
    try {
      raw = await fs.readFile(p, "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        await this.save();
        return;
      }
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const result = SettingsSchema.safeParse(parsed);
      if (result.success) {
        this.settings = result.data;
      } else {
        // Back up bad file, keep defaults
        await fs.writeFile(`${p}.bak`, raw, "utf-8").catch(() => undefined);
      }
    } catch {
      await fs.writeFile(`${p}.bak`, raw, "utf-8").catch(() => undefined);
    }
  }

  async save(): Promise<void> {
    const p = this.path();
    await fs.mkdir(dirname(p), { recursive: true });
    const tmp = `${p}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.settings, null, 2), "utf-8");
    await fs.rename(tmp, p);
  }

  current(): Settings {
    return this.settings;
  }

  async patch(partial: Partial<Settings>): Promise<void> {
    const merged = {
      ...this.settings,
      ...partial,
      llm: { ...this.settings.llm, ...(partial.llm ?? {}) },
      search: { ...this.settings.search, ...(partial.search ?? {}) },
      vibe: { ...this.settings.vibe, ...(partial.vibe ?? {}) },
      ui: {
        ...this.settings.ui,
        ...(partial.ui ?? {}),
        panel_position: {
          ...this.settings.ui.panel_position,
          ...(partial.ui?.panel_position ?? {}),
        },
      },
      privacy: { ...this.settings.privacy, ...(partial.privacy ?? {}) },
    };
    if (!isValidModelForProvider(merged.llm.provider, merged.llm.model_id)) {
      throw new IpcError(
        makeError(
          "schema_validation_failed",
          `Model "${merged.llm.model_id}" not valid for provider "${merged.llm.provider}"`,
        ),
      );
    }
    const validated = SettingsSchema.parse(merged);
    this.settings = validated;
    await this.save();
  }

  async resetAll(): Promise<void> {
    this.settings = defaultSettings();
    await this.save();
  }

  async asView(): Promise<SettingsView> {
    await this.ensureLoaded();
    const view = defaultSettingsView();
    view.schema_version = this.settings.schema_version;
    view.llm = this.settings.llm;
    view.search = this.settings.search;
    view.vibe = this.settings.vibe;
    view.ui = this.settings.ui;
    view.privacy = this.settings.privacy;
    view.encryption_available = this.secrets.isEncryptionAvailable();
    const [llmHas, llmLast4, srchHas, srchLast4] = await Promise.all([
      this.secrets.hasKey("llm"),
      this.secrets.last4("llm"),
      this.secrets.hasKey("search"),
      this.secrets.last4("search"),
    ]);
    view.key_present = {
      llm: llmHas ? { present: true, last4: llmLast4 ?? "" } : { present: false },
      search: srchHas ? { present: true, last4: srchLast4 ?? "" } : { present: false },
    };
    return view;
  }
}

let manager: SettingsManager | null = null;
export function getSettingsManager(): SettingsManager {
  if (!manager) manager = new SettingsManager();
  return manager;
}

export function registerSettingsHandlers(): void {
  const mgr = getSettingsManager();

  register<undefined, SettingsView>(IPC.UI_SETTINGS_GET, EmptyReqSchema.optional(), () =>
    mgr.asView(),
  );

  register<Partial<Settings>, SettingsView>(
    IPC.UI_SETTINGS_SET,
    SettingsSchema.partial(),
    async (req) => {
      await mgr.ensureLoaded();
      await mgr.patch(req);
      return mgr.asView();
    },
  );

  register<{ which: "llm" | "search"; key: string }, { ok: true }>(
    IPC.UI_SETTINGS_PUT_KEY,
    SettingsPutKeyReqSchema,
    async (req) => {
      if (!mgr.secrets.isEncryptionAvailable()) {
        // We still store in memory but warn the renderer via the view banner.
      }
      await mgr.secrets.putKey(req.which, req.key);
      return { ok: true };
    },
  );

  register<{ which: "llm" | "search" }, { ok: true }>(
    IPC.UI_SETTINGS_CLEAR_KEY,
    SettingsClearKeyReqSchema,
    async (req) => {
      await mgr.secrets.clearKey(req.which);
      return { ok: true };
    },
  );

  register<undefined, { ok: boolean; latency_ms?: number; error?: string }>(
    IPC.UI_SETTINGS_TEST_LLM,
    EmptyReqSchema.optional(),
    async () => {
      await mgr.ensureLoaded();
      const llmKey = await mgr.secrets.getKey("llm");
      if (!llmKey) return { ok: false, error: "no_api_key" };
      const settings = mgr.current();
      const llm = createLlmClient(settings.llm.provider, { apiKey: llmKey });
      const start = Date.now();
      try {
        await llm.chat({
          model: settings.llm.model_id,
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        });
        return { ok: true, latency_ms: Date.now() - start };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
      }
    },
  );

  register<undefined, SettingsView>(
    IPC.UI_SETTINGS_RESET_ALL,
    EmptyReqSchema.optional(),
    async () => {
      await mgr.ensureLoaded();
      await mgr.resetAll();
      return mgr.asView();
    },
  );

  register<
    { cookies?: boolean; cache?: boolean; history?: boolean },
    { ok: true }
  >(IPC.UI_SETTINGS_CLEAR_BROWSING_DATA, SettingsClearBrowsingReqSchema, async (req) => {
    const storages: Array<
      "cookies" | "filesystem" | "indexdb" | "localstorage" | "shadercache" | "serviceworkers" | "cachestorage"
    > = [];
    if (req.cookies) storages.push("cookies");
    if (req.cache) {
      try {
        await electronSession.defaultSession.clearCache();
      } catch {
        // ignore
      }
    }
    if (storages.length > 0) {
      try {
        await electronSession.defaultSession.clearStorageData({ storages });
      } catch {
        // ignore
      }
    }
    // history is renderer-side (we don't persist it in Phase 0/1).
    return { ok: true };
  });
}
