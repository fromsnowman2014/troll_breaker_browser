// Agent handlers — entirely stubbed in Phase 0. Schemas are still validated
// so a renderer regression caught early.

import { register } from "./router.js";
import { IPC } from "../shared/ipc-channels.js";
import { makeError, IpcError } from "../shared/errors.js";
import {
  AgentCancelReqSchema,
  AttackRequestSchema,
  DefenseRequestSchema,
  RefineRequestSchema,
} from "../shared/schemas/ipc.js";

function notImplemented(): never {
  throw new IpcError(makeError("not_implemented", "Agent pipelines land in Phase 1"));
}

export function registerAgentHandlers(): void {
  register(IPC.UI_AGENT_DEFENSE, DefenseRequestSchema, () => notImplemented());
  register(IPC.UI_AGENT_ATTACK, AttackRequestSchema, () => notImplemented());
  register(IPC.UI_AGENT_REFINE, RefineRequestSchema, () => notImplemented());
  register(IPC.UI_AGENT_CANCEL, AgentCancelReqSchema, () => notImplemented());
}
