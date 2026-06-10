// Defense (Shield) result card. Phase 4 adds source pin/hide controls.

import { useState } from "react";
import type { Fallacy, ShieldResult, Source } from "../../main/shared/types.js";
import { t } from "../lib/strings.js";
import { VibeBadge } from "./VibeBadge.js";
import { useChatStore } from "../state/chat.js";

interface Props {
  result: ShieldResult;
}

export function DefenseCard({ result }: Props) {
  const verdictColor: Record<typeof result.fact.verdict, string> = {
    true: "var(--color-success)",
    false: "var(--color-danger)",
    mixed: "var(--color-warning)",
    unverifiable: "var(--color-fg-muted)",
  };
  const verdictText: Record<typeof result.fact.verdict, string> = {
    true: t("verdict_true"),
    false: t("verdict_false"),
    mixed: t("verdict_mixed"),
    unverifiable: t("verdict_unverifiable"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
        <span>● Defense</span>
        <span aria-hidden>·</span>
        <VibeBadge vibe={result.vibe_used} />
        <span aria-hidden>·</span>
        <span>{result.pipeline}</span>
      </div>

      <div>
        <div className="mb-1 text-xs text-[var(--color-fg-muted)]">⚠ 주장</div>
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs">
          "{result.claim_excerpt}"
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: verdictColor[result.fact.verdict], color: "#000" }}
        >
          {verdictText[result.fact.verdict]}
        </span>
        <span className="text-xs text-[var(--color-fg-muted)]">
          신뢰도 {Math.round(result.fact.confidence * 100)}%
        </span>
      </div>

      <div className="whitespace-pre-wrap rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm leading-relaxed">
        {result.vibe_adjusted_summary}
        <CopyButton text={result.vibe_adjusted_summary} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          📎 {t("sources_label")}
        </div>
        <SourcesList sources={result.fact.sources} />
      </div>

      {result.fallacies.length > 0 && <FallacyBlock fallacies={result.fallacies} />}
    </div>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  const pinned = useChatStore((s) => s.pinnedSourceUrls);
  const hidden = useChatStore((s) => s.hiddenSourceUrls);
  const pinSource = useChatStore((s) => s.pinSource);
  const unpinSource = useChatStore((s) => s.unpinSource);
  const hideSource = useChatStore((s) => s.hideSource);
  const unhideSource = useChatStore((s) => s.unhideSource);

  if (sources.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-fg-muted)]">
        {t("no_sources")}
      </div>
    );
  }

  // Sort: pinned first, hidden last.
  const ordered = [...sources].sort((a, b) => {
    const ap = pinned.has(a.url) ? -1 : 0;
    const bp = pinned.has(b.url) ? -1 : 0;
    if (ap !== bp) return ap - bp;
    const ah = hidden.has(a.url) ? 1 : 0;
    const bh = hidden.has(b.url) ? 1 : 0;
    return ah - bh;
  });

  return (
    <ul className="space-y-1">
      {ordered.map((src) => {
        const isPinned = pinned.has(src.url);
        const isHidden = hidden.has(src.url);
        return (
          <li
            key={src.url}
            className={[
              "group flex items-start gap-2 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs transition-opacity",
              isHidden && "opacity-30",
              isPinned && "border-[var(--color-accent)]/40",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isPinned && (
              <span className="text-[10px] text-[var(--color-accent)]" aria-label="핀">
                📌
              </span>
            )}
            <div className="flex-1">
              <div className="font-medium">{src.title}</div>
              <div className="text-[var(--color-fg-muted)]">
                {src.publisher ?? safeHostname(src.url)}
                {src.published_at ? ` — ${src.published_at}` : ""}
              </div>
              {src.snippet && (
                <div className="mt-1 text-[var(--color-fg-muted)]">{src.snippet}</div>
              )}
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => (isPinned ? unpinSource(src.url) : pinSource(src.url))}
                aria-label={isPinned ? "핀 해제" : "핀"}
                title={isPinned ? "핀 해제" : "핀 (정제 시 유지)"}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
              >
                📌
              </button>
              <button
                onClick={() => (isHidden ? unhideSource(src.url) : hideSource(src.url))}
                aria-label={isHidden ? "복원" : "숨김"}
                title={isHidden ? "복원" : "이번 세션에서만 숨김"}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
              >
                {isHidden ? "↺" : "✕"}
              </button>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("open_link")}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
              >
                ↗
              </a>
              <CopyButton text={src.url} small />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const FALLACY_LABEL: Record<Fallacy["type"], string> = {
  ad_hominem: "인신공격",
  straw_man: "허수아비",
  whataboutism: "물타기",
  false_dichotomy: "이분법 오류",
  slippery_slope: "미끄러운 경사",
  appeal_to_authority: "권위 호소",
  tu_quoque: "피장파장",
  circular_reasoning: "순환 논리",
  hasty_generalization: "성급한 일반화",
  other: "기타 오류",
};

function FallacyBlock({ fallacies }: { fallacies: Fallacy[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
        🧠 논리적 허점 ({fallacies.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {fallacies.map((f, i) => (
          <button
            key={i}
            onClick={() => setExpanded(expanded === i ? null : i)}
            className={[
              "rounded-full border px-2 py-1 text-xs transition-colors",
              expanded === i
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] hover:bg-white/5",
            ].join(" ")}
          >
            {FALLACY_LABEL[f.type]}
          </button>
        ))}
      </div>
      {expanded !== null && fallacies[expanded] && (
        <div className="mt-2 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs">
          <div className="text-[var(--color-fg-muted)]">
            "{fallacies[expanded]!.verbatim}"
          </div>
          <div className="mt-1">{fallacies[expanded]!.explanation}</div>
          <div className="mt-2 italic text-[var(--color-accent)]">
            → {fallacies[expanded]!.counter_punch}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  return (
    <button
      aria-label={t("copy")}
      className={[
        "inline-flex items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]",
        small ? "h-6 w-6 text-xs" : "ml-2 h-5 px-2 text-[10px]",
      ].join(" ")}
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      📋
    </button>
  );
}
