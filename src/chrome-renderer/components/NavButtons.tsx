import { ipc } from "../ipc.js";
import { useTabStore } from "../state/store.js";

export function NavButtons() {
  const activeId = useTabStore((s) => s.activeId);
  const active = useTabStore((s) => s.tabs.find((t) => t.tab_id === s.activeId));

  const canBack = active?.can_go_back ?? false;
  const canForward = active?.can_go_forward ?? false;
  const loading = active?.is_loading ?? false;

  return (
    <div className="flex h-10 items-center gap-1">
      <button
        aria-label="뒤로"
        disabled={!canBack}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--color-fg)] disabled:opacity-30 hover:bg-white/10"
        onClick={() => activeId && void ipc.tabBack(activeId)}
      >
        ←
      </button>
      <button
        aria-label="앞으로"
        disabled={!canForward}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--color-fg)] disabled:opacity-30 hover:bg-white/10"
        onClick={() => activeId && void ipc.tabForward(activeId)}
      >
        →
      </button>
      <button
        aria-label={loading ? "중지" : "새로고침"}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--color-fg)] hover:bg-white/10"
        onClick={() => activeId && void ipc.tabReload(activeId, false)}
      >
        {loading ? "✕" : "↻"}
      </button>
    </div>
  );
}
