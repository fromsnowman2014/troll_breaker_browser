# 사용자 작업 가이드 — Phase 1~5 완료

> Phase 0~5 모든 코드 작업이 끝났습니다. 아래 절차로 직접 검증하세요.

---

## A. 첫 실행 전 준비 (필수)

1. **Node.js 22 이상**
   ```bash
   node --version   # v22.x 이상
   ```

2. **의존성 설치**
   ```bash
   cd /Users/seinoh/Desktop/github/troll_breaker_browser
   npm install
   ```
   첫 설치는 약 200MB (Electron 42 바이너리 포함).

3. **Electron 바이너리 확인**
   ```bash
   ls node_modules/electron/dist/ 2>/dev/null || node node_modules/electron/install.js
   ```

4. **자동 검증**
   ```bash
   npm run typecheck   # 0 에러
   npm test            # 131개 모두 통과
   npm run build       # 3개 타겟 모두 빌드 성공
   ```

5. **개발 서버 시작**
   ```bash
   npm run dev
   ```

---

## B. Phase별 수동 검증 시나리오

### Phase 1 — Defense Fast 모드

1. 첫 실행 → **WelcomePage 오버레이** 표시 (3-step: welcome → consent → key)
2. "시작하기" → "동의 후 계속" → API 키 입력란 → Anthropic 콘솔 (https://console.anthropic.com/) 에서 발급받은 키 입력 → "저장하고 시작"
3. WelcomePage 사라짐 → 정상 빈 새 탭
4. ✦ 버튼 → 설정 드로어 → API 키 `••••XXXX` 표시 + "연결 테스트" → 녹색 체크 + 레이턴시
5. fmkorea.com 이동 → 채팅 입력 "이거 진짜야?" → 🛡 Defense → 8초 내 진행 단계 (사이트 분위기 → 사실 확인 → 톤 적용) → 인용 출처 + verdict + fmkorea 톤 답변
6. 종료 후 재실행 → 키 영속 (`••••XXXX` 유지) + 탭 복원

### Phase 2 — Attack + 정제

1. fmkorea.com 댓글 textarea 클릭 (포커스 둔다)
2. 채팅 입력에 200자 초안 → ⚔ Attack → 5초 내 결과
3. AttackCard에 4축 점수 바, 라인 코멘트, contenteditable 최종글, "→ 페이지 입력란에 적용" 버튼 (활성)
4. Insert 버튼 → fmkorea 댓글창에 텍스트 적용
5. textarea 포커스 해제 → ⚔ → Insert 비활성 (툴팁: "페이지에서 입력란을 먼저 클릭하세요")
6. 결과가 있는 상태에서 "더 짧게" 입력 → Enter → 3초 내 결과 갱신 (정제). "이전" 버튼으로 복원
7. 6번 정제 → 5개만 revert 가능

### Phase 3 — Logic + Standard + 빠른 액션

1. ad hominem 포함 fmkorea 글 (예: "쟤가 멍청해서 그렇게 주장하는 거임") → 🛡 → DefenseCard에 **🧠 논리적 허점** chip 출현 → 클릭 시 explanation + counter_punch
2. 600자 이상 긴 주장 → 🛡 → 진행 단계에 "fact.check" + "logic.detect" 모두 나타남 (Standard 파이프라인)
3. 결과 있는 상태에서 ChatFrame 위에 빠른 액션 칩 4개 (더 짧게/더 비꼬게/팩트 줄이기/펀치라인 강화) → 클릭 → 정제 실행
4. 카드 헤더의 사이트 이름 (예: "에펨코리아") → 클릭 → VibeBadge 펼치기 → lexicon/tone/few-shots 표시

### Phase 4 — Vibe 자동 갱신 + 사이트 추출기

1. theqoo.net 첫 방문 → 🛡 → 번들 시드 vibe 사용 (`source: seed`)
2. **수동 5일 초과 시뮬레이션:** `~/Library/Application Support/Truth & Strike/cache/vibe/theqoo.json` 의 `last_refreshed` 를 과거 시간으로 수정 → 다시 🛡 클릭 → 백그라운드에서 vibe_refresh 트리거 → 추출기로 best 페이지 fetch → 캐시 갱신 (`source: sampled`)
3. ruliweb / dcinside 첫 방문 → 번들 시드 사용 확인
4. DefenseCard 소스 행 hover → 📌 (핀) + ✕ (숨김) 버튼 표시 → 핀 누르면 정제 시에도 위에 표시 / 숨김은 흐려짐

### Phase 5 — 사이닝 + 자동 업데이트 + 정책

1. ✦ → 설정 → About 섹션 → "개인정보 처리 방침" 클릭 → PrivacyPage 오버레이 표시
2. About 섹션에 "Electron X.Y · Chrome A.B · Node C.D" 표시 (`ipc.aboutGet()` 결과)
3. "업데이트 확인" 버튼 클릭 → 개발 모드에서는 no-op (패키지된 빌드에서만 동작)
4. 메뉴바: Truth & Strike → 정보 → 동일 정보
5. 키보드만으로 전체 UI 탐색 (Tab 키만) → focus ring (`:focus-visible`) 모든 인터랙티브 요소에 표시

---

## C. 통합 테스트 (실제 API 키 필요, 선택)

Anthropic 키가 있다면:
```bash
ANTHROPIC_API_KEY=sk-ant-... npm run test:integration
```

- 1토큰 호출로 200 응답 검증
- structuredChat 도구 호출 + zod 검증

키 없으면 자동 skip.

---

## D. 패키징 (Phase 5 릴리즈)

### 로컬 (서명 없음, 개발용)
```bash
npm run package:dir   # dist/ 에 언팩 빌드 생성
```

### 서명 + 노타리제이션 (사이닝 인증서 필요)
1. `doc/SIGNING.md` 참고하여 인증서 발급 + 환경변수 설정
2. `electron-builder.yml`의 `mac.notarize: false` → `true`로 변경
3. `npm run package` → `dist/` 에 서명된 `.dmg` / `.exe` / `.AppImage` 생성
4. GitHub Release 자동 publish: `GH_TOKEN=ghp_... npx electron-builder --publish always`

자세한 절차: `doc/SIGNING.md`

---

## E. 라이브러리 버전 (2026-06-10)

| 라이브러리 | 버전 | 비고 |
|---|---|---|
| Electron | 42.4.0 | Chromium + Node 24 LTS 번들 |
| React | 19.2.7 | |
| Vite | 7.3.5 | |
| @vitejs/plugin-react | 5.0.4 | |
| electron-vite | 4.0.1 | |
| electron-builder | 26.15.2 | |
| electron-updater | latest | |
| TypeScript | 6.0.3 | |
| Tailwind CSS | 4.3.0 | CSS-first config |
| Zod | 4.4.3 | |
| Zustand | 5.0.14 | |
| cheerio | ^1.2.0 | Phase 4 DOM 파싱 |
| Vitest | 4.1.8 | |

LLM SDK 미사용 — Anthropic / OpenAI / Gemini / Brave 모두 fetch 직접 호출.

---

## F. 디버깅 가이드

### `npm run dev` 실패
- `rm -rf node_modules out dist .vite` → `npm install`
- `node --version` (22+)

### 에이전트 호출 실패
- 설정 → "연결 테스트" → 키/모델/네트워크 확인
- 패널 빨간 배너의 에러 코드:
  - `no_api_key` — 키 미설정
  - `llm_unreachable` — 네트워크 또는 LLM 서버
  - `search_unreachable` — Brave API
  - `schema_validation_failed` — LLM이 잘못된 구조 반환 (재시도 후에도 실패)

### vibe_refresh 동작 안 함
- 사이트가 4개 추출기 (fmkorea/theqoo/ruliweb/dcinside) 중 하나여야 함
- 캐시가 5일 초과여야 함
- 네트워크 / 쿠키 / 사이트 접근 확인

### 자동 업데이터 동작 안 함
- 개발 모드 (`app.isPackaged === false`) 에서는 skip
- 서명된 빌드 필요 + GitHub Release `latest.yml` 메타데이터 필요

### 브라우저는 뜨는데 웹사이트가 안 보임 / 빈 영역만 표시
디버그 모드로 실행:
```bash
npm run dev:debug    # 또는: TS_DEBUG=1 npm run dev
```
디버그 모드는:
1. **페이지 DevTools가 자동으로 detached로 열림** — Network 탭에서 실제 요청 상태 확인
2. **main 콘솔에 `[T&S]` prefix 로그 출력** — tab open/navigate/bounds/실패 모두 보임
3. **페이지 콘솔 메시지가 main stdout으로 포워딩** — `[page id=XXXXXX] ...`

확인할 로그 패턴:
- `[T&S] openTab done id=XXXXXX bounds=1280x680 inset=120` — bounds가 0×0이면 WebContentsView가 안 보임 (시점/사이즈 문제)
- `[T&S] navigate id=... url=...` — 사용자가 URL 입력 후 호출됐는지
- `[T&S] did-navigate id=... url=...` — 실제로 페이지 도착했는지
- `[T&S] did-fail-load id=... code=N desc=...` — 네비 실패 (아래 표 참고)
- `[T&S] render-process-gone id=... reason=...` — 페이지 프로세스 크래시 (드뭄)

#### 자주 보는 did-fail-load 코드
| code | 의미 | 처치 |
|---|---|---|
| -3 (ERR_ABORTED) | 사용자가 로드 중 다른 URL 입력 | 무시 (정상; 로그에서 필터됨) |
| -2 (ERR_FAILED) | 알 수 없는 실패 | 페이지 DevTools Network 탭 확인 |
| -105 (ERR_NAME_NOT_RESOLVED) | DNS 실패 | 인터넷 / DNS 설정 / 도메인 오타 |
| -106 (ERR_INTERNET_DISCONNECTED) | 오프라인 | 네트워크 연결 확인 |
| -109 (ERR_ADDRESS_UNREACHABLE) | 도달 불가 | 방화벽/프록시 |
| -118 (ERR_CONNECTION_TIMED_OUT) | 타임아웃 | 회사 프록시/VPN 가능성 |
| -200 (ERR_CERT_COMMON_NAME_INVALID) | HTTPS 인증서 문제 | 사이트가 잘못된 인증서 사용 |

### "A JavaScript error occurred in the main process" / `Named export X not found`
Electron 창이 안 뜨고 다이얼로그에 `SyntaxError: Named export 'X' not found. The requested module 'Y' is a CommonJS module` 가 보이면, 새로 추가한 의존성이 CommonJS-only 인데 main 측에서 named import를 했기 때문입니다.

**해결 패턴:**
```ts
// ❌ CJS 모듈에 대해서는 동작 안 함:
import { autoUpdater } from "electron-updater";

// ✅ default import + destructure:
import pkg from "electron-updater";
const { autoUpdater } = pkg;
```

**새 main-process 의존성 추가 시 검증:**
```bash
node -e "const p = require('패키지명/package.json'); console.log({type: p.type, main: p.main, module: p.module, hasExports: !!p.exports})"
```
- `exports` 필드가 있고 `import` 키가 있으면 named import OK
- `type: "module"` 또는 dual `main`+`module` 이면 OK
- 둘 다 없으면 (`type: undefined` + no `exports`) → 위 default+destructure 패턴 필수

현재 코드베이스의 CJS 의존성: `electron-updater` (default+destructure로 처리됨, `src/main/lib/updater.ts` 참고)

---

## G. 작업 완료 체크리스트

- [x] Phase 0~5 코드 모두 LIVE
- [x] `npm run typecheck` 0 에러
- [x] `npm test` 131개 통과
- [x] `npm run build` 성공
- [x] `doc/CODE_MAP.md` 갱신
- [x] `doc/SIGNING.md` + `doc/PRIVACY_POLICY.md` 작성
- [ ] 사용자 수동 검증 (위 B 시나리오)
- [ ] (선택) 통합 테스트 (위 C)
- [ ] (Phase 5 릴리즈) 인증서 발급 + 패키징

Phase 1~5 완료 시 owner는:
1. fmkorea 토론 ≥ 3건 실제 dogfooding
2. 발견된 vibe 미스 / 결과 품질 이슈 → 시드 코퍼스 갱신
3. v0.1.0 태그 + GitHub Release 첫 publish
