// Output frame — host for Defense/Attack result cards. Renders one of:
//   - loading: stage label + spinner
//   - result: <DefenseCard /> | <AttackCard /> | refine refresh
//   - error: red banner with retry CTA

import { useAgentStore } from "../state/agent.js";
import { useChatStore } from "../state/chat.js";
import { DefenseCard } from "./DefenseCard.js";
import { AttackCard } from "./AttackCard.js";
import { t } from "../lib/strings.js";
import type { AgentStage } from "../../main/shared/types.js";

const STAGE_KEY: Record<AgentStage, Parameters<typeof t>[0]> = {
  "vibe.lookup": "stage_vibe_lookup",
  "fact.check": "stage_fact_check",
  "logic.detect": "stage_logic_detect",
  "vibe.rewrite": "stage_vibe_rewrite",
  "evaluator.score": "stage_evaluator_score",
  "vibe.finalize": "stage_vibe_finalize",
  "refine.rewrite": "stage_refine_rewrite",
};

const ERR_KEY: Record<string, Parameters<typeof t>[0]> = {
  no_api_key: "err_no_api_key",
  llm_unreachable: "err_llm_unreachable",
  search_unreachable: "err_search_unreachable",
  timeout: "err_timeout",
  cancelled: "err_cancelled",
};

export function OutputFrame() {
  const session = useAgentStore((s) => s.session);
  const revertCount = useChatStore((s) => s.revertStack.length);
  const popRevert = useChatStore((s) => s.popRevert);

  if (!session) {
    return (
      <div className="text-xs text-[var(--color-fg-muted)]">
        {t("panel_idle_hint")}
      </div>
    );
  }

  if (session.status === "loading") {
    const stage = session.stage;
    const label = stage ? t(STAGE_KEY[stage]) : t("stage_loading");
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
          {label}
        </div>
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (session.status === "error") {
    const code = session.error?.code ?? "unknown";
    const messageKey = ERR_KEY[code] ?? "err_unknown";
    return (
      <div
        role="alert"
        className="rounded-card border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]"
      >
        <div className="font-medium">{t(messageKey)}</div>
        {session.error?.message && (
          <div className="mt-1 text-xs opacity-80">{session.error.message}</div>
        )}
      </div>
    );
  }

  const payload = session.result;
  if (!payload) return null;

  return (
    <div className="space-y-3">
      {revertCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const prev = popRevert();
              if (prev && session.result?.kind === "refine") {
                useAgentStore.getState().setResult({
                  ...session.result,
                  refined_text: prev,
                });
              }
            }}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            ↶ 이전 ({revertCount})
          </button>
        </div>
      )}
      {payload.kind === "shield" && <DefenseCard result={payload} />}
      {payload.kind === "sword" && <AttackCard result={payload} />}
      {payload.kind === "refine" && (
        <div className="whitespace-pre-wrap rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm leading-relaxed">
          {payload.refined_text}
        </div>
      )}
    </div>
  );
}
