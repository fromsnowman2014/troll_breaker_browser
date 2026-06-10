# Code Map — Native Browser

> Last updated: 2026-06-09 (Phase 0 shell landed)
> Update protocol: see [`../CLAUDE.md`](../CLAUDE.md) → "Source Code Map".

Phase 0 modules are **LIVE**. Phase 1+ modules are **STUB** (interface + `throw "Phase N"` body). See [`ROADMAP.md`](./ROADMAP.md) for phase boundaries.

Phase 0 status: ✅ shipped 2026-06-09 — Electron 42 shell + tabs + URL bar + nav buttons + find-in-page + placeholder settings drawer + session restore + page preload installed (unused). 43 Vitest tests green.

---

## Module tree

- `src/main/` — Electron main process
  - `index.ts` — entry: create window, register IPC, install app menu
  - `window.ts` — `createMainWindow()`: builds the chrome shell + tab container
  - `tabs/`
    - `tab_manager.ts` — `WebContentsView` lifecycle, focus tracking, history mirroring
    - `tab.ts` — `Tab` object: id, url, title, history_index
    - `omnibox.ts` — `parseOmnibox(input)`: URL vs search-query heuristic
  - `ipc/`
    - `router.ts` — flat switch on channel name; validates payloads against zod schemas
    - `handlers.tab.ts` — `ui:tab:*` handlers
    - `handlers.agent.ts` — `ui:agent:*` handlers → orchestrator
    - `handlers.settings.ts` — `ui:settings:*` handlers (+ `safeStorage`)
    - `handlers.page.ts` — `page:*` bridge to per-tab preload
  - `orchestrator/`
    - `orchestrator.ts` — `runDefense`, `runAttack`, `runRefine`, `pickPipeline(text)`
    - `cancellation.ts` — `request_id → AbortController` map
  - `agents/` — lifted from `../src/agents/` (extension)
    - `_util.ts` — `withTimeout`, `fingerprint`
    - `_vibe_fallback.ts` — generic Korean cynical baseline
    - `tools.ts` — MCP-style tool registry exposed to the LLM
    - `fact.ts` — `verifyFactWithLinks(deps, ...)`
    - `logic.ts` — `detectFallacies(deps, ...)`
    - `vibe.ts` — `getSiteVibe`, `rewriteInVibe`, `finalizeConceptPost`, `urlToSiteId`
    - `evaluator.ts` — `scoreAndCritique(deps, ...)`
  - `lib/`
    - `llm/` — provider-agnostic adapter
      - `types.ts` — `LlmClient`, `LlmChatRequest`, `LlmChatResponse`, `LlmToolDef`, `LlmToolCall`
      - `structured.ts` — `structuredChat(llm, schema, ...)`: tool-use with one retry
      - `anthropic.ts`, `openai.ts`, `gemini.ts` — provider impls
      - `mock.ts` — for unit tests
    - `search/`
      - `types.ts` — `SearchClient.searchWeb(query, max?) → Source[]`
      - `brave.ts` — `BraveSearch` (fetch-based, `X-Subscription-Token`)
      - `mock.ts` — for unit tests
    - `storage/`
      - `kv.ts` — `KvStore` interface (TTL-aware)
      - `disk.ts` — `fs/promises`-backed KV at `userData/cache`
      - `memory.ts` — `InMemoryKv` overlay
      - `secrets.ts` — `safeStorage` encrypt / decrypt of API keys
      - `migrations.ts` — schema_version migrations
    - `seeds/` — bundled VibeProfile loader (lifted from extension)
  - `menus/`
    - `app_menu.ts` — macOS menubar / Windows menu
    - `shortcuts.ts` — global accelerator registry
  - `shared/` — imported by main AND chrome-renderer
    - `ipc-channels.ts` — channel name consts (single source of truth)
    - `schemas/`
      - `settings.ts` — `Settings`, `SettingsView`
      - `ipc.ts` — discriminated union of all IPC payloads
      - `agents.ts` — re-exported subset of agent types
      - `index.ts`
    - `types.ts` — TS types derived from schemas

