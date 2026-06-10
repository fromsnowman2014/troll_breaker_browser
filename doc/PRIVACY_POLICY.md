# Truth & Strike 개인정보 처리 방침

> 최종 갱신: 2026-06-10

Truth & Strike (이하 "이 앱")는 백엔드 서버를 운영하지 않습니다. 모든 데이터 처리는 사용자의 기기에서 또는 사용자가 직접 설정한 제3자 API (LLM / 검색) 에서 일어납니다.

---

## 1. 운영 모델

- 이 앱은 **백엔드 서버를 운영하지 않습니다**.
- 사용자 식별자(계정, 이메일, IP 추적 등)를 **수집하지 않습니다**.
- 사용 분석 / 텔레메트리 / 충돌 보고 SDK를 **포함하지 않습니다**.

## 2. 사용자가 입력하는 정보의 흐름

이 앱은 사용자가 명시적으로 다음 버튼을 누를 때만 LLM / 검색 API로 데이터를 전송합니다.

| 버튼 | 전송되는 내용 | 수신처 |
|---|---|---|
| 🛡 Defense | 사용자가 입력한 주장 텍스트 + 현재 탭의 URL | 사용자 설정 LLM (Anthropic / OpenAI / Google) + 사용자 설정 검색 (Brave) |
| ⚔ Attack | 사용자가 입력한 초안 텍스트 + 현재 탭의 URL | 사용자 설정 LLM |
| 채팅 정제 | 정제 지시문 + 직전 결과 | 사용자 설정 LLM |

다음은 **절대 전송되지 않습니다**:
- 다른 탭의 내용
- 페이지의 본문 / DOM / 쿠키 / 폼 입력값
- 방문 기록
- API 키 (사용자가 설정한 외부 API로 보내는 인증 헤더는 예외)

## 3. 로컬에 저장되는 데이터

| 데이터 | 위치 | TTL |
|---|---|---|
| API 키 (LLM, 검색) | OS 키체인 (Electron `safeStorage` 암호화) | 영구 (사용자가 삭제할 때까지) |
| 사용자 설정 | `userData/settings.json` | 영구 |
| Vibe 캐시 | `userData/cache/vibe/<site_id>.json` | 7일 (mtime 기준) |
| Fact 메모 | `userData/cache/fact/<sha256>.json` | 24시간 |
| 세션 (열린 탭 URL) | `userData/session.json` | 영구 |
| 방문 기록 | 세션 메모리 (디스크 미저장, 종료 시 소멸) | 세션만 |
| 정제 대화 기록 | 메모리 (zustand) | 세션만 |

`userData` 위치:
- macOS: `~/Library/Application Support/Truth & Strike/`
- Windows: `%APPDATA%\Truth & Strike\`
- Linux: `~/.config/Truth & Strike/`

## 4. API 키 보안

- 키는 Electron `safeStorage.encryptString()`을 통해 OS 키체인(macOS Keychain / Windows DPAPI / Linux libsecret)으로 암호화됩니다.
- 키는 **메인 프로세스에서만** 복호화되며, 렌더러는 마지막 4자리만 표시 용도로 볼 수 있습니다.
- OS 키체인을 사용할 수 없는 환경 (예: keyring 없는 Linux)에서는 메모리에만 보관되며, 앱 종료 시 사라집니다. 이 상태는 설정 드로어 상단 배너로 표시됩니다.

## 5. 검색 결과 / 출처

- Brave Search API 사용 시 사용자가 입력한 주장이 검색어로 Brave에 전송됩니다.
- Brave는 자체 정책에 따라 처리합니다. (https://search.brave.com/help/privacy-policy)
- 검색 결과의 URL/제목/스니펫만 캐시되며, 캐시는 24시간 후 무효화됩니다.

## 6. 사용자 권리 / 삭제

다음 방법으로 데이터를 삭제할 수 있습니다:

- 설정 → 개인정보 → "방문 기록 삭제" — 쿠키, 캐시, 세션 기록 제거
- 설정 → 개인정보 → "저장된 키 삭제" — 모든 API 키 제거
- 설정 → 개인정보 → "모두 초기화" — 설정을 기본값으로 복원 (키는 그대로 유지)
- 앱 제거 → `userData` 폴더 수동 삭제하면 모든 데이터 제거

## 7. 자동 업데이트

- v0.2 이상에서 `electron-updater`를 통해 GitHub Releases에서 새 버전을 자동 다운로드합니다.
- 업데이트 메타데이터 요청 시 GitHub은 IP를 일시적으로 기록할 수 있습니다 (GitHub 자체 정책).
- 사용자 데이터는 업데이트 과정에서 전송되지 않습니다.

## 8. 어린이

이 앱은 13세 미만 어린이를 대상으로 하지 않습니다. 사용자가 미성년자라면 보호자의 감독 하에 사용해야 합니다.

## 9. 변경

이 정책이 변경되면 새 버전이 릴리즈될 때 함께 갱신됩니다. 큰 변경은 앱의 About 섹션과 GitHub Releases 노트에 명시합니다.

## 10. 문의

- GitHub Issues: https://github.com/fromsnowman2014/troll_breaker_browser/issues
- 이메일: (TBD)

---

## English Summary

Truth & Strike operates **no backend server**. User-entered text (claims/drafts) and the active tab's URL are sent only to user-configured LLM/Search APIs (Anthropic, OpenAI, Google, Brave) when the user explicitly clicks 🛡 Defense, ⚔ Attack, or sends a refinement message. API keys are stored encrypted via the OS keychain. No telemetry, no analytics, no cross-device sync. All local data can be wiped via Settings → Privacy or by uninstalling the app.
