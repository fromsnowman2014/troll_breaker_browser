// Right-edge icon rail. Always visible. Floats over the page WebContentsView.
// Clicking the toggle expands the labeled SidebarPanel to its left.

import { useUiStore, type AgentMode } from "../state/store.js";
import { useAgentStore } from "../state/agent.js";
import { useChatStore } from "../state/chat.js";
import { SidebarItem } from "./SidebarItem.js";
import { t } from "../lib/strings.js";

export function SidebarRail() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const bumpUrlBarFocus = useUiStore((s) => s.bumpUrlBarFocus);
  const bumpChatInputFocus = useUiStore((s) => s.bumpChatInputFocus);
  const setPendingMode = useUiStore((s) => s.setPendingAgentMode);
  const pendingMode = useUiStore((s) => s.pendingAgentMode);
  const showPanel = useAgentStore((s) => s.showPanel);
  const clearAgent = useAgentStore((s) => s.clear);
  const closePanel = useAgentStore((s) => s.closePanel);
  const setPrior = useChatStore((s) => s.setPrior);

  function armMode(mode: AgentMode) {
    setPendingMode(mode);
    showPanel();
    bumpChatInputFocus();
  }

  function startNewChat() {
    setPrior(null);
    clearAgent();
    closePanel();
    setPendingMode(null);
  }

  return (
    <div
      className="pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-12 flex-col items-center justify-between border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 py-2 backdrop-blur"
      role="toolbar"
      aria-label={t("sidebar_open")}
    >
      <div className="flex flex-col items-center gap-1">
        <SidebarItem
          icon={collapsed ? "▷" : "◁"}
          label={collapsed ? t("sidebar_open") : t("sidebar_close")}
          onClick={toggle}
        />
        <div className="my-1 h-px w-6 bg-[var(--color-border)]" aria-hidden />
        <SidebarItem icon="✎" label={t("sidebar_new_chat")} onClick={startNewChat} />
        <SidebarItem icon="🔍" label={t("sidebar_search")} onClick={bumpUrlBarFocus} />
        <div className="my-1 h-px w-6 bg-[var(--color-border)]" aria-hidden />
        <SidebarItem
          icon="✓"
          label={t("sidebar_fact_check")}
          onClick={() => armMode("fact-check")}
          active={pendingMode === "fact-check"}
        />
        <SidebarItem
          icon="🛡"
          label={t("sidebar_defense")}
          onClick={() => armMode("defense")}
          active={pendingMode === "defense"}
        />
        <SidebarItem
          icon="⚔"
          label={t("sidebar_attack")}
          onClick={() => armMode("attack")}
          active={pendingMode === "attack"}
        />
      </div>
      <SidebarItem
        icon="⚙"
        label={t("sidebar_settings")}
        onClick={() => setDrawerOpen(true)}
      />
    </div>
  );
}
