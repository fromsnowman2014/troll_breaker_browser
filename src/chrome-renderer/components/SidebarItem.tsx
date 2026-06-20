// Shared item used by SidebarRail (icon-only) and SidebarPanel (icon + label).

interface SidebarItemProps {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  expanded?: boolean;
}

export function SidebarItem({ icon, label, onClick, active, expanded }: SidebarItemProps) {
  if (expanded) {
    return (
      <button
        onClick={onClick}
        aria-label={label}
        className={[
          "flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
          active
            ? "bg-white/10 text-[var(--color-fg)]"
            : "text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-[var(--color-fg)]",
        ].join(" ")}
      >
        <span aria-hidden className="inline-flex w-5 justify-center text-base">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-base transition-colors",
        active
          ? "bg-white/10 text-[var(--color-fg)]"
          : "text-[var(--color-fg-muted)] hover:bg-white/10 hover:text-[var(--color-fg)]",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}
