# Truth & Strike

> 온라인 토론을 위한 작은 네이티브 브라우저. 풀 명세는 [`doc/`](./doc/) 참고.

## 현재 상태

**Phase 0 (브라우저 셸) 완료.** Defense / Attack 에이전트는 Phase 1에서 추가됩니다. 로드맵 전체는 [`doc/ROADMAP.md`](./doc/ROADMAP.md).

Phase 0 범위:
- Electron 단일창 + `WebContentsView` 기반 탭
- URL바 (omnibox 휴리스틱: URL vs Google 검색)
- 뒤/앞/새로고침, Find-in-page (`Cmd/Ctrl+F`)
- 우측 ✦ 트리거 → 슬라이드인 설정 드로어 (Phase 1 placeholder)
- 페이지 프리로드 스크립트 로드됨 (Phase 1 IPC 채널 준비)
- 세션 복원 (`userData/session.json`)
- 한글 + 영문 UI 문자열

## Development

### 사전 준비
- Node.js 22 이상
- macOS / Windows / Linux (개발은 macOS 권장)

### 명령어

```bash
npm install          # 의존성 설치 (Electron 바이너리도 함께 다운로드됨)
npm run dev          # Vite HMR + Electron 시작
npm test             # Vitest 단위 테스트
npm run typecheck    # TypeScript 검사 (main + renderer)
npm run build        # 프로덕션 번들 (out/)
npm run package:dir  # 사이닝 없는 언팩 빌드 (dist/)
```

### Electron 바이너리가 다운로드 안 될 때

`npm install` 후 `node_modules/electron/dist/` 가 없으면 직접 설치 스크립트를 실행하세요:

```bash
node node_modules/electron/install.js
```

또는 환경변수 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 를 설정해 미러를 사용.

## 키보드 단축키 (Phase 0)

| 단축키 (mac / win) | 동작 |
|---|---|
| `Cmd/Ctrl+T` | 새 탭 |
| `Cmd/Ctrl+W` | 탭 닫기 |
| `Cmd/Ctrl+L` | URL바 포커스 |
| `Cmd/Ctrl+R` | 새로고침 |
| `Cmd/Ctrl+Shift+R` | 강제 새로고침 |
| `Cmd/Ctrl+[` / `]` | 뒤로 / 앞으로 |
| `Cmd/Ctrl+F` | 페이지에서 찾기 |
| `Cmd/Ctrl+,` | 설정 드로어 토글 |
| `Cmd/Ctrl+1..9` | N번째 탭으로 전환 |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | 다음 / 이전 탭 |
| `Esc` | 드로어 / Find 닫기 |

## 구조

```
src/
  main/               Electron 메인 프로세스
    index.ts          진입점
    window.ts         BrowserWindow 생성
    tabs/             WebContentsView 라이프사이클 + 세션 + omnibox
    ipc/              IPC 라우터 + 채널별 핸들러
    menus/            앱 메뉴 + 단축키
    orchestrator/     에이전트 파이프라인 (Phase 1)
    agents/           Fact/Logic/Vibe/Evaluator (Phase 1+)
    lib/              llm + search + storage 어댑터
    shared/           zod 스키마 + IPC 채널 상수 (renderer와 공유)
  chrome-renderer/    React 19 UI (브라우저 크롬)
    components/       TabStrip, NavRow, UrlBar, SettingsDrawer, FindBar 등
    state/            zustand 스토어
    lib/              훅, 다국어 문자열
    preload.ts        contextBridge → window.truthAndStrike
  page-preload/
    preload.ts        탭마다 로드되는 페이지 브릿지 (Phase 1에서 호출)

tests/                Vitest 단위 테스트
doc/                  명세 문서 (PRD, ARCHITECTURE, BROWSER_CORE 등)
```

CODE_MAP의 라이브 트래커는 [`doc/CODE_MAP.md`](./doc/CODE_MAP.md).

## 사용자 작업 가이드

`USER_TASKS.md` 에서 Phase 0 수락 테스트 절차와 다음 단계 안내를 확인하세요.

## 보안 모델 요약

- 모든 LLM/검색 호출은 main 프로세스에서만. 렌더러는 API 키를 절대 못 봄.
- 페이지 렌더러 (`WebContentsView`): `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- 크롬 렌더러: `sandbox: false` (preload에서 `ipcRenderer` 필요), `contextIsolation: true`.
- 페이지 프리로드는 `__truthAndStrike` 네임스페이스로 3개 responder만 노출.
- 백엔드 없음. 텔레메트리 없음. API 키는 OS 키체인 (Phase 1).

## 라이선스

TBD.
