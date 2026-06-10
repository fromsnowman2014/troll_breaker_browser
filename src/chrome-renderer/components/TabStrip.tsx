import { ipc } from "../ipc.js";
import { useTabStore } from "../state/store.js";
import { Tab } from "./Tab.js";

export function TabStrip() {
  const tabs = useTabStore((s) => s.tabs);
  const activeId = useTabStore((s) => s.activeId);

  async function openBlank() {
    const { tab_id } = await ipc.tabOpen("about:blank");
    const list = await ipc.tabList();
    useTabStore.setState({ tabs: list, activeId: tab_id });
  }

  async function selectTab(id: string) {
    await ipc.tabSwitch(id);
    useTabStore.setState({ activeId: id });
  }

  async function closeTab(id: string) {
    await ipc.tabClose(id);
    const list = await ipc.tabList();
    const next = activeId === id ? (list[list.length - 1]?.tab_id ?? null) : activeId;
    useTabStore.setState({ tabs: list, activeId: next });
  }

  return (
    <div className="flex h-9 items-end gap-1 overflow-x-auto bg-[var(--color-bg)] px-2 pt-1 [-webkit-app-region:drag]">
      <div className="flex w-16 shrink-0">{/* macOS traffic lights spacer */}</div>
      <div className="flex flex-1 items-end gap-0.5 overflow-x-auto [-webkit-app-region:no-drag]">
        {tabs.map((t) => (
          <Tab
            key={t.tab_id}
            tab={t}
            active={t.tab_id === activeId}
            onSelect={() => void selectTab(t.tab_id)}
            onClose={() => void closeTab(t.tab_id)}
          />
        ))}
        <button
          aria-label="새 탭"
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)] [-webkit-app-region:no-drag]"
          onClick={() => void openBlank()}
        >
          +
        </button>
      </div>
    </div>
  );
}