- `src/chrome-renderer/` — the React UI for our browser chrome
  - `index.html`
  - `main.tsx` — React entry
  - `ipc.ts` — `contextBridge`'d client; one fn per channel
  - `state/`
    - `store.ts` — zustand root
    - `tabs.ts` — tab list + active id, mirrors `evt:tab:*`
    - `agent.ts` — current session (defense | attack | refine | null)
    - `chat.ts` — refinement history + revert stack
    - `settings.ts` — `SettingsView` mirror (no secrets)
  - `components/`
    - `ChromeShell.tsx` — outermost layout
    - `TabStrip.tsx`
    - `UrlBar.tsx` — omnibox input
    - `NavButtons.tsx` — back / forward / reload
    - `RightEdgeTrigger.tsx` — sparkle button → opens drawer
    - `SettingsDrawer.tsx`
    - `OutputFrame.tsx` — result card host
    - `ChatFrame.tsx` — buttons + input
    - `DefenseCard.tsx` — Shield result render
    - `AttackCard.tsx` — Sword result render
    - `ScoreBars.tsx`
    - `FindBar.tsx` — `Cmd/Ctrl+F` overlay
    - `Toast.tsx`
  - `styles/`
    - `theme.css` — CSS variables for dark + light tokens
    - `tailwind.css`
  - `lib/`
    - `hotkeys.ts` — keyboard shortcut handlers
    - `animations.ts` — drawer + frame transitions
    - `strings.ts` — `ko` / `en` UI string map

- `src/page-preload/` — tiny preload loaded into every page WebContentsView
  - `preload.ts` — exposes `page:selection:get`, `page:textarea:focused`, `page:textarea:insert` only

- `seeds/<site_id>.json` — bundled vibe corpora (TBD format, lifted from extension)
- `docs_new_browser/site-extractors/<site_id>.md` — CSS selector specs for vibe sampling (post-MVP)
- `tests/` — Vitest unit tests (mocked LLM + search)
- `e2e/` — Playwright + Electron driver smoke tests
- `packaging/` — `electron-builder` config, app icons, signing config

## Key types

These are inherited from `../docs/DATA_SCHEMAS.md` §1 and re-exported from `src/main/shared/schemas/agents.ts`:

- `VibeProfile { site_id, display_name, source, last_refreshed, lexicon, sentence_shape, tonality, few_shot_posts[2..5] }`
- `FactResult { claim, verdict, summary, sources: Source[], confidence, needs_followup }`
- `Source { title, url (HTTPS only), publisher?, published_at?, snippet }`
- `Fallacy { type: FallacyType, span, explanation, counter_punch }`
- `EvalScore { axes: {cynicism, fact, punchline, vibe}, line_critique: LineNote[], final_post, needs_verification }`
- `ShieldResult { request_id, pipeline, vibe_used, claim_excerpt, fact, fallacies, vibe_adjusted_summary, generated_at }`
- `SwordResult { request_id, pipeline, vibe_used, score, generated_at }`

Native-only types introduced in this folder:

- `Settings` — see [`DATA_SCHEMAS.md`](./DATA_SCHEMAS.md) §2
- `SettingsView` — sanitized projection of `Settings` for the renderer (no secrets)
- `TabSummary` — what the renderer needs to render the tab strip
- `AppError` — error shape across IPC
- `DefenseRequest`, `AttackRequest`, `RefineRequest`, `RefineResult` — see [`DATA_SCHEMAS.md`](./DATA_SCHEMAS.md) §3

## Cross-module contracts

