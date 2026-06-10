// Phase 0: minimal toast surface — used by SettingsDrawer / future copy
// confirmations. No live integration yet beyond rendering a transient banner.

import { useEffect, useState } from "react";

let listeners: ((msg: string | null) => void)[] = [];

export function showToast(message: string): void {
  for (const fn of listeners) fn(message);
}

export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const fn = (m: string | null) => {
      setMsg(m);
      if (m) setTimeout(() => setMsg(null), 1500);
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((x) => x !== fn);
    };
  }, []);

  if (!msg) return null;
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-md bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-fg)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
      {msg}
    </div>
  );
}
