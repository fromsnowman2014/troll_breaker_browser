import { describe, expect, it } from "vitest";
import {
  TabOpenReqSchema,
  TabIdSchema,
  TabNavigateReqSchema,
  TabFindStartReqSchema,
  DefenseRequestSchema,
  AttackRequestSchema,
  RefineRequestSchema,
  REQUEST_SCHEMAS,
} from "../src/main/shared/schemas/ipc.js";
import { AppErrorSchema } from "../src/main/shared/errors.js";
import { IPC } from "../src/main/shared/ipc-channels.js";

describe("IPC schemas", () => {
  it("TabOpenReqSchema accepts empty object and url variant", () => {
    expect(TabOpenReqSchema.safeParse({}).success).toBe(true);
    expect(TabOpenReqSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
  });

  it("TabIdSchema rejects empty tab_id", () => {
    expect(TabIdSchema.safeParse({ tab_id: "abc" }).success).toBe(true);
    expect(TabIdSchema.safeParse({ tab_id: "" }).success).toBe(false);
    expect(TabIdSchema.safeParse({}).success).toBe(false);
  });

  it("TabNavigateReqSchema needs both fields", () => {
    expect(
      TabNavigateReqSchema.safeParse({ tab_id: "id", url: "https://x.com" }).success,
    ).toBe(true);
    expect(TabNavigateReqSchema.safeParse({ tab_id: "id" }).success).toBe(false);
  });

  it("TabFindStartReqSchema requires non-empty text", () => {
    expect(
      TabFindStartReqSchema.safeParse({ tab_id: "id", text: "hello" }).success,
    ).toBe(true);
    expect(TabFindStartReqSchema.safeParse({ tab_id: "id", text: "" }).success).toBe(false);
  });

  it("DefenseRequestSchema caps claim length at 2000", () => {
    const ok = DefenseRequestSchema.safeParse({
      claim: "x".repeat(2000),
      page_url: "https://x.com",
    });
    expect(ok.success).toBe(true);

    const tooLong = DefenseRequestSchema.safeParse({
      claim: "x".repeat(2001),
      page_url: "https://x.com",
    });
    expect(tooLong.success).toBe(false);
  });

  it("AttackRequestSchema caps draft length at 4000", () => {
    const ok = AttackRequestSchema.safeParse({
      draft: "x".repeat(4000),
      page_url: "https://x.com",
    });
    expect(ok.success).toBe(true);
    const tooLong = AttackRequestSchema.safeParse({
      draft: "x".repeat(4001),
      page_url: "https://x.com",
    });
    expect(tooLong.success).toBe(false);
  });

  it("RefineRequestSchema caps instruction at 500", () => {
    expect(
      RefineRequestSchema.safeParse({ prior_request_id: "r", instruction: "더 짧게" }).success,
    ).toBe(true);
    expect(
      RefineRequestSchema.safeParse({
        prior_request_id: "r",
        instruction: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("AppErrorSchema accepts the canonical codes", () => {
    const codes = [
      "no_api_key",
      "schema_validation_failed",
      "not_implemented",
      "unknown",
    ];
    for (const code of codes) {
      expect(AppErrorSchema.safeParse({ code, message: "x" }).success).toBe(true);
    }
    expect(AppErrorSchema.safeParse({ code: "made_up", message: "x" }).success).toBe(false);
  });

  it("REQUEST_SCHEMAS covers every IPC channel that has a request body", () => {
    const expectedChannels = [
      IPC.UI_PING,
      IPC.UI_TAB_OPEN,
      IPC.UI_TAB_CLOSE,
      IPC.UI_TAB_SWITCH,
      IPC.UI_TAB_NAVIGATE,
      IPC.UI_TAB_RELOAD,
      IPC.UI_TAB_BACK,
      IPC.UI_TAB_FORWARD,
      IPC.UI_TAB_LIST,
      IPC.UI_TAB_FIND_START,
      IPC.UI_TAB_FIND_NEXT,
      IPC.UI_TAB_FIND_STOP,
      IPC.UI_TAB_CHROME_BOUNDS,
      IPC.UI_DRAWER_OPEN,
      IPC.UI_DRAWER_CLOSE,
      IPC.UI_SETTINGS_GET,
      IPC.UI_SETTINGS_SET,
      IPC.UI_SETTINGS_PUT_KEY,
      IPC.UI_SETTINGS_CLEAR_KEY,
      IPC.UI_SETTINGS_TEST_LLM,
      IPC.UI_SETTINGS_RESET_ALL,
      IPC.UI_SETTINGS_CLEAR_BROWSING_DATA,
      IPC.UI_AGENT_DEFENSE,
      IPC.UI_AGENT_ATTACK,
      IPC.UI_AGENT_REFINE,
      IPC.UI_AGENT_CANCEL,
    ];
    for (const ch of expectedChannels) {
      expect(REQUEST_SCHEMAS[ch as keyof typeof REQUEST_SCHEMAS]).toBeDefined();
    }
  });
});
