// Zod schemas for every Phase-0 IPC channel. Stubbed channels still get schemas
// so the contract is locked before Phase 1 fills the handler body.

import { z } from "zod";
import { AppErrorSchema } from "../errors.js";
import { SettingsSchema, SettingsViewSchema } from "./settings.js";

// ─────────────────────────────────────────────
// Tab summary (returned by ui:tab:list)
// ─────────────────────────────────────────────
export const TabSummarySchema = z.object({
  tab_id: z.string().min(1),
  url: z.string(),
  title: z.string(),
  favicon_url: z.string().optional(),
  is_loading: z.boolean(),
  can_go_back: z.boolean(),
  can_go_forward: z.boolean(),
});
export type TabSummary = z.infer<typeof TabSummarySchema>;

// ─────────────────────────────────────────────
// Tab requests
// ─────────────────────────────────────────────
export const TabOpenReqSchema = z.object({ url: z.string().optional() });
export const TabOpenRespSchema = z.object({ tab_id: z.string() });

export const TabIdSchema = z.object({ tab_id: z.string().min(1) });
export const OkSchema = z.object({ ok: z.literal(true) });

export const TabNavigateReqSchema = z.object({
  tab_id: z.string().min(1),
  url: z.string().min(1),
});

export const TabReloadReqSchema = z.object({
  tab_id: z.string().min(1),
  hard: z.boolean().optional(),
});

export const TabListRespSchema = z.array(TabSummarySchema);

export const TabFindStartReqSchema = z.object({
  tab_id: z.string().min(1),
  text: z.string().min(1),
});

export const TabFindNextReqSchema = z.object({
  tab_id: z.string().min(1),
  forward: z.boolean(),
});

export const TabChromeBoundsReqSchema = z.object({
  top: z.number().nonnegative(),
});

// ─────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────
export const EmptyReqSchema = z.object({}).strict();

// ─────────────────────────────────────────────
// Settings (mostly stubbed)
// ─────────────────────────────────────────────
export const SettingsPutKeyReqSchema = z.object({
  which: z.enum(["llm", "search"]),
  key: z.string().min(1),
});

export const SettingsClearKeyReqSchema = z.object({
  which: z.enum(["llm", "search"]),
});

export const SettingsTestLlmRespSchema = z.object({
  ok: z.boolean(),
  latency_ms: z.number().optional(),
  error: z.string().optional(),
});

export const SettingsClearBrowsingReqSchema = z.object({
  cookies: z.boolean().optional(),
  cache: z.boolean().optional(),
  history: z.boolean().optional(),
});

// ─────────────────────────────────────────────
// Agent requests (stubbed — schemas still locked)
// ─────────────────────────────────────────────
export const DefenseRequestSchema = z.object({
  claim: z.string().min(1).max(2000),
  page_url: z.string().min(1),
  textarea_token: z.string().optional(),
  pipeline_hint: z.enum(["fast", "standard", "deep"]).optional(),
});
export type DefenseRequest = z.infer<typeof DefenseRequestSchema>;

export const AttackRequestSchema = z.object({
  draft: z.string().min(1).max(4000),
  page_url: z.string().min(1),
  textarea_token: z.string().optional(),
  pipeline_hint: z.enum(["fast", "standard", "deep"]).optional(),
});
export type AttackRequest = z.infer<typeof AttackRequestSchema>;

export const RefineRequestSchema = z.object({
  prior_request_id: z.string().min(1),
  instruction: z.string().min(1).max(500),
});
export type RefineRequest = z.infer<typeof RefineRequestSchema>;

export const AgentCancelReqSchema = z.object({
  request_id: z.string().min(1),
});

export const AgentAckRespSchema = z.object({
  request_id: z.string(),
});

// ─────────────────────────────────────────────
// Events (main → renderer)
// ─────────────────────────────────────────────
export const TabTitleEvtSchema = z.object({ tab_id: z.string(), title: z.string() });
export const TabUrlEvtSchema = z.object({ tab_id: z.string(), url: z.string() });
export const TabLoadingEvtSchema = z.object({ tab_id: z.string(), is_loading: z.boolean() });
export const TabFaviconEvtSchema = z.object({ tab_id: z.string(), favicon_url: z.string() });
export const TabFocusEvtSchema = z.object({ tab_id: z.string() });
export const TabClosedEvtSchema = z.object({ tab_id: z.string() });
export const TabCrashedEvtSchema = z.object({ tab_id: z.string(), reason: z.string() });
export const TabFindResultEvtSchema = z.object({
  tab_id: z.string(),
  active: z.number().int().nonnegative(),
  matches: z.number().int().nonnegative(),
});
export const TabNavStateEvtSchema = z.object({
  tab_id: z.string(),
  can_go_back: z.boolean(),
  can_go_forward: z.boolean(),
});

