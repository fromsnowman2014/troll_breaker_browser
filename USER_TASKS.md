# 사용자 작업 가이드

> Phase 0 코드 작업이 끝났습니다. 아래 절차로 직접 검증하세요.

---

## A. 첫 실행 전 준비 (필수)

1. **Node.js 22 이상 설치 확인**
   ```bash
   node --version   # v22.x 이상이어야 함
   ```
   설치는 [nodejs.org](https://nodejs.org/) 또는 `nvm install 22`.

2. **프로젝트 루트에서 의존성 설치**
   ```bash
   cd /Users/seinoh/Desktop/github/troll_breaker_browser
   npm install
   ```
   첫 설치는 5~10분 걸립니다 (Electron 41 바이너리 다운로드 포함, 약 200MB).

3. **Electron 바이너리 다운로드 확인**
   ```bash
   ls node_modules/electron/dist/
   ```
   파일이 보이면 성공. 보이지 않으면:
   ```bash
   node node_modules/electron/install.js
   ```
   여전히 실패하면 네트워크 (회사 프록시 / 방화벽) 문제일 가능성. `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install` 시도.

4. **타입 + 테스트 검증**
   ```bash
   npm run typecheck   # 에러 없어야 함
   npm test            # 43개 테스트 전부 통과해야 함
   ```

5. **개발 서버 시작**
   ```bash
   npm run dev
   ```
   1280×800 크기의 다크 테마 윈도우가 떠야 합니다.

---

## B. Phase 0 수락 테스트 (수동, 약 10분)

ROADMAP §Phase 0 "Done when" 기준입니다. 모두 통과해야 Phase 0 완료 선언.

### 1. 기본 페이지 로딩
- URL바를 클릭하고 `https://fmkorea.com` 입력 → Enter
- fmkorea 메인 페이지가 정상 표시되는지 확인 ✅

### 2. 옴니박스 휴리스틱
- URL바에 `theqoo.net` 입력 → Enter → `https://theqoo.net` 로 이동 ✅
- URL바에 `localhost:3000` 입력 → Enter → `http://localhost:3000` 시도 ✅
- URL바에 `react hooks` (띄어쓰기) 입력 → Enter → google.com/search?q=react+hooks 로 이동 ✅

### 3. 멀티탭
- `Cmd+T` (mac) / `Ctrl+T` (win) → 새 빈 탭 열기. 총 3개 만들기.
- 탭 클릭으로 전환 / `Cmd+1`, `Cmd+2`, `Cmd+3` 도 동작 ✅
- 가운데 탭의 `×` 클릭 → 닫힘. 우측 탭이 active로 ✅
- 마지막 탭에서 `Cmd+W` → 앱이 종료되지 않고 빈 탭 1개로 유지 ✅

### 4. 네비게이션
- 사이트에서 링크 클릭으로 페이지 이동 → URL바가 업데이트되는지 ✅
- `←` 버튼 (또는 `Cmd+[`) → 이전 페이지 ✅
- `→` 버튼 (또는 `Cmd+]`) → 다음 페이지 ✅
- 새 탭에서 ←/→ 버튼이 비활성화 상태인지 ✅
- `Cmd+R` → 새로고침 ✅

### 5. URL바 포커스
- `Cmd+L` → URL바 포커스 + 텍스트 선택됨 ✅

### 6. ✦ 설정 드로어
- 우측 상단 ✦ 버튼 클릭 → 우측에서 드로어 슬라이드인 (180ms) ✅
- 드로어 내용: "Phase 0 — 셸만 동작합니다." 텍스트 + Phase 1 예정 항목 리스트 ✅
- 닫기 X 클릭 → 닫힘 ✅
- 다시 열고 `Esc` → 닫힘 ✅
- 다시 열고 본 뷰포트 (드로어 밖 빈 곳) 클릭 → 닫힘 ✅
- `Cmd+,` → 토글 ✅

### 7. Find-in-page
- 긴 글 페이지에서 `Cmd+F` → 우측 상단에 FindBar 표시 ✅
- 단어 입력 → 페이지 내 매치가 하이라이트됨 + 카운트 (예: `1/12`) ✅
- `Enter` → 다음 매치로 이동 ✅
- `Shift+Enter` → 이전 매치 ✅
- `Esc` → FindBar 닫힘 + 하이라이트 제거 ✅

### 8. 페이지 프리로드 검증
- 임의 탭에서 우클릭 → "Inspect" (또는 메뉴 → View → Toggle Developer Tools)
- DevTools 콘솔에서:
  ```js
  window.__truthAndStrike
  ```
  → `{__version: 1}` 객체가 보임 ✅
- 콘솔에 `[Truth & Strike] page-preload loaded` 메시지가 페이지 로드 시마다 나옴 ✅

### 9. 세션 복원
- 3개 탭을 서로 다른 사이트로 열고 가운데 탭을 active로
- 앱 종료 (`Cmd+Q` / 윈도우 닫기)
- 다시 `npm run dev` 실행
- 동일한 3개 탭이 동일한 순서로 복원됨 ✅
- `userData/session.json` 직접 확인:
  - macOS: `~/Library/Application Support/Truth & Strike/session.json`
  - Windows: `%APPDATA%\Truth & Strike\session.json`
  - Linux: `~/.config/Truth & Strike/session.json`

### 10. 30분 dogfooding (선택, 강력 권장)
fmkorea.com / theqoo.net / news.naver.com 등을 30분간 평소처럼 사용. 단축키 깨짐, 페이지 렌더링 이슈 등 발견 시 기록.

---

## C. 라이브러리 버전 메모

`package.json` 의 모든 버전은 2026-06-09 기준 최신 stable 입니다.

| 라이브러리 | 버전 | 비고 |
|---|---|---|
| Electron | 42.4.0 | 최신 stable (Chromium + Node 24 LTS 번들) |
| React | 19.2.7 | stable |
| Vite | 7.3.5 | Vite 8은 plugin-react v6와 묶여 있어 Vite 7로 핀 (Phase 1에서 재검토) |
| @vitejs/plugin-react | 5.0.4 | v6은 Vite 8 전용 |
| electron-vite | 4.0.1 | v5/v6은 beta. 4.0.1이 Vite 7 지원하는 최신 |
| TypeScript | 6.0.3 | `baseUrl` deprecated 주의 |
| Tailwind CSS | 4.3.0 | CSS-first config (`@theme`) |
| Zod | 4.4.3 | v4 stable |
| Zustand | 5.0.14 | React 19 호환 |
| electron-builder | 26.15.2 | mac DMG / win NSIS / linux AppImage |
| Vitest | 4.1.8 | |

### 의존성 업데이트 정책
- Renovate / Dependabot 도입은 Phase 5 (공개 릴리즈) 직전.
- 보안 패치 (CVE) 는 즉시 적용. `npm audit` 정기 점검.

---

## D. 다음 단계 (Phase 1) 진행 시 결정 사항

1. **Vite 8 마이그레이션**: plugin-react v6 안정성을 확인하고 Vite 8 + React Compiler 채택 여부 결정.
2. **DR-3: 기본 LLM 제공자 확정**: 현재 Anthropic 가정. 변경 시 `defaultSettings()` 수정.
3. **DR-4: 검색 제공자 확정**: 현재 Brave 가정.
4. **API 키 발급**: 사용자가 직접 [Anthropic Console](https://console.anthropic.com/) 에서 API 키 발급 후 드로어에 입력 (Phase 1 기능).
5. **Electron 메이저 버전 고정 정책**: 현재 42. Phase 1 시작 시점에 최신 stable로 재확인 후 핀.

---

## E. 문제 발생 시 디버깅 가이드

### `npm run dev` 가 실패
1. `rm -rf node_modules out dist .vite` → `npm install` 재실행.
2. `node --version` 으로 22+ 확인.
3. macOS Apple Silicon: Rosetta 모드로 실행 중이지 않은지 확인 (`arch` 명령어).

### 창이 안 뜸
- `npm run dev` 출력의 main 프로세스 로그 확인.
- electron 바이너리 다운로드 실패가 가장 흔한 원인 — A.3 참고.

### 페이지가 로드 안 됨
- 탭의 DevTools (View → Toggle Developer Tools for current page) 콘솔 확인.
- HTTPS-only 위반? Phase 0 은 enforcement 안 함 — Phase 1 에서 interstitial 추가.

### 단축키 충돌
- `src/main/menus/shortcuts.ts` 에서 accelerator 문자열 수정.

### Hot reload 가 안 됨
- main 프로세스 변경은 자동 재시작이 필요할 수 있음. `npm run dev` 종료 후 재실행.
- renderer 변경은 즉시 반영.

### `npm test` 실패
- 모든 43개 테스트가 통과해야 정상.
- 실패 시: `tests/<filename>.test.ts` 의 해당 케이스 검토. 환경 의존성 (실제 파일시스템) 은 `tests/session.test.ts` 만.

---

## F. 작업 완료 체크리스트

- [ ] `npm install` 성공
- [ ] `npm run typecheck` 에러 0
- [ ] `npm test` 43개 통과
- [ ] `npm run dev` 윈도우 표시
- [ ] B.1 ~ B.9 모두 ✅
- [ ] B.10 (30분 dogfooding) 완료
- [ ] 위 모두 통과 시 → `doc/ROADMAP.md` 의 Phase 0 항목에 ✅ 표시
- [ ] `doc/CODE_MAP.md` 갱신: "intended — pending implementation" prefix 제거

Phase 0 끝나면 Phase 1 (Defense Fast pipeline) 시작 — [`doc/ROADMAP.md`](./doc/ROADMAP.md) 참고.
