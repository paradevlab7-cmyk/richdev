# Vercel 이전 검토

현재 연결된 Vercel 팀(`540346`)에는 기존 프로젝트가 없습니다. 현재 앱의 Git 원격은 사용자 GitHub 저장소가 아닌 Manus 내부 원격이며, 로컬 프로젝트에도 `vercel.json` 또는 `.vercel/project.json`이 없습니다.

## 현재 상태

헤더는 이미 검색 화면에서 한 줄 flex 레이아웃으로 변경되었고 `G2B BID MONITOR` 제목을 확대했습니다. 현재 Manus 호스팅과 데이터베이스·인증·예약 수집은 정상 유지됩니다.

## Vercel 완전 이전에 필요한 작업

현재 Express 서버와 예약 수집 실행을 그대로 Vercel에 올리는 것은 호환되지 않습니다. 이전하려면 사용자 소유 GitHub 저장소를 연결하거나 소스 파일을 직접 배포하고, Express/tRPC 서버 라우트를 Vercel Functions 구조로 전환해야 합니다. 개방표준 이어수집과 1·6시간·일일 예약 수집은 Vercel Cron 또는 별도 상시 실행 워커로 재설계해야 하며, MySQL/TiDB의 외부 연결·OAuth callback URL·나라장터 API 키·알림 토큰을 Vercel 환경변수에 등록해야 합니다.

## 재구축 진행에 필요한 사용자 입력

사용자 GitHub 저장소 주소(`owner/repository`)와 Vercel에 배포할 프로젝트 이름을 제공하면 Git 연동 미리보기 배포부터 시작할 수 있습니다. 저장소가 없다면 현재 코드를 새 GitHub 저장소로 먼저 내보낸 뒤 Vercel에 연결하는 방식이 필요합니다. 완전 이전 전에는 Manus 호스팅을 운영 원본으로 유지해야 데이터 수집과 예약 알림 중단을 피할 수 있습니다.
