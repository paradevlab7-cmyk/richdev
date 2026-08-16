# Vercel 환경변수 및 GitHub OAuth 등록 절차

## 1. 사전 조건

현재 서버 코드는 MySQL/TiDB용 Drizzle ORM을 사용합니다. 따라서 Vercel에서 tRPC·검색·설정·수집 이력을 실제로 사용하려면 Vercel에서 접근 가능한 **MySQL 또는 TiDB** 데이터베이스가 필요합니다. Manus 내부 `DATABASE_URL`은 Vercel로 이전되지 않으므로, 별도 외부 DB의 TLS 연결 문자열을 준비해야 합니다.

GitHub OAuth App은 GitHub 계정의 **Settings → Developer settings → OAuth Apps → New OAuth App**에서 생성합니다. Homepage URL에는 Production URL을, Authorization callback URL에는 아래의 Production callback을 등록합니다. GitHub OAuth App 설정은 최대 10개의 callback URL을 지원하므로 Preview 테스트용 URL도 추가할 수 있습니다.[1]

| 구분 | 값 |
|---|---|
| Application name | `G2B BID MONITOR` |
| Homepage URL | `https://g2b-bid-monitor-4rzmiwsaq-540346.vercel.app` |
| Production callback URL | `https://g2b-bid-monitor-4rzmiwsaq-540346.vercel.app/api/auth/github/callback` |
| Stable Preview callback URL | `https://g2b-bid-monitor-git-vercel-preview-initial-540346.vercel.app/api/auth/github/callback` |

> 배포마다 생성되는 Preview URL은 바뀌지만, `vercel-preview-initial` 브랜치에는 위의 안정 별칭이 연결됩니다. GitHub OAuth App은 최대 10개의 callback URL을 지원하므로 Production 및 안정 Preview callback을 함께 등록할 수 있습니다.[1] 실제 운영 전에는 Vercel에 고정 Production 도메인을 연결한 뒤, 그 도메인의 callback URL을 추가 등록하는 방식을 권장합니다.

## 2. Vercel 환경변수

아래 항목은 **Vercel Project Settings → Environment Variables**에서 Production과 Preview에 모두 등록합니다. `VITE_` 접두사가 있는 값은 프런트엔드 빌드 시점에 포함되므로 저장 후 재배포가 필요합니다.

| 변수 | 환경 | 용도 | 입력 방식 |
|---|---|---|---|
| `DATABASE_URL` | Production, Preview | 외부 MySQL/TiDB TLS 연결 문자열 | 외부 DB 제공자 값 |
| `JWT_SECRET` | Production, Preview | 로그인 세션 및 저장된 API 키 암호화 | 32바이트 이상 무작위 문자열 |
| `CRON_SECRET` | Production | Vercel Cron 요청 검증 | 32바이트 이상 무작위 문자열 |
| `GITHUB_CLIENT_ID` | Production, Preview | GitHub OAuth App Client ID | GitHub OAuth App 값 |
| `GITHUB_CLIENT_SECRET` | Production, Preview | GitHub OAuth App Client Secret | GitHub OAuth App 값 |
| `VITE_AUTH_PROVIDER` | Production, Preview | 클라이언트 로그인 제공자 선택 | `github` |

`JWT_SECRET`은 이전 Manus 환경과 동일한 값을 재사용하면 안 됩니다. Vercel 환경에서 새로 발급해야 하며, 변경하면 기존 로그인 세션과 암호화된 설정값은 더 이상 유효하지 않습니다. `CRON_SECRET`은 Vercel이 Cron 요청에 자동으로 담는 Bearer 토큰과 비교하는 값입니다.[2]

## 3. Vercel Hobby Cron 구성

`vercel.json`은 매일 `23:00 UTC`에 `/api/cron/g2b-daily`를 호출하도록 구성했습니다. 이는 한국 표준시 **08:00 KST**입니다. Vercel Hobby는 하루 1회를 넘는 Cron 표현식을 배포 단계에서 거부하므로 기존 1시간·6시간·10분 이어수집은 포함하지 않았습니다.[3]

## 4. 수집·알림 데이터 이전 유의사항

기존 사용자별 공공데이터 API 키, 텔레그램·이메일 발송 설정, 관심공고와 수집 이력은 현재 Manus DB에 있습니다. 새 외부 DB로 전환하려면 스키마 마이그레이션 후, 필요한 레코드를 안전하게 이관해야 합니다. 환경변수만 등록해도 기존 Manus DB 데이터는 자동 복사되지 않습니다.

## 5. Preview Serverless 검증 결과

2026-08-16에 `vercel-preview-initial` 안정 별칭에서 상태·OAuth·tRPC·Cron 진입 경로를 검증했습니다. Vercel 함수는 서버 런타임을 `api/runtimeApp.cjs`로 사전 번들링하여 실행하며, 중첩된 OAuth·Cron·tRPC 경로는 각각 명시적 Function 엔트리로 배포합니다.

| 검증 경로 | 기대 결과 | 확인 결과 |
|---|---|---|
| `/api/health` | Vercel 런타임 상태 | `200`, `{"ok":true,"runtime":"vercel"}` |
| `/api/cron/health` | 무인증 요청 차단 | `401 unauthorized-cron` |
| `/api/cron/health` + 올바른 Bearer 토큰 | Cron 인증 성공 | `200`, `{"ok":true,"scheduler":"vercel"}` |
| `/api/auth/github` | GitHub 인가 URL 리디렉션 | `302` 및 안정 Preview callback URL 포함 |
| `/api/auth/github/callback` | callback 라우트 도달 | state·code 없이 `403 invalid GitHub OAuth state` |
| `/api/trpc/auth.me` | tRPC 진입 경로 | `200`, 비로그인 사용자 `null` |

GitHub 실제 로그인 완료와 로그인 뒤 사용자 세션은 위 두 callback URL을 GitHub OAuth App에 등록한 뒤에만 최종 검증할 수 있습니다. 실제 일일 수집은 운영 환경의 G2B API·메일·텔레그램 값을 추가한 다음 Cron 실행 이력으로 검증합니다.

## References

[1]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app "Creating an OAuth app"
[2]: https://vercel.com/docs/cron-jobs/manage-cron-jobs "Managing Cron Jobs"
[3]: https://vercel.com/docs/cron-jobs/usage-and-pricing "Usage & Pricing for Cron Jobs"
