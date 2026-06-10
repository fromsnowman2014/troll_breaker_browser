import { NavButtons } from "./NavButtons.js";
import { UrlBar } from "./UrlBar.js";
import { RightEdgeTrigger } from "./RightEdgeTrigger.js";

export function NavRow() {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3">
      <NavButtons />
      <UrlBar />
      <RightEdgeTrigger />
    </div>
  );
}
