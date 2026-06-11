# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # Vite HMR + Electron (live reload)
npm run build                # Production build → out/
npm run typecheck            # tsc -p tsconfig.node.json && tsc -p tsconfig.web.json
npm test                     # Vitest unit tests (131 tests, mocked LLM/search)
npm run test:watch           # Vitest watch mode
npm run test:integration     # Live API tests (requires ANTHROPIC_API_KEY=sk-ant-...)
npm run package:dir          # Unsigned local package → dist/
npm run package              # Signed release build (requires certs + doc/SIGNING.md)
```

Run a single test file:
```bash
npx vitest run tests/omnibox.test.ts
```

## Architecture

Three separate Electron processes with strict isolation:

```
Main Process (Node.js)                Chrome Renderer (React)
  index.ts → window.ts                  ChromeShell.tsx
  tabs/tab_manager.ts                   state/store.ts (Zustand)
  ipc/router.ts → handlers.*           ipc.ts (contextBridge only)
  orchestrator/orchestrator.ts
  agents/{fact,logic,vibe,evaluator}  Page Renderer (sandboxed web)
  lib/{llm,search,storage}              page-preload/preload.ts
  shared/schemas/{ipc,agents,settings}   (3 responders only)
```

**IPC flow for Defense/Attack/Refine:**
- Chrome renderer calls `ipc.ts` → `ui:agent:{defense,attack,refine}` → `router.ts` → `handlers.agent.ts` → `orchestrator.ts`
- Orchestrator emits `evt:agent:{progress,result,error}` back to chrome renderer
- Renderer reads results into `state/agent.ts` → displayed in `OutputFrame` / `DefenseCard` / `AttackCard`

**Key invariants:**
- API keys, LLM calls, file I/O, and cache access are **main-process only**. The renderer never touches these.
- All IPC channels are string constants in `src/main/shared/ipc-channels.ts` — no magic strings.
- Every IPC boundary validates with Zod schemas in `src/main/shared/schemas/`.
- Page preload does only three things: read selection, detect focused textarea, insert text. Nothing else.

## Source Code Map

Before editing any file, consult `doc/CODE_MAP.md`. It maps every module, its responsibilities, and which IPC channels it owns. Update `doc/CODE_MAP.md` in the same commit if your change adds, removes, or renames a module or IPC channel.

When reviewing a task:
1. Find the relevant modules in `doc/CODE_MAP.md`.
2. Read only those files — avoid loading unrelated code.
3. If the change touches an IPC boundary, check the Zod schema first.

## TypeScript Conventions

- TypeScript 6, strict mode, `noUnusedLocals`, `noUncheckedIndexedAccess` all enabled.
- No `baseUrl`. Use path aliases only: `@shared/*` → `src/main/shared/*`, `@renderer/*` → `src/chrome-renderer/*`.
- Module format: ESM in main, CJS in preload scripts. When importing CJS modules (e.g., `cheerio`), use `import mod from "mod"` (default import) — named imports break at runtime.
- Zod 4 is used for all schemas. Do not use `z.object().partial()` as a substitute for explicit optional fields.

## Testing

- Unit tests in `tests/` use mocked LLM and search (`lib/llm/mock.ts`, `lib/search/mock.ts`). Never add real API calls to unit tests.
- Integration tests in `tests/integration/` are slow (60s timeout) and require a real `ANTHROPIC_API_KEY`. Run them manually before release, not in CI by default.
- The `@shared` alias is available in tests via `vitest.config.ts`.
- After any change to agent schemas or IPC schemas, run `npm test` to catch Zod validation failures.

## Data & Storage

| Data | Path | TTL |
|------|------|-----|
| API keys | `userData/secrets.bin` (encrypted via `safeStorage`) | persistent |
| Settings | `userData/settings.json` | persistent |
| Vibe cache | `userData/cache/vibe/<site_id>.json` | 7 days |
| Fact memo | `userData/cache/fact/<sha256>.json` | 24 h |
| Tab session | `userData/session.json` | persistent |

Storage layer: `lib/storage/kv.ts` (interface) → `disk.ts` (prod) / `memory.ts` (tests).

## Karpathy Guidelines (applied to this project)

- **Read before writing.** Load `doc/CODE_MAP.md` first. Understand the full IPC contract before touching any handler or schema.
- **Don't hallucinate structure.** If you're unsure which file owns a responsibility, grep for the IPC channel string or Zod schema type name — don't guess.
- **Smallest diff possible.** Each IPC handler is ≤ 50 lines by design. If your implementation is longer, it belongs in orchestrator or an agent, not a handler.
- **Fail loudly at boundaries.** Zod `.parse()` (throws) not `.safeParse()` (swallows) at IPC entry points. Errors propagate to `evt:agent:error` and surface in the UI.
- **No renderer leakage.** If you find yourself importing anything from `src/main/` into `src/chrome-renderer/`, stop. Move the shared type to `src/main/shared/types.ts`.
