// Agent session state — the current Defense / Attack / Refine in flight or
// completed. One session at a time per window in Phase 1. New invocation
// clears the previous session.

import { create } from "zustand";
import type {
  AgentResultPayload,
  AgentStage,
  AppError,
} from "../../main/shared/types.js";

export type SessionKind = "defense" | "attack" | "refine";

export type SessionStatus = "loading" | "result" | "error";

export interface AgentSession {
  request_id: string;
  kind: SessionKind;
  status: SessionStatus;
  stage?: AgentStage;
  stage_label?: string;
  result?: AgentResultPayload;
  error?: AppError;
  started_at: number;
}

interface AgentStoreShape {
  panelVisible: boolean;
  session: AgentSession | null;
  start: (kind: SessionKind, request_id: string) => void;
  setStage: (stage: AgentStage, label?: string) => void;
  setResult: (result: AgentResultPayload) => void;
  setError: (error: AppError) => void;
  closePanel: () => void;
  showPanel: () => void;
  clear: () => void;
}

export const useAgentStore = create<AgentStoreShape>((set) => ({
  panelVisible: false,
  session: null,
  start: (kind, request_id) =>
    set({
      panelVisible: true,
      session: {
        request_id,
        kind,
        status: "loading",
        started_at: Date.now(),
      },
    }),
  setStage: (stage, label) =>
    set((s) => ({
      session: s.session ? { ...s.session, stage, stage_label: label ?? "" } : s.session,
    })),
  setResult: (result) =>
    set((s) => ({
      session: s.session ? { ...s.session, status: "result", result } : s.session,
    })),
  setError: (error) =>
    set((s) => ({
      session: s.session ? { ...s.session, status: "error", error } : s.session,
    })),
  closePanel: () => set({ panelVisible: false, session: null }),
  showPanel: () => set({ panelVisible: true }),
  clear: () => set({ session: null }),
}));
