// Labeled sidebar panel. Renders to the LEFT of SidebarRail when expanded.
// Same actions as the rail; this view just adds text labels and section headers.

import { useUiStore, type AgentMode } from "../state/store.js";
import { useAgentStore } from "../state/agent.js";
import { useChatStore } from "../state/chat.js";
import { SidebarItem } from "./SidebarItem.js";
import { t } from "../lib/strings.js";

export function SidebarPanel() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const bumpUrlBarFocus = useUiStore((s) => s.bumpUrlBarFocus);
  const bumpChatInputFocus = useUiStore((s) => s.bumpChatInputFocus);
  const setPendingMode = useUiStore((s) => s.setPendingAgentMode);
  const pendingMode = useUiStore((s) => s.pendingAgentMode);
  const showPanel = useAgentStore((s) => s.showPanel);
  const clearAgent = useAgentStore((s) => s.clear);
  const closePanel = useAgentStore((s) => s.closePanel);
  const setPrior = useChatStore((s) => s.setPrior);

  if (collapsed) return null;

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
      className="pointer-events-auto absolute right-12 top-0 z-30 flex h-full w-60 flex-col gap-3 border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 px-2 py-3 backdrop-blur"
      role="navigation"
      aria-label={t("sidebar_open")}
    >
      <div className="flex flex-col gap-1">
        <SidebarItem
          icon="✎"
          label={t("sidebar_new_chat")}
          onClick={startNewChat}
          expanded
        />
        <SidebarItem
          icon="🔍"
          label={t("sidebar_search")}
          onClick={bumpUrlBarFocus}
          expanded
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="px-3 text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
          {t("sidebar_agents")}
        </div>
        <SidebarItem
          icon="✓"
          label={t("sidebar_fact_check")}
          onClick={() => armMode("fact-check")}
          active={pendingMode === "fact-check"}
          expanded
        />
        <SidebarItem
          icon="🛡"
          label={t("sidebar_defense")}
          onClick={() => armMode("defense")}
          active={pendingMode === "defense"}
          expanded
        />
        <SidebarItem
          icon="⚔"
          label={t("sidebar_attack")}
          onClick={() => armMode("attack")}
          active={pendingMode === "attack"}
          expanded
        />
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <SidebarItem
          icon="⚙"
          label={t("sidebar_settings")}
          onClick={() => setDrawerOpen(true)}
          expanded
        />
      </div>
    </div>
  );
}
