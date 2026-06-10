// In-app privacy policy. Pure presentation; content is dictated by
// doc/PRIVACY_POLICY.md and kept short + bilingual.

import { useUiStore } from "../state/store.js";

export function PrivacyPage({ onClose }: { onClose: () => void }) {
  void useUiStore;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--color-bg)]/95 p-6">
      <div className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-sm leading-relaxed">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">개인정보 처리 방침</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-fg-muted)] hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 text-[var(--color-fg-muted)]">
          <p>
            Truth &amp; Strike는 백엔드 서버를 운영하지 않습니다. 사용자가 입력한 텍스트
            (주장, 초안)와 현재 탭의 URL은 사용자가 명시적으로 🛡 또는 ⚔를 누를 때만
            사용자가 설정한 LLM API (Anthropic / OpenAI / Google) 와 검색 API (Brave)
            로 전송됩니다.
          </p>
          <p>
            <strong className="text-[var(--color-fg)]">저장되는 정보</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>API 키 — OS 키체인에 암호화하여 저장 (Electron safeStorage)</li>
            <li>설정 — 사용자 디렉터리 settings.json</li>
            <li>Vibe 캐시 / Fact 메모 — 사용자 디렉터리 cache/ (TTL 7일/24시간)</li>
            <li>세션 — 종료 시 열린 탭 URL만 저장</li>
          </ul>
          <p>
            <strong className="text-[var(--color-fg)]">수집하지 않는 것</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>텔레메트리 / 분석 데이터 (어떤 종류도 없음)</li>
            <li>브라우징 기록 (세션 동안만 메모리에 보관)</li>
            <li>로그인 정보 / 폼 입력값</li>
          </ul>
          <p>
            <strong className="text-[var(--color-fg)]">삭제 방법</strong>
          </p>
          <p>
            설정 → 개인정보 섹션에서 저장된 키, 방문 기록, 캐시를 모두 삭제할 수
            있습니다. 앱을 제거하면 모든 데이터가 함께 제거됩니다.
          </p>
          <p className="text-xs">
            전체 정책 본문은 <code>doc/PRIVACY_POLICY.md</code>를 참고하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
