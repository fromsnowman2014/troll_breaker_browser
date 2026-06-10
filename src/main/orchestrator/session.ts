// Session memory for refinement. Each defense/attack request_id maps to a
// session record that runRefine reads from. Capped at the last 5 refinement
// turns; older turns are evicted (matches the renderer's revert stack depth).
//
// Re-trigger keyword detection (AGENT_DESIGN.md §2.5): when the user says
// things like "다시 팩트체크" / "rescore", refine MAY re-run fact or evaluator
// instead of just rewriting.

import type {
  ChatTurn,
  ShieldResult,
  SwordResult,
} from "../shared/schemas/agents.js";

export type SessionRecord = {
  kind: "defense" | "attack";
  page_url: string;
  base_result: ShieldResult | SwordResult;
  conversation: ChatTurn[];
  current_text: string;
  // Past refinement results, in reverse-chronological order, capped at 5.
  history: string[];
};

const sessions = new Map<string, SessionRecord>();

export function recordSession(request_id: string, rec: SessionRecord): void {
  sessions.set(request_id, rec);
}

export function getSession(request_id: string): SessionRecord | undefined {
  return sessions.get(request_id);
}

export function pushRefinement(request_id: string, refined: string, userInstruction: string): void {
  const rec = sessions.get(request_id);
  if (!rec) return;
  // Push current text onto history before replacing.
  rec.history.unshift(rec.current_text);
  if (rec.history.length > 5) rec.history.length = 5;
  rec.current_text = refined;
  rec.conversation.push({ role: "user", content: userInstruction });
  rec.conversation.push({ role: "assistant", content: refined });
  // Cap conversation at 10 turns (5 user + 5 assistant).
  if (rec.conversation.length > 10) {
    rec.conversation = rec.conversation.slice(-10);
  }
}

export function clearSession(request_id: string): void {
  sessions.delete(request_id);
}

/** True if instruction asks to re-run fact-check / re-score. */
const RE_TRIGGER_PATTERNS = [
  /다시\s*팩트\s*체크/i,
  /팩트\s*다시\s*확인/i,
  /다시\s*점수/i,
  /점수\s*다시/i,
  /rescore/i,
  /re-?score/i,
  /fact\s*check\s*again/i,
  /verify\s*again/i,
];

export type RetriggerKind = "fact" | "score" | null;

export function detectRetrigger(instruction: string): RetriggerKind {
  for (const re of RE_TRIGGER_PATTERNS) {
    if (re.test(instruction)) {
      // Heuristic: "팩트" → fact; "점수" / "score" → score.
      if (/팩트|fact|verify/i.test(instruction)) return "fact";
      if (/점수|score/i.test(instruction)) return "score";
      return "fact"; // default
    }
  }
  return null;
}
