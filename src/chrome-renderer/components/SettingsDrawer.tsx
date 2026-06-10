import { useEffect } from "react";
import { useUiStore } from "../state/store.js";
import { t } from "../lib/strings.js";
import { ipc } from "../ipc.js";

export function SettingsDrawer() {
  const open = useUiStore((s) => s.drawerOpen);
  const setOpen = useUiStore((s) => s.setDrawerOpen);

  useEffect(() => {
    if (open) void ipc.drawerOpen();
    else void ipc.drawerClose();
  }, [open]);

  return (
    <>
      {/* Dim layer — captures viewport clicks to dismiss. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          "pointer-events-none fixed inset-0 z-40 bg-black/30 transition-opacity duration-150",
          open ? "pointer-events-auto opacity-100" : "opacity-0",
        ].join(" ")}
      />
      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("drawer_title")}
        className={[
          "fixed right-0 top-0 z-50 flex h-screen w-[360px] max-w-[90vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
          "transition-transform duration-[180ms] ease-out will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
          <h2 className="text-sm font-semibold">{t("drawer_title")}</h2>
          <button
            aria-label={t("drawer_close")}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-[var(--color-fg-muted)]">
          <p className="mb-2 text-[var(--color-fg)]">Phase 0 — 셸만 동작합니다.</p>
          <p className="leading-relaxed">{t("drawer_placeholder")}</p>
          <div className="mt-6 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
            <p className="text-xs">앞으로 들어올 항목:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              <li>LLM provider / model / API key</li>
              <li>Search provider / API key</li>
              <li>Default site vibe</li>
              <li>Privacy controls</li>
              <li>About / licenses</li>
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
