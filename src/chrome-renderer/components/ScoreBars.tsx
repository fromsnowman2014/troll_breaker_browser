// 4-axis score bars (Cynicism / Fact / Punchline / Vibe). Labels the
// weakest axis with "← 최약점".

interface Axes {
  cynicism: number;
  fact: number;
  punchline: number;
  vibe: number;
}

interface Props {
  axes: Axes;
}

const LABELS: Record<keyof Axes, string> = {
  cynicism: "Cynicism",
  fact: "Fact",
  punchline: "Punchline",
  vibe: "Vibe",
};

export function ScoreBars({ axes }: Props) {
  const entries = Object.entries(axes) as Array<[keyof Axes, number]>;
  const weakest = [...entries].sort((a, b) => a[1] - b[1])[0]?.[0];

  return (
    <div className="space-y-2">
      {entries.map(([axis, value]) => (
        <Row
          key={axis}
          label={LABELS[axis]}
          value={value}
          weakest={axis === weakest}
        />
      ))}
    </div>
  );
}

function Row({ label, value, weakest }: { label: string; value: number; weakest: boolean }) {
  const clamped = Math.max(0, Math.min(10, value));
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 shrink-0 text-[var(--color-fg-muted)]">{label}</span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label}: ${value} of 10`}
      >
        <div
          className="h-full"
          style={{
            width: `${(clamped / 10) * 100}%`,
            backgroundColor: weakest ? "var(--color-danger)" : "var(--color-accent)",
          }}
        />
      </div>
      <span className="w-6 text-right font-mono">{value}</span>
      {weakest && <span className="text-[var(--color-danger)]">← 최약점</span>}
    </div>
  );
}
