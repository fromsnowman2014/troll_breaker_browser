// Agent IPC handlers — Defense fully implemented in Phase 1.
// Attack / Refine throw "not_implemented" (Phase 2).
// Cancel works for any in-flight request.
//
// Pattern:
//   1. ipc handler returns { request_id } synchronously after launching the
//      async pipeline via setImmediate.
//   2. Pipeline emits progress + result/error events on the requesting
//      window's webContents.
//   3. cancellation.ts holds the AbortController per request_id.

import { BrowserWindow } from "electron";
import type { WebContents } from "electron";
import { ulid } from "ulid";
import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { makeError, IpcError, type AppError } from "../shared/errors.js";
import {
  AgentCancelReqSchema,
  AttackRequestSchema,
  DefenseRequestSchema,
  RefineRequestSchema,
} from "../shared/schemas/ipc.js";
import {
  registerRequest,
  abortRequest,
  clearRequest,
} from "../orchestrator/cancellation.js";
import {
  runDefense,
  runAttack,
  runRefine,
  stageLabel,
  type ProgressSink,
} from "../orchestrator/orchestrator.js";
import { buildAgentDeps } from "../orchestrator/deps.js";
import { getSettingsManager } from "./handlers.settings.js";
import type { AgentStage } from "../shared/schemas/agents.js";

function focusedWebContents(): WebContents | null {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  return win?.webContents ?? null;
}

function makeSink(wc: WebContents, request_id: string, signal: AbortSignal): ProgressSink {
  return {
    stage(stage: AgentStage, label?: string) {
      try {
        wc.send(IPC.EVT_AGENT_PROGRESS, {
          request_id,
          stage,
          label: label ?? stageLabel(stage),
        });
      } catch {
        // window may be destroyed
      }
    },
    signal,
  };
}

function toAppError(err: unknown): AppError {
  if (err instanceof IpcError) return err.app;
  if (err instanceof Error) {
    if (err.message === "cancelled") return makeError("cancelled", "Request cancelled");
    if (err.message === "timeout") return makeError("timeout", "Request timed out");
    return makeError("unknown", err.message);
  }
  return makeError("unknown", String(err));
}

export function registerAgentHandlers(): void {
  register<
    { claim: string; page_url: string; textarea_token?: string; pipeline_hint?: "fast" | "standard" | "deep" },
    { request_id: string }
  >(IPC.UI_AGENT_DEFENSE, DefenseRequestSchema, (req) => {
    const request_id = ulid();
    const wc = focusedWebContents();
    if (!wc) throw new IpcError(makeError("unknown", "No window to send results to"));

    const ac = registerRequest(request_id);
    const sink = makeSink(wc, request_id, ac.signal);

    const mgr = getSettingsManager();

    setImmediate(() => {
      void (async () => {
        try {
          await mgr.ensureLoaded();
          const deps = await buildAgentDeps(mgr.current(), mgr.secrets);
          const result = await runDefense(req, deps, sink, request_id);
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_RESULT, { request_id, payload: result });
          } catch {
            // window destroyed
          }
        } catch (err) {
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_ERROR, { request_id, error: toAppError(err) });
          } catch {
            // window destroyed
          }
        } finally {
          clearRequest(request_id);
        }
      })();
    });

    return { request_id };
  });

  register<
    { draft: string; page_url: string; textarea_token?: string; pipeline_hint?: "fast" | "standard" | "deep" },
    { request_id: string }
  >(IPC.UI_AGENT_ATTACK, AttackRequestSchema, (req) => {
    const request_id = ulid();
    const wc = focusedWebContents();
    if (!wc) throw new IpcError(makeError("unknown", "No window to send results to"));

    const ac = registerRequest(request_id);
    const sink = makeSink(wc, request_id, ac.signal);
    const mgr = getSettingsManager();

    setImmediate(() => {
      void (async () => {
        try {
          await mgr.ensureLoaded();
          const deps = await buildAgentDeps(mgr.current(), mgr.secrets);
          const result = await runAttack(req, deps, sink, request_id);
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_RESULT, { request_id, payload: result });
          } catch {
            /* window destroyed */
          }
        } catch (err) {
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_ERROR, { request_id, error: toAppError(err) });
          } catch {
            /* window destroyed */
          }
        } finally {
          clearRequest(request_id);
        }
      })();
    });

    return { request_id };
  });

  register<
    { prior_request_id: string; instruction: string },
    { request_id: string }
  >(IPC.UI_AGENT_REFINE, RefineRequestSchema, (req) => {
    const request_id = ulid();
    const wc = focusedWebContents();
    if (!wc) throw new IpcError(makeError("unknown", "No window to send results to"));

    const ac = registerRequest(request_id);
    const sink = makeSink(wc, request_id, ac.signal);
    const mgr = getSettingsManager();

    setImmediate(() => {
      void (async () => {
        try {
          await mgr.ensureLoaded();
          const deps = await buildAgentDeps(mgr.current(), mgr.secrets);
          const result = await runRefine(req, deps, sink, request_id);
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_RESULT, { request_id, payload: result });
          } catch {
            /* window destroyed */
          }
        } catch (err) {
          if (ac.signal.aborted) return;
          try {
            wc.send(IPC.EVT_AGENT_ERROR, { request_id, error: toAppError(err) });
          } catch {
            /* window destroyed */
          }
        } finally {
          clearRequest(request_id);
        }
      })();
    });

    return { request_id };
  });

  register<{ request_id: string }, { ok: true }>(IPC.UI_AGENT_CANCEL, AgentCancelReqSchema, (req) => {
    abortRequest(req.request_id);
    return { ok: true };
  });
}
