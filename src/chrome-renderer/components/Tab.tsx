import { useState } from "react";
import type { TabSummary } from "../../main/shared/types.js";

type Props = {
  tab: TabSummary;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
};

export function Tab({ tab, active, onSelect, onClose }: Props) {
  const [hover, setHover] = useState(false);
  const displayTitle = tab.title.trim() || tab.url.replace(/^https?:\/\//, "") || "새 탭";
  return (
    <div
      role="tab"
      aria-selected={active}
      className={[
        "group flex h-9 min-w-[60px] max-w-[200px] cursor-pointer items-center gap-2 rounded-t-md px-3 text-sm transition-colors",
        active
          ? "bg-[var(--color-bg-elev)] text-[var(--color-fg)]"
          : "bg-transparent text-[var(--color-fg-muted)] hover:bg-white/[0.04]",
      ].join(" ")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      onAuxClick={(e) => {
        if (e.button === 1) onClose();
      }}
    >
      {tab.favicon_url ? (
        <img src={tab.favicon_url} alt="" className="h-4 w-4 shrink-0" />
      ) : (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-white/10 text-[10px]">
          {displayTitle.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="truncate">{tab.is_loading ? "로드 중…" : displayTitle}</span>
      {(hover || active) && (
        <button
          aria-label="탭 닫기"
          className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
