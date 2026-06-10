// Attack (Sword) result card. Renders:
//   - score bars
//   - line critique
//   - contenteditable final post
//   - Copy / Insert buttons (Insert only enabled when page textarea is focused)

import { useEffect, useRef, useState } from "react";
import type { SwordResult } from "../../main/shared/types.js";
import { ScoreBars } from "./ScoreBars.js";
import { VibeBadge } from "./VibeBadge.js";
import { ipc } from "../ipc.js";

interface Props {
  result: SwordResult;
}

export function AttackCard({ result }: Props) {
  const [text, setText] = useState(result.score.final_post);
  const [tokenState, setTokenState] = useState<{ token: string | null; hint?: string }>({
    token: null,
  });
  const [insertStatus, setInsertStatus] = useState<null | "ok" | "stale" | "unavailable">(null);
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(result.score.final_post);
  }, [result.score.final_post]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await ipc.pageTextareaFocused();
        if (r.has_focus && r.token) {
          setTokenState({ token: r.token, ...(r.hint && { hint: r.hint }) });
        } else {
          setTokenState({ token: null });
        }
      } catch {
        setTokenState({ token: null });
      }
    })();
  }, [result.request_id]);

  async function copyText() {
    await navigator.clipboard.writeText(text);
  }

  async function insertText() {
    if (!tokenState.token) return;
    try {
      const r = await ipc.pageTextareaInsert(tokenState.token, text);
      if (r.ok) setInsertStatus("ok");
      else if (r.reason === "textarea_token_stale") setInsertStatus("stale");
      else setInsertStatus("unavailable");
    } catch {
      setInsertStatus("unavailable");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
        <span>● Attack</span>
        <span aria-hidden>·</span>
        <VibeBadge vibe={result.vibe_used} />
        <span aria-hidden>·</span>
        <span>{result.pipeline}</span>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          📊 점수
        </div>
        <ScoreBars axes={result.score.axes} />
      </div>

      {result.score.line_critique.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            ✏ 라인 코멘트
          </div>
          <ul className="space-y-1">
            {result.score.line_critique.map((c, i) => (
              <li
                key={i}
                className="rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs"
              >
                <div className="text-[var(--color-fg-muted)]">"{c.verbatim}"</div>
                <div className="mt-1">{c.note}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          ✨ 최종 개념글
        </div>
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setText(e.currentTarget.textContent ?? "")}
          className="whitespace-pre-wrap rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          dangerouslySetInnerHTML={{ __html: escapeHtml(text) }}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => void copyText()}
            className="rounded border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-white/10"
          >
            📋 복사
          </button>
          <button
            onClick={() => void insertText()}
            disabled={!tokenState.token}
            title={
              !tokenState.token
                ? "페이지에서 입력란을 먼저 클릭하세요"
                : (tokenState.hint ?? "선택된 입력란")
            }
            className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            → 페이지 입력란에 적용
          </button>
          {insertStatus === "ok" && (
            <span className="text-xs text-[var(--color-success)]">✓ 적용됨</span>
          )}
          {insertStatus === "stale" && (
            <span className="text-xs text-[var(--color-warning)]">
              ✗ 입력란을 다시 클릭하세요
            </span>
          )}
          {insertStatus === "unavailable" && (
            <span className="text-xs text-[var(--color-danger)]">✗ 적용 불가</span>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
