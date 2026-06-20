// Container for OutputFrame + ChatFrame. Floats docked bottom-right.
// Hidden until first 🛡 / ⚔ click (managed via useAgentStore.panelVisible).

import { useAgentStore } from "../state/agent.js";
import { OutputFrame } from "./OutputFrame.js";
import { ChatFrame } from "./ChatFrame.js";
import { t } from "../lib/strings.js";

export function AgentPanel() {
  const visible = useAgentStore((s) => s.panelVisible);
  const closePanel = useAgentStore((s) => s.closePanel);
  const session = useAgentStore((s) => s.session);

  if (!visible) return null;

  return (
    <div
      className={[
        "pointer-events-auto absolute bottom-4 right-16 z-30 flex w-[420px] max-w-[80vw] flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
        "max-h-[70vh]",
      ].join(" ")}
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          <span>
            {session
              ? session.kind === "defense"
                ? "Defense"
                : session.kind === "attack"
                  ? "Attack"
                  : "Refine"
              : t("panel_idle")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={t("panel_close")}
            onClick={closePanel}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        <OutputFrame />
      </div>
      <div className="px-3 pb-3">
        <ChatFrame />
      </div>
    </div>
  );
}
