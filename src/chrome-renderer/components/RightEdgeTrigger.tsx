import { useUiStore } from "../state/store.js";

export function RightEdgeTrigger() {
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  return (
    <button
      aria-label="설정"
      aria-pressed={drawerOpen}
      className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--color-accent)] hover:bg-white/10"
      onClick={() => setDrawerOpen(!drawerOpen)}
    >
      ✦
    </button>
  );
}
