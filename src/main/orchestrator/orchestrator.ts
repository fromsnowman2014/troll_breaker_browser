// STUB — Phase 1 wires Defense / Attack / Refine pipelines. The IPC handlers
// in handlers.agent.ts already throw "not_implemented" so callers see a
// consistent error shape; this module exists for the import contract.

import type {
  DefenseRequest,
  AttackRequest,
  RefineRequest,
} from "../shared/schemas/ipc.js";

export interface ProgressSink {
  stage: (label: string) => void;
  cancelToken: AbortSignal;
}

export async function runDefense(_req: DefenseRequest, _on: ProgressSink): Promise<never> {
  throw new Error("runDefense — Phase 1");
}

export async function runAttack(_req: AttackRequest, _on: ProgressSink): Promise<never> {
  throw new Error("runAttack — Phase 1");
}

export async function runRefine(_req: RefineRequest, _on: ProgressSink): Promise<never> {
  throw new Error("runRefine — Phase 1");
}

export function pickPipeline(text: string): "fast" | "standard" | "deep" {
  return text.length > 500 ? "standard" : "fast";
}
