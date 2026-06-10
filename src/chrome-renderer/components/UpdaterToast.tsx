// Updater status banner. Subscribes to evt:updater:status and surfaces:
//   - "다운로드 중 NN%" toast while installing
//   - "재시작하여 업데이트 설치" CTA when ready
//   - hidden otherwise (we don't bother the user about every check)

import { useEffect, useState } from "react";
import { ipc, IPC } from "../ipc.js";

type Status =
  | { kind: "checking" }
  | { kind: "available"; version: string }
  | { kind: "not_available" }
  | { kind: "downloading"; percent: number }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

export function UpdaterToast() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const off = ipc.on(IPC.EVT_UPDATER_STATUS, (raw) => {
      setStatus(raw as Status);
    });
    return off;
  }, []);

  if (!status) return null;
  if (status.kind === "checking" || status.kind === "not_available") return null;

  if (status.kind === "downloading") {
    return (
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-md bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-fg)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
        업데이트 다운로드 중 {status.percent}%
      </div>
    );
  }

  if (status.kind === "ready") {
    return (
      <div
        role="alert"
        className="pointer-events-auto absolute bottom-4 left-4 z-30 flex items-center gap-3 rounded-md border border-[var(--color-accent)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-fg)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
      >
        <span>v{status.version} 준비됨</span>
        <button
          onClick={() => void ipc.updaterInstall()}
          className="rounded bg-[var(--color-accent)] px-2 py-1 text-white"
        >
          재시작
        </button>
        <button
          onClick={() => setStatus(null)}
          aria-label="닫기"
          className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          ✕
        </button>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div
        role="alert"
        className="pointer-events-auto absolute bottom-4 left-4 z-30 flex items-center gap-3 rounded-md border border-[var(--color-danger)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-danger)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
      >
        <span>업데이트 오류: {status.message.slice(0, 60)}</span>
        <button
          onClick={() => setStatus(null)}
          aria-label="닫기"
          className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          ✕
        </button>
      </div>
    );
  }

  // status.kind === "available" — silent (we autoDownload)
  return null;
}
