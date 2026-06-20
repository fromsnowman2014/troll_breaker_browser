// URL bar (omnibox). Behavior mirrors mainstream browsers (Chrome/Safari/
// Firefox):
//   - Enter on the input submits the parsed value (URL or search query).
//   - Esc reverts the draft to the active tab's URL and blurs.
//   - Focus auto-selects the full URL (so the next keystroke replaces it).
//   - Blur does NOT submit and does NOT reset the draft — it just stops
//     editing. The mirror effect then re-syncs to the active URL.
//
// Previously we wrapped the input in a <form onSubmit> and called blur()
// inside submit(). That sequence let onBlur reset `draft` and `editing`
// before the form actually fired in some Chromium edge cases, swallowing
// the navigation. We now handle Enter directly in onKeyDown — no form, no
// race.

import { useEffect, useRef, useState } from "react";
import { ipc } from "../ipc.js";
import { useTabStore, useUiStore } from "../state/store.js";
import { parseOmnibox } from "../../main/tabs/omnibox.js";
import { t } from "../lib/strings.js";

export function UrlBar() {
  const activeId = useTabStore((s) => s.activeId);
  const active = useTabStore((s) => s.tabs.find((tab) => tab.tab_id === s.activeId));
  const focusToken = useUiStore((s) => s.urlBarFocusToken);

  const [draft, setDraft] = useState(active?.url ?? "");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mirror active tab URL into the input unless the user is mid-edit.
  useEffect(() => {
    if (!editing) setDraft(active?.url ?? "");
  }, [active?.url, editing]);

  // Cmd+L focuses + selects all.
  useEffect(() => {
    if (focusToken === 0) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [focusToken]);

  function submit() {
    if (!activeId) {
      console.warn("[UrlBar] submit skipped — no active tab");
      return;
    }
    const value = draft.trim();
    const result = parseOmnibox(value);
    if (result.kind === "noop") {
      console.warn("[UrlBar] omnibox returned noop for value:", JSON.stringify(value));
      return;
    }
    console.info("[UrlBar] navigate →", result.url);
    void ipc.tabNavigate(activeId, result.url).then(
      () => {
        // Successful dispatch — stop editing so the mirror effect can re-sync
        // to whatever the tab reports back (via evt:tab:url).
        setEditing(false);
        inputRef.current?.blur();
      },
      (err) => {
        console.error("[UrlBar] tabNavigate failed:", err);
      },
    );
  }

  return (
    <div className="flex h-10 flex-1 items-center">
      <div className="flex h-10 flex-1 items-center rounded-full bg-[var(--color-bg-elev)] px-4 transition-colors focus-within:bg-[#23232a]">
        <span
          className="mr-2 text-xs text-[var(--color-fg-muted)]"
          aria-label={active?.url?.startsWith("https://") ? "보안" : "비보안"}
        >
          {active?.url?.startsWith("https://") ? "🔒" : active?.url?.startsWith("http://") ? "⚠" : "·"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={t("url_bar_placeholder")}
          className="h-full flex-1 text-sm placeholder:text-[var(--color-fg-muted)]"
          onChange={(e) => {
            setEditing(true);
            setDraft(e.target.value);
          }}
          onFocus={(e) => {
            setEditing(true);
            // Defer select so Chromium has applied focus first; without this
            // the select happens before the field is fully focused and
            // immediately collapses when the click finishes.
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={() => {
            // Stop editing but do NOT reset draft here — that fights with
            // submit() and breaks Enter. The mirror effect handles resync.
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              submit();
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(active?.url ?? "");
              setEditing(false);
              inputRef.current?.blur();
              return;
            }
          }}
        />
      </div>
    </div>
  );
}
