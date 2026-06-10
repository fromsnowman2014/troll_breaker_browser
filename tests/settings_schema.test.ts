import { describe, expect, it } from "vitest";
import {
  SettingsSchema,
  SettingsViewSchema,
  defaultSettings,
  defaultSettingsView,
  isValidModelForProvider,
} from "../src/main/shared/schemas/settings.js";

describe("Settings schema", () => {
  it("accepts the default Settings", () => {
    const parsed = SettingsSchema.safeParse(defaultSettings());
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const r = SettingsSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects panel_position with x/y when docked=true", () => {
    const bad = defaultSettings();
    bad.ui.panel_position = { docked: true, x: 100, y: 100 };
    const r = SettingsSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects panel_position without x/y when docked=false", () => {
    const bad = defaultSettings();
    bad.ui.panel_position = { docked: false };
    const r = SettingsSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("validates provider/model invariant via helper", () => {
    expect(isValidModelForProvider("anthropic", "claude-sonnet-4-6")).toBe(true);
    expect(isValidModelForProvider("anthropic", "gpt-4o")).toBe(false);
    expect(isValidModelForProvider("openai", "gpt-4o")).toBe(true);
    expect(isValidModelForProvider("google", "gemini-2.5-pro")).toBe(true);
  });
});

describe("SettingsView schema", () => {
  it("accepts the default SettingsView", () => {
    const r = SettingsViewSchema.safeParse(defaultSettingsView());
    expect(r.success).toBe(true);
  });

  it("requires key_present + encryption_available fields", () => {
    const r = SettingsViewSchema.safeParse(defaultSettings());
    expect(r.success).toBe(false);
  });
});
