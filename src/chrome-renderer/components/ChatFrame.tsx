// Chat frame — Defense/Attack buttons + free-form input.
// Phase 2: Attack wired, Refine wired (Enter when result present).

import { useState } from "react";
import { useAgentStore } from "../state/agent.js";
import { useTabStore } from "../state/store.js";
import { useSettingsStore } from "../state/settings.js";
import { useChatStore } from "../state/chat.js";
import { ipc } from "../ipc.js";
import { t } from "../lib/strings.js";

export function ChatFrame() {
  const [input, setInput] = useState("");
  const session = useAgentStore((s) => s.session);
  const startAgent = useAgentStore((s) => s.start);
  const setError = useAgentStore((s) => s.setError);
  const activeTab = useTabStore((s) => s.tabs.find((tab) => tab.tab_id === s.activeId));
  const settings = useSettingsStore((s) => s.view);
  const prior = useChatStore((s) => s.prior_request_id);
  const setPrior = useChatStore((s) => s.setPrior);
  const pushRevert = useChatStore((s) => s.pushRevert);

  const hasKey = settings.key_present.llm.present;
  const loading = session?.status === "loading";
  const hasResult = session?.status === "result";
  const refineMode = hasResult && prior !== null;

  async function runDefense() {
    const claim = input.trim();
    if (!claim || !activeTab || !hasKey) return;
    setPrior(null);
    try {
      const { request_id } = await ipc.agentDefense({
        claim,
        page_url: activeTab.url,
      });
      startAgent("defense", request_id);
      setPrior(request_id);
    } catch (err) {
      const e = err as Error & { code?: string };
      startAgent("defense", "preflight");
      setError({ code: (e.code as never) ?? "unknown", message: e.message });
    }
  }

  async function runAttack() {
    const draft = input.trim();
    if (!draft || !activeTab || !hasKey) return;
    setPrior(null);
    let textarea_token: string | undefined;
    try {
      const focusInfo = await ipc.pageTextareaFocused();
      if (focusInfo.has_focus && focusInfo.token) textarea_token = focusInfo.token;
    } catch {
      // best-effort; token stays undefined
    }
    try {
      const req: Parameters<typeof ipc.agentAttack>[0] = {
        draft,
        page_url: activeTab.url,
      };
      if (textarea_token) req.textarea_token = textarea_token;
      const { request_id } = await ipc.agentAttack(req);
      startAgent("attack", request_id);
      setPrior(request_id);
    } catch (err) {
      const e = err as Error & { code?: string };
      startAgent("attack", "preflight");
      setError({ code: (e.code as never) ?? "unknown", message: e.message });
    }
  }

  async function runRefine() {
    const instruction = input.trim();
    if (!instruction || !prior || !hasKey) return;
    // Capture current rendered text for revert.
    const cur = session?.result;
    if (cur) {
      let text = "";
      if (cur.kind === "shield") text = cur.vibe_adjusted_summary;
      else if (cur.kind === "sword") text = cur.score.final_post;
      else if (cur.kind === "refine") text = cur.refined_text;
      if (text) pushRevert(text);
    }
    try {
      const { request_id } = await ipc.agentRefine({
        prior_request_id: prior,
        instruction,
      });
      startAgent("refine", request_id);
    } catch (err) {
      const e = err as Error & { code?: string };
      startAgent("refine", "preflight");
      setError({ code: (e.code as never) ?? "unknown", message: e.message });
    }
    setInput("");
  }

  const canSubmit = hasKey && input.trim().length > 0 && !loading;
  const primaryAction = refineMode ? runRefine : runDefense;
  const quickActions = ["더 짧게", "더 비꼬게", "팩트 줄이기", "펀치라인 강화"];

  async function fireChip(instruction: string) {
    if (!prior || !hasKey || loading) return;
    const cur = session?.result;
    if (cur) {
      let text = "";
      if (cur.kind === "shield") text = cur.vibe_adjusted_summary;
      else if (cur.kind === "sword") text = cur.score.final_post;
      else if (cur.kind === "refine") text = cur.refined_text;
      if (text) pushRevert(text);
    }
    try {
      const { request_id } = await ipc.agentRefine({
        prior_request_id: prior,
        instruction,
      });
      startAgent("refine", request_id);
    } catch (err) {
      const e = err as Error & { code?: string };
      startAgent("refine", "preflight");
      setError({ code: (e.code as never) ?? "unknown", message: e.message });
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
      <div className="flex gap-2">
        <button
          onClick={() => void runDefense()}
          disabled={!canSubmit}
          aria-label={t("btn_defense")}
          title={!hasKey ? t("no_api_key_tooltip") : undefined}
          className={[
            "inline-flex h-9 items-center gap-1 rounded-full px-4 text-sm transition-colors",
            !canSubmit
              ? "bg-white/5 text-[var(--color-fg-muted)] opacity-60"
              : "bg-[var(--color-accent)] text-white hover:opacity-90",
          ].join(" ")}
        >
          {t("btn_defense")}
        </button>
        <button
          onClick={() => void runAttack()}
          disabled={!canSubmit}
          aria-label={t("btn_attack")}
          title={!hasKey ? t("no_api_key_tooltip") : undefined}
          className={[
            "inline-flex h-9 items-center gap-1 rounded-full px-4 text-sm transition-colors",
            !canSubmit
              ? "bg-white/5 text-[var(--color-fg-muted)] opacity-60"
              : "border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-white/5",
          ].join(" ")}
        >
          {t("btn_attack")}
        </button>
        {refineMode && (
          <span className="ml-2 self-center text-xs text-[var(--color-fg-muted)]">
            Enter = 정제
          </span>
        )}
      </div>
      {refineMode && (
        <div className="flex flex-wrap gap-1">
          {quickActions.map((q) => (
            <button
              key={q}
              onClick={() => void fireChip(q)}
              disabled={loading}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-fg)] disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat_placeholder")}
          rows={2}
          className="flex-1 resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm placeholder:text-[var(--color-fg-muted)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void primaryAction();
            }
          }}
        />
        <button
          aria-label={t("chat_send")}
          onClick={() => void primaryAction()}
          disabled={!canSubmit}
          className="self-end rounded bg-[var(--color-accent)] px-3 py-2 text-sm text-white disabled:opacity-30"
        >
          ▷
        </button>
      </div>
    </div>
  );
}
