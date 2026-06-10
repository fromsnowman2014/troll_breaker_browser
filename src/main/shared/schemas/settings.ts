import { z } from "zod";

export const LlmProviderSchema = z.enum(["anthropic", "openai", "google"]);
export const SearchProviderSchema = z.enum(["brave", "disabled"]);
export const ThemeSchema = z.enum(["system", "light", "dark"]);
export const LanguageSchema = z.enum(["ko", "en"]);

export const SettingsSchema = z.object({
  schema_version: z.literal(1),
  llm: z.object({
    provider: LlmProviderSchema,
    model_id: z.string().min(1),
  }),
  search: z.object({
    provider: SearchProviderSchema,
  }),
  vibe: z.object({
    default_site_id: z.string().min(1),
  }),
  ui: z.object({
    theme: ThemeSchema,
    language: LanguageSchema,
    panel_position: z
      .object({
        docked: z.boolean(),
        x: z.number().optional(),
        y: z.number().optional(),
      })
      .refine(
        (p) => p.docked || (typeof p.x === "number" && typeof p.y === "number"),
        { message: "panel_position.x/y required when docked=false" },
      )
      .refine(
        (p) => !p.docked || (p.x === undefined && p.y === undefined),
        { message: "panel_position.x/y only valid when docked=false" },
      ),
  }),
  privacy: z.object({
    https_only: z.boolean(),
    persist_history: z.boolean(),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsViewSchema = SettingsSchema.extend({
  key_present: z.object({
    llm: z.object({ present: z.boolean(), last4: z.string().optional() }),
    search: z.object({ present: z.boolean(), last4: z.string().optional() }),
  }),
  encryption_available: z.boolean(),
});

export type SettingsView = z.infer<typeof SettingsViewSchema>;

// Static model catalog. Used for provider/model invariant + drawer dropdown.
// Per TECH_STACK.md §3.
export const MODEL_CATALOG = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
  openai: ["gpt-4o-mini", "gpt-4o"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
} as const satisfies Record<z.infer<typeof LlmProviderSchema>, readonly string[]>;

export function isValidModelForProvider(
  provider: z.infer<typeof LlmProviderSchema>,
  modelId: string,
): boolean {
  return (MODEL_CATALOG[provider] as readonly string[]).includes(modelId);
}

export function defaultSettings(): Settings {
  return {
    schema_version: 1,
    llm: { provider: "anthropic", model_id: "claude-sonnet-4-6" },
    search: { provider: "brave" },
    vibe: { default_site_id: "generic_korean_cynical" },
    ui: {
      theme: "system",
      language: "ko",
      panel_position: { docked: true },
    },
    privacy: { https_only: true, persist_history: false },
  };
}

export function defaultSettingsView(): SettingsView {
  return {
    ...defaultSettings(),
    key_present: { llm: { present: false }, search: { present: false } },
    encryption_available: false,
  };
}