export const MenuEvtSchema = z.object({
  action: z.enum([
    "new_tab",
    "close_tab",
    "reopen_tab",
    "focus_url_bar",
    "reload",
    "hard_reload",
    "back",
    "forward",
    "find",
    "toggle_drawer",
    "next_tab",
    "prev_tab",
    "switch_tab",
    "defense",
    "attack",
  ]),
  index: z.number().int().optional(),
});

// ─────────────────────────────────────────────
// Page preload schemas (replies from preload)
// ─────────────────────────────────────────────
export const PageSelectionRespSchema = z.object({
  text: z.string(),
  url: z.string(),
});

export const PageTextareaFocusedRespSchema = z.object({
  has_focus: z.boolean(),
  token: z.string().optional(),
  hint: z.string().optional(),
});

export const PageTextareaInsertReqSchema = z.object({
  token: z.string(),
  text: z.string(),
});

export const PageTextareaInsertRespSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
});

// ─────────────────────────────────────────────
// Channel → schema map for the router
// ─────────────────────────────────────────────
import { IPC } from "../ipc-channels.js";

export const REQUEST_SCHEMAS = {
  [IPC.UI_PING]: EmptyReqSchema.optional(),
  [IPC.UI_TAB_OPEN]: TabOpenReqSchema,
  [IPC.UI_TAB_CLOSE]: TabIdSchema,
  [IPC.UI_TAB_SWITCH]: TabIdSchema,
  [IPC.UI_TAB_NAVIGATE]: TabNavigateReqSchema,
  [IPC.UI_TAB_RELOAD]: TabReloadReqSchema,
  [IPC.UI_TAB_BACK]: TabIdSchema,
  [IPC.UI_TAB_FORWARD]: TabIdSchema,
  [IPC.UI_TAB_LIST]: EmptyReqSchema.optional(),
  [IPC.UI_TAB_FIND_START]: TabFindStartReqSchema,
  [IPC.UI_TAB_FIND_NEXT]: TabFindNextReqSchema,
  [IPC.UI_TAB_FIND_STOP]: TabIdSchema,
  [IPC.UI_TAB_CHROME_BOUNDS]: TabChromeBoundsReqSchema,
  [IPC.UI_DRAWER_OPEN]: EmptyReqSchema.optional(),
  [IPC.UI_DRAWER_CLOSE]: EmptyReqSchema.optional(),
  [IPC.UI_SETTINGS_GET]: EmptyReqSchema.optional(),
  [IPC.UI_SETTINGS_SET]: SettingsSchema.partial(),
  [IPC.UI_SETTINGS_PUT_KEY]: SettingsPutKeyReqSchema,
  [IPC.UI_SETTINGS_CLEAR_KEY]: SettingsClearKeyReqSchema,
  [IPC.UI_SETTINGS_TEST_LLM]: EmptyReqSchema.optional(),
  [IPC.UI_SETTINGS_RESET_ALL]: EmptyReqSchema.optional(),
  [IPC.UI_SETTINGS_CLEAR_BROWSING_DATA]: SettingsClearBrowsingReqSchema,
  [IPC.UI_AGENT_DEFENSE]: DefenseRequestSchema,
  [IPC.UI_AGENT_ATTACK]: AttackRequestSchema,
  [IPC.UI_AGENT_REFINE]: RefineRequestSchema,
  [IPC.UI_AGENT_CANCEL]: AgentCancelReqSchema,
  [IPC.UI_PAGE_SELECTION]: EmptyReqSchema.optional(),
  [IPC.UI_PAGE_TEXTAREA_FOCUSED]: EmptyReqSchema.optional(),
  [IPC.UI_PAGE_TEXTAREA_INSERT]: PageTextareaInsertReqSchema,
} as const;

export type RequestSchemas = typeof REQUEST_SCHEMAS;

export { AppErrorSchema, SettingsSchema, SettingsViewSchema };
