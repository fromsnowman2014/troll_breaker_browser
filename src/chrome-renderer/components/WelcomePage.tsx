// 2-step onboarding overlay: welcome → consent.
// Hides once the user dismisses (persisted in localStorage).

import { useState } from "react";
import { t } from "../lib/strings.js";

type Step = "welcome" | "consent";

const STORAGE_KEY = "ts_onboarding_done";

export function needsOnboarding(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

export function WelcomePage({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    onDone();
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
                onClick={finish}
                className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                동의하고 시작
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const stepIndex = step === "welcome" ? 0 : 1;
  return (
    <div className="mx-auto mb-6 flex w-16 justify-between">
      {[0, 1].map((i) => (
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
