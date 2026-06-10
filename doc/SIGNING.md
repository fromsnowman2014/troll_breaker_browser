# 코드 사이닝 + 노타리제이션 가이드 (Phase 5)

> Phase 5 릴리즈를 위한 인증서/환경변수 설정. 이 문서는 운영자(소유자) 전용. 사용자는 서명된 바이너리만 다운로드합니다.

---

## macOS

### 필요한 것
1. **Apple Developer Program** 가입 ($99/년) — https://developer.apple.com/programs/
2. **Developer ID Application** 인증서 (Apple Developer 콘솔 → Certificates → Developer ID Application)
3. **App-specific Password** (https://appleid.apple.com → 로그인 → 앱 암호)
4. **Team ID** (Apple Developer 콘솔 → Membership → Team ID)

### 환경변수 (`.env` 또는 CI 시크릿)
```bash
# 인증서 .p12 파일 (base64 인코딩) — `base64 -i cert.p12 -o cert.b64`
export CSC_LINK="path/to/cert.p12"           # 또는 base64:eyJ...
export CSC_KEY_PASSWORD="p12-password"

# 노타리제이션 (notarytool 사용)
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="ABCD123456"

# GitHub 릴리즈 publish용
export GH_TOKEN="ghp_..."
```

### `electron-builder.yml` 활성화
이미 다음이 설정되어 있습니다:
- `mac.hardenedRuntime: true`
- `mac.entitlements: build/entitlements.mac.plist`
- `mac.notarize: false` ← **인증서 확보 후 true로 변경**

### 빌드 + 노타리제이션 + 퍼블리시
```bash
npm run package           # 로컬에서 dist/ 생성 (서명 + 노타리)
electron-builder --publish always   # GitHub Release 자동 업로드
```

---

## Windows

### 필요한 것
- **EV Code Signing Certificate** ($300~600/년) — SmartScreen 평판이 빠르게 쌓이려면 EV 필수
- 일반 OV 인증서도 가능하나 SmartScreen 경고가 수 주~수 개월 지속

### 환경변수
```bash
export WIN_CSC_LINK="path/to/cert.pfx"
export WIN_CSC_KEY_PASSWORD="pfx-password"
```

### `electron-builder.yml`
`win.signtoolOptions.publisherName: "Truth & Strike"` 이미 설정. EV 인증서가 있으면 자동 서명됩니다.

---

## Linux

AppImage는 관례적으로 서명하지 않습니다. `.deb` / `.rpm`은 GPG 서명 가능하나 사용자가 거의 검증하지 않으므로 v1에서는 생략.

---

## 릴리즈 절차

1. `package.json`의 `version` 증가 (예: `0.0.1` → `0.1.0`)
2. `git tag v0.1.0 && git push --tags`
3. `npm run package` (로컬) — `dist/`에 서명된 바이너리 생성
4. `electron-builder --publish always` — GitHub Release에 자동 업로드 + 메타데이터 (`latest.yml`, `latest-mac.yml`) 생성
5. 사용자의 설치본은 `electron-updater`가 자동 감지 → 다운로드 → 재시작 시 설치

---

## 회전 / 폐기

- 인증서 만료/유출 시: 새 인증서 발급 후 다음 릴리즈부터 사용. 이전 빌드의 자동 업데이트는 영향 없음 (`latest.yml`은 새 서명만 기록).
- GitHub `GH_TOKEN` 유출 시: 즉시 회전. 릴리즈 권한이 노출된 토큰은 악성 바이너리 업로드 위험.
- 인증서 비밀번호 관리: 1Password / 비트워든 등에 보관. CI 시크릿으로 사용 시 마스킹 확인.

---

## 체크리스트 (v1 직전)

- [ ] Apple Developer 가입 + 인증서 발급
- [ ] App-specific password 발급
- [ ] EV Windows 인증서 발급
- [ ] CSC 환경변수 설정 + `.env`에 저장
- [ ] `electron-builder.yml`의 `mac.notarize: true` 토글
- [ ] 테스트 릴리즈 (private repo 또는 draft) → 사용자가 다운로드 → 설치 → 자동 업데이트 동작 확인
- [ ] public release tag 푸시 → GitHub Releases 페이지에서 다운로드 가능

문제 발생 시 `electron-builder` 로그 + Apple `notarytool history` 명령으로 디버깅.
