// "Show vibe used" expandable — click the site name to peek at lexicon / tone
// / few-shots that drove the rewrite. Helps power users diagnose why a rewrite
// reads off-tone.

import { useState } from "react";
import type { VibeProfile } from "../../main/shared/types.js";

export function VibeBadge({ vibe }: { vibe: VibeProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded hover:bg-white/5 hover:text-[var(--color-fg)]"
        aria-expanded={open}
      >
        {vibe.display_name}
        <span className="ml-1 text-[10px]">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-w-sm rounded-card border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-xs shadow-lg">
          <div className="mb-2 text-[var(--color-fg)]">
            <span className="font-semibold">출처:</span>{" "}
            {vibe.source === "seed"
              ? "번들 시드"
              : vibe.source === "sampled"
                ? "라이브 샘플"
                : "기본 fallback"}
          </div>
          <div className="mb-2">
            <span className="font-semibold text-[var(--color-fg)]">톤:</span>{" "}
            <span className="text-[var(--color-fg-muted)]">{vibe.tonality}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold text-[var(--color-fg)]">문장:</span>{" "}
            <span className="text-[var(--color-fg-muted)]">{vibe.sentence_shape}</span>
          </div>
          <div className="mb-2">
            <span className="font-semibold text-[var(--color-fg)]">어휘:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {vibe.lexicon.slice(0, 20).map((w) => (
                <span
                  key={w}
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--color-fg-muted)]"
                >
                  {w}
                </span>
              ))}
              {vibe.lexicon.length > 20 && (
                <span className="text-[10px] text-[var(--color-fg-muted)]">
                  +{vibe.lexicon.length - 20}
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="font-semibold text-[var(--color-fg)]">예시:</span>
            <ul className="mt-1 space-y-1">
              {vibe.few_shot_posts.slice(0, 3).map((p, i) => (
                <li key={i} className="text-[var(--color-fg-muted)]">
                  • {p.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
