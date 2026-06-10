// 3-step onboarding overlay: welcome → consent → first key.
// Hides once the user has a key set (handled by ChromeShell).

import { useState } from "react";
import { useUiStore } from "../state/store.js";
import { ipc } from "../ipc.js";
import { useSettingsStore } from "../state/settings.js";
import { t } from "../lib/strings.js";

type Step = "welcome" | "consent" | "key";

export function WelcomePage() {
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const refresh = useSettingsStore((s) => s.set);
  const [step, setStep] = useState<Step>("welcome");
  const [draftKey, setDraftKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveKey() {
    if (!draftKey) return;
    setSubmitting(true);
    setError(null);
    try {
      await ipc.settingsPutKey("llm", draftKey);
      const v = await ipc.settingsGet();
      refresh(v);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg)]/95 px-6">
      <div className="w-full max-w-md text-center">
        <StepIndicator step={step} />

        {step === "welcome" && (
          <>
            <h1 className="mb-3 text-3xl font-semibold tracking-tight">
              {t("welcome_title")}
            </h1>
            <p className="mb-8 text-sm text-[var(--color-fg-muted)]">
              {t("welcome_subtitle")}
            </p>
            <p className="mb-6 text-sm leading-relaxed">{t("welcome_body")}</p>
            <button
              onClick={() => setStep("consent")}
              className="rounded-full bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              시작하기
            </button>
          </>
        )}

        {step === "consent" && (
          <>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">데이터 정책</h2>
            <p className="mb-6 text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {t("welcome_privacy")}
            </p>
            <div className="mb-6 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left text-xs text-[var(--color-fg-muted)]">
              <p className="mb-2 font-semibold text-[var(--color-fg)]">전송:</p>
              <ul className="mb-3 list-disc space-y-1 pl-4">
                <li>사용자가 입력한 주장 / 초안 (Defense / Attack 클릭 시에만)</li>
                <li>현재 탭의 URL (vibe 컨텍스트)</li>
              </ul>
              <p className="mb-2 font-semibold text-[var(--color-fg)]">전송하지 않음:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>탭 본문 / 다른 탭 / 쿠키</li>
                <li>방문 기록 / 텔레메트리 (수집 자체 없음)</li>
              </ul>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setStep("welcome")}
                className="rounded-full border border-[var(--color-border)] px-5 py-2 text-sm hover:bg-white/5"
              >
                뒤로
              </button>
              <button
                onClick={() => setStep("key")}
                className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                동의 후 계속
              </button>
            </div>
          </>
        )}

        {step === "key" && (
          <>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">API 키 입력</h2>
            <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
              Anthropic Console에서 발급받은 API 키를 입력하세요. 키는 OS 키체인에
              암호화되어 저장됩니다.
            </p>
            <input
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="sk-ant-..."
              className="mb-3 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveKey();
              }}
            />
            {error && (
              <p className="mb-3 text-xs text-[var(--color-danger)]">{error}</p>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setStep("consent")}
                className="rounded-full border border-[var(--color-border)] px-5 py-2 text-sm hover:bg-white/5"
              >
                뒤로
              </button>
              <button
                onClick={() => void saveKey()}
                disabled={!draftKey || submitting}
                className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {submitting ? "저장 중…" : "저장하고 시작"}
              </button>
            </div>
            <p className="mt-4 text-xs text-[var(--color-fg-muted)]">
              나중에 입력하시려면{" "}
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-[var(--color-accent)] hover:underline"
              >
                설정 드로어
              </button>
              에서도 가능합니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const stepIndex = step === "welcome" ? 0 : step === "consent" ? 1 : 2;
  return (
    <div className="mx-auto mb-6 flex w-24 justify-between">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={[
            "h-2 w-2 rounded-full transition-colors",
            i <= stepIndex ? "bg-[var(--color-accent)]" : "bg-white/10",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
