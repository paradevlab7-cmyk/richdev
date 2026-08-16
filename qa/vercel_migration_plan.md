# Vercel 이전 검토 및 초기 배포 설정

## 현재 초기 설정 상태

사용자가 제공한 공개 GitHub 저장소 `https://github.com/paradevlab7-cmyk/richdev`는 최초 확인 시 비어 있었습니다. 현재 애플리케이션 소스를 `main` 브랜치에 업로드했고, 최신 커밋은 `45ddaf5`(`Add initial Vercel build configuration`)입니다.

연결된 Vercel 팀 `540346`에 `g2b-bid-monitor` Git 프로젝트를 연결했습니다. Vercel 프로젝트 ID는 `prj_0O74IXyNGDHUqXxc7SHInCsUTNzv`이며 production branch는 `main`입니다. 소스 업로드 후 Git 연동 배포가 트리거되도록 구성했습니다.

저장소 루트에 `vercel.json`을 추가하여 초기 프런트엔드 빌드 설정을 명시했습니다.

| 항목 | 값 |
|---|---|
| Framework | Vite |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist/public` |
| Root directory | 저장소 루트 |

로컬에서 동일한 `pnpm build`를 실행해 Vite 프런트엔드와 Express 번들이 정상 생성되는 것을 확인했습니다. Vercel MCP 배포 목록 조회는 현재 403 권한 오류를 반환하고, 기본 `g2b-bid-monitor.vercel.app` 도메인은 아직 생성되지 않아 배포 완료 URL을 확인하지 못했습니다.

## 필요한 Vercel 환경변수

Vercel 프로젝트의 Preview와 Production 환경에 다음 값을 별도로 등록해야 합니다. 값은 현재 Manus 프로젝트에서 자동 주입되는 값과 사용자가 직접 관리하는 나라장터·알림 자격증명으로 나뉩니다.

| 구분 | 환경변수 | 용도 |
|---|---|---|
| 데이터베이스 | `DATABASE_URL` | 외부 MySQL/TiDB 연결 |
| 세션·OAuth | `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | 세션 서명과 Manus OAuth |
| 사용자·소유자 | `OWNER_OPEN_ID`, `OWNER_NAME` | 소유자 알림·예약 작업 식별 |
| 내장 API | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | 저장소·알림·내장 API 연동 |
| 앱 설정 | `VITE_APP_TITLE`, `VITE_APP_LOGO` | 프런트엔드 브랜딩 |
| 나라장터 | 프로젝트 설정에 저장된 공공데이터 인증키 | G2B API 호출 |
| 알림 | SMTP·Resend·SendGrid·Mailgun·Telegram 관련 사용자 설정 | 이메일·텔레그램 알림 |

비밀값은 GitHub에 커밋하지 않고 Vercel의 Environment Variables에 직접 등록해야 합니다. 현재 세션에서는 사용자가 Vercel용 실제 비밀값을 제공하지 않았으므로, 환경변수 등록은 보류했습니다.

## 구조적 제한사항

현재 애플리케이션은 상시 실행 가능한 Express 서버와 Manus Heartbeat에 의존합니다. `vercel.json`은 초기 프런트엔드 빌드 확인을 위한 설정이며, 이것만으로 tRPC API·OAuth callback·데이터 수집·알림·예약 작업이 Vercel에서 완전히 동작하지는 않습니다.

완전 이전 단계에서는 `/api/trpc`와 OAuth callback을 Vercel Functions 또는 별도 서버 런타임으로 변환하고, 현재 1시간·6시간·매일 08:00 수집을 Vercel Cron의 UTC 일정 또는 상시 실행 워커로 재설계해야 합니다. 개방표준 이어수집은 Vercel Function의 실행 시간 제한과 재시도·중복 방지 정책을 고려해 페이지 단위 작업으로 분리해야 합니다. Manus OAuth callback URL도 Vercel production 도메인에 맞춰 별도 등록해야 합니다.

## 다음 단계

Vercel 대시보드에서 프로젝트의 Git 연동 권한과 배포 로그를 확인하고, 필요한 Preview 환경변수를 등록한 뒤 preview 배포를 재실행해야 합니다. 이후 서버리스 API 변환과 Cron·워커 이전을 별도 단계로 진행해야 현재의 검색·수집·알림 기능을 유지할 수 있습니다.

## 배포 검증 결과

GitHub 커밋 `1816740`의 Vercel 상태 체크가 `success`이며, 설명은 `Deployment has completed`로 확인되었습니다. Vercel 배포 상세 주소는 [배포 상세 화면](https://vercel.com/540346/g2b-bid-monitor/3UPTxB9wVSJByQhaqbcMXebqZQdQ)입니다. Vercel MCP의 프로젝트·배포 목록 API는 현재 403/404를 반환해 MCP에서 직접 로그와 공개 preview URL을 읽지는 못했지만, GitHub의 Vercel 상태 체크를 통해 원격 빌드 완료를 교차 확인했습니다.

## 공식 문서 기준의 검증 한계

Vercel 공식 문서는 Git 저장소의 push마다 자동 배포와 preview deployment가 생성되며, GitHub 상태 체크에 배포 URL을 제공할 수 있다고 설명합니다. 또한 팀 프로젝트 조회·배포·설정 접근은 팀 또는 프로젝트 역할에 따라 달라집니다. 따라서 현재 확인된 GitHub Vercel 상태 `success`와 `Deployment has completed`는 자동 배포 완료의 근거이지만, 현재 MCP 계정으로는 프로젝트 상세·배포 API가 403/404를 반환해 공개 preview hostname을 직접 확인할 수 없습니다. [1] [2]

### References

[1]: https://vercel.com/docs/git "Deploying Git Repositories with Vercel"
[2]: https://vercel.com/docs/git/vercel-for-github "Deploying GitHub Projects with Vercel"
[3]: https://vercel.com/docs/rbac/access-roles "Vercel Access Roles"

## 확인된 배포 URL

최신 GitHub Vercel 배포 상태에서 production URL `https://g2b-bid-monitor-4rzmiwsaq-540346.vercel.app`을 확인했습니다. 브라우저로 해당 URL에 접근한 결과 HTTP 화면이 정상 로드되었고, `나라장터 입찰 모니터` 제목과 인증 필요 안내가 표시되었습니다. 이는 프런트엔드 배포와 인증 게이트가 동작함을 의미합니다. 데이터 API와 Manus OAuth의 완전 동작은 Vercel 환경변수 등록 및 callback URL 설정 후 별도 검증이 필요합니다.

## Preview 브랜치 배포 확인

`vercel-preview-initial` 브랜치를 GitHub에 푸시한 결과 Vercel이 Preview 환경 배포를 생성했습니다. 배포 식별자는 GitHub deployment `5926413876`이며, 상태는 `success` / `Deployment has completed`입니다. 실제 Preview URL은 `https://g2b-bid-monitor-7u4wz1weo-540346.vercel.app`이고 브라우저 접근 결과 `나라장터 입찰 모니터` 제목과 `Sign in to continue` 인증 게이트가 정상 표시되었습니다.

Production URL은 `https://g2b-bid-monitor-4rzmiwsaq-540346.vercel.app`이며, Preview URL과 구분하여 관리합니다. Preview·Production 모두 정적 프런트엔드와 인증 게이트까지 확인했으며, API·OAuth·수집·알림은 Vercel 환경변수와 서버리스/Cron 전환 이후 별도 검증 대상입니다.
