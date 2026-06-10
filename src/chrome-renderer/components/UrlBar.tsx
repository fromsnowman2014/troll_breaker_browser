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

  // Mirror active tab URL into the input unless user is mid-edit.
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

  function submit(value: string) {
    if (!activeId) return;
    const result = parseOmnibox(value);
    if (result.kind === "noop") return;
    void ipc.tabNavigate(activeId, result.url);
    setEditing(false);
    inputRef.current?.blur();
  }

  return (
    <form
      className="flex h-10 flex-1 items-center"
      onSubmit={(e) => {
        e.preventDefault();
        submit(draft);
      }}
    >
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
          placeholder={t("url_bar_placeholder")}
          className="h-full flex-1 text-sm placeholder:text-[var(--color-fg-muted)]"
          onChange={(e) => {
            setEditing(true);
            setDraft(e.target.value);
          }}
          onFocus={(e) => {
            setEditing(true);
            e.target.select();
          }}
          onBlur={() => {
            setEditing(false);
            setDraft(active?.url ?? "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(active?.url ?? "");
              setEditing(false);
              inputRef.current?.blur();
            }
          }}
        />
      </div>
    </form>
  );
}
