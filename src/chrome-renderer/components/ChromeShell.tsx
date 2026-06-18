// Top-level composition: TabStrip + NavRow at top, Viewport spacer below.
// AgentPanel docks bottom-right when active.

import { useEffect, useLayoutEffect, useRef } from "react";
import { ipc } from "../ipc.js";
import { TabStrip } from "./TabStrip.js";
import { NavRow } from "./NavRow.js";
import { SettingsDrawer } from "./SettingsDrawer.js";
import { FindBar } from "./FindBar.js";
import { Toast } from "./Toast.js";
import { AgentPanel } from "./AgentPanel.js";
import { UpdaterToast } from "./UpdaterToast.js";

export function ChromeShell() {
  const chromeRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef<number>(-1);

  function syncBounds() {
    const el = chromeRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    const rounded = Math.round(h);
    if (rounded === lastSent.current) return;
    lastSent.current = rounded;
    void ipc.tabChromeBounds(rounded);
  }

  useLayoutEffect(() => {
    syncBounds();
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(syncBounds, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div ref={chromeRef} className="z-10 flex flex-col">
        <TabStrip />
        <NavRow />
      </div>
      <main className="relative flex-1" aria-hidden="true">
        <FindBar />
        <AgentPanel />
      </main>
      <SettingsDrawer />
      <Toast />
      <UpdaterToast />
    </div>
  );
}
