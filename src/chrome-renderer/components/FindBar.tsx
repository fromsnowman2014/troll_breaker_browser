import { useEffect, useRef } from "react";
import { ipc } from "../ipc.js";
import { useTabStore, useUiStore, useFindStore } from "../state/store.js";
import { t } from "../lib/strings.js";
import { IPC } from "../ipc.js";

export function FindBar() {
  const open = useUiStore((s) => s.findOpen);
  const setOpen = useUiStore((s) => s.setFindOpen);
  const activeId = useTabStore((s) => s.activeId);
  const query = useFindStore((s) => s.query);
  const matches = useFindStore((s) => s.matches);
  const active = useFindStore((s) => s.active);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const off = ipc.on(IPC.EVT_TAB_FIND_RESULT, (raw) => {
      const e = raw as { tab_id: string; active: number; matches: number };
      useFindStore.getState().setResult(e.active, e.matches);
    });
    return off;
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  if (!open) return null;

  function onChange(value: string) {
    useFindStore.getState().setQuery(value);
    if (!activeId) return;
    if (value.trim().length === 0) {
      void ipc.tabFindStop(activeId);
      useFindStore.getState().setResult(0, 0);
      return;
    }
    void ipc.tabFindStart(activeId, value);
  }

  function close() {
    setOpen(false);
    useFindStore.getState().setQuery("");
    useFindStore.getState().setResult(0, 0);
    if (activeId) void ipc.tabFindStop(activeId);
  }

  return (
    <div className="pointer-events-auto absolute right-4 top-2 z-30 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={t("find_placeholder")}
        className="h-7 w-48 text-sm placeholder:text-[var(--color-fg-muted)]"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (activeId && query) {
              void ipc.tabFindNext(activeId, !e.shiftKey);
            }
          }
        }}
      />
      <span className="min-w-[40px] text-xs text-[var(--color-fg-muted)]">
        {matches > 0 ? `${active}/${matches}` : query.length > 0 ? "0/0" : ""}
      </span>
      <button
        aria-label="이전"
        disabled={matches === 0}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)] disabled:opacity-30"
        onClick={() => activeId && void ipc.tabFindNext(activeId, false)}
      >
        ↑
      </button>
      <button
        aria-label="다음"
        disabled={matches === 0}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)] disabled:opacity-30"
        onClick={() => activeId && void ipc.tabFindNext(activeId, true)}
      >
        ↓
      </button>
      <button
        aria-label="닫기"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
        onClick={close}
      >
        ✕
      </button>
    </div>
  );
}
