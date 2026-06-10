// MCP-style tool definitions exposed to the LLM. Phase 1 uses search_web
// implicitly through the fact agent (we don't currently let the LLM call tools
// directly during Defense; structuredChat injects its own emit_result tool).
//
// These declarations are kept for future use (Phase 2+ may let agents call
// these via Anthropic tool-use loop) and documentation.

import type { LlmToolDef } from "../lib/llm/types.js";

export const TOOL_SEARCH_WEB: LlmToolDef = {
  name: "search_web",
  description: "Search the web for sources to back a factual claim.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      max: { type: "integer", description: "Max results (default 6)" },
    },
    required: ["query"],
  },
};

export const TOOL_VERIFY_FACT: LlmToolDef = {
  name: "verify_fact_with_links",
  description: "Given a claim, return verdict + sources.",
  input_schema: {
    type: "object",
    properties: {
      claim: { type: "string" },
      locale: { type: "string" },
    },
    required: ["claim"],
  },
};

export const TOOL_GET_SITE_VIBE: LlmToolDef = {
  name: "get_site_vibe",
  description: "Get the vibe profile for a site.",
  input_schema: {
    type: "object",
    properties: {
      site_id: { type: "string" },
    },
    required: ["site_id"],
  },
};

export const ALL_TOOLS: readonly LlmToolDef[] = [
  TOOL_SEARCH_WEB,
  TOOL_VERIFY_FACT,
  TOOL_GET_SITE_VIBE,
] as const;