- **Defense flow**: `chrome-renderer → ui:agent:defense → orchestrator.runDefense → vibe.getSiteVibe → parallel(fact, logic) → vibe.rewriteInVibe → evt:agent:result`
- **Attack flow**: `chrome-renderer → ui:agent:attack → orchestrator.runAttack → vibe.getSiteVibe → evaluator.scoreAndCritique → vibe.finalizeConceptPost → evt:agent:result`
- **Refine flow**: `chrome-renderer → ui:agent:refine → orchestrator.runRefine → vibe.rewriteInVibe(extraInstruction, conversationHistory) → evt:agent:result`
- **Pipeline selection** (post-Phase 3): `pickPipeline(text)` — `length > 500 → standard`, else `fast`. `deep` is opt-in.
- **MCP-style tools** exposed to the LLM: `agents/tools.ts → toolDefs`. Handlers wired by orchestrator at call time.
- **Structured-output contract**: every agent emitting structured data calls `lib/llm/structured.structuredChat(schema, ...)`. zod validation; one retry with error-injection.
- **Agent isolation**: agents do not call each other; agents do not touch `lib/storage` directly (orchestrator passes a `KvStore` dep); agents return data, not UI strings.
- **Settings ↔ renderer**: renderer never sees raw API keys. `ui:settings:get` returns `SettingsView` (`last4` only). Mutations via dedicated `put_key` / `clear_key` channels.
- **Tab ↔ chrome**: `tab_manager.ts` is the source of truth; renderer state is a mirror that lags by ≤ 1 event tick.
- **Page preload**: only three IPC responses, opaque tokens, 120-s TTL.

## Phase 0 — LIVE vs STUB summary

**LIVE (working code, Phase 0):**
- `src/main/index.ts`, `src/main/window.ts` — entry + window creation
- `src/main/tabs/{tab_manager,tab,omnibox,session}.ts` — full tab lifecycle
- `src/main/ipc/{router,handlers.tab,handlers.drawer}.ts` — IPC routing for tabs + drawer
- `src/main/menus/{app_menu,shortcuts}.ts` — menu + accelerators
- `src/main/shared/{ipc-channels,errors,types}.ts` + `shared/schemas/{settings,ipc,index}.ts` — every schema locked
- `src/main/lib/llm/{types,mock,index}.ts`, `lib/search/{types,mock}.ts`, `lib/storage/kv.ts` — interfaces + mocks
- `src/chrome-renderer/**` — every React component except STUB-marked ones
- `src/page-preload/preload.ts` — 3 responders installed (main does not yet invoke)
- `tests/{omnibox,settings_schema,ipc_schema,session,llm_stubs}.test.ts` — 43 tests green

**STUB (interface only, throws "Phase N"):**
- `src/main/ipc/{handlers.settings,handlers.agent,handlers.page}.ts` — agent/settings mutations
- `src/main/orchestrator/{orchestrator,cancellation}.ts` — pipeline registry shapes
- `src/main/agents/*` — empty exports
- `src/main/lib/llm/{anthropic,openai,gemini,structured}.ts` — adapters
- `src/main/lib/search/brave.ts`
- `src/main/lib/storage/{disk,secrets}.ts`
- `src/chrome-renderer/state/{agent,chat}.ts` — agent/chat slices
- `src/chrome-renderer/components/{OutputFrame,ChatFrame,DefenseCard,AttackCard}.tsx` — placeholder `null` components

## Decisions resolved during Phase 0

- **DR-1:** ✅ Electron (42.4.0) — confirmed.
- **DR-2:** ✅ Electron 42 pinned for Phase 0; revisit at Phase 1.
- **Vite version:** ⚠ Pinned to 7.3.5 because `@vitejs/plugin-react@6` requires Vite 8. Revisit at Phase 1 once plugin-react 6 + Vite 8 ecosystem stabilizes.
- **TypeScript 6.0:** `baseUrl` deprecated — removed from `tsconfig.json` (kept `paths` only).

## Decisions still pending (Phase 1+)

- **DR-3:** Confirm Anthropic as default LLM ([`TECH_STACK.md`](./TECH_STACK.md) §3).
- **DR-4:** Confirm Brave Search as default ([`TECH_STACK.md`](./TECH_STACK.md) §4).
- **DR-5:** Acquire signing certs before v1 ([`TECH_STACK.md`](./TECH_STACK.md) §7.2).
