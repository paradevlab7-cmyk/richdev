# TiDB 연결 검증 기록

- 인스턴스: `g2b-bid-monitor`
- 인스턴스 ID: `10780671076837470831`
- 상태: `Active`
- 리전: AWS Tokyo (`ap-northeast-1`)
- 호스트: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com`
- 포트: `4000`
- 사용자: `28SYiZDiMDpHQdv.root`
- 데이터베이스: `g2b_bid_monitor`
- TiDB Cloud Connect 화면의 현재 브라우저 허용 IP: `13.251.126.112`
- SQL Editor에서 `SHOW TABLES` 실행 성공. 확인된 테이블: `__drizzle_migrations`, `bid_analysis_history`, `collection_runs`, `favorite_filters`, `monitoring_keywords`, `notice_keywords`, `notices`, `saved_notices`, `user_settings`.
- SQL Editor 쿼리 실행 성공은 인스턴스·DB·스키마가 정상임을 의미한다.
- 샌드박스에서 같은 자격증명으로 실행한 mysql2 TLS 연결은 `Access denied`가 발생했다. 샌드박스 출발 IP는 실행마다 `13.212.29.245`, `47.129.132.68`, `18.142.112.238` 등으로 TiDB Cloud 화면의 허용 IP와 다르다.
- 따라서 다음 확인 대상은 비밀번호 자체보다 TiDB Cloud Public Endpoint의 IP Allow List와 Vercel Serverless의 동적 egress IP 호환성이다. Vercel Hobby에서는 고정 egress IP를 전제로 할 수 없다.
- Vercel `/api/health`와 비로그인 `/api/trpc/auth.me`는 `200`으로 정상이다.

## 다음 운영 판단

TiDB Cloud의 SQL Editor 연결은 성공했으므로 DB 비밀번호·인스턴스·스키마는 유효하다. 외부 런타임에서 실제 애플리케이션 연결을 허용하려면 TiDB Cloud의 Public Endpoint IP 허용 정책을 Vercel 동적 egress에 맞게 조정하거나, 고정 egress가 가능한 DB 연결 구조/호스팅을 사용해야 한다. `0.0.0.0/0` 허용은 보안상 임시 진단 외에는 권장하지 않는다.

## 추가 확인

- TiDB Cloud Networking 화면의 Public Endpoint는 Enabled 상태다.
- Authorized Networks에는 `Allow_all_public_connections` 규칙이 있고 시작 IP `0.0.0.0`, 종료 IP `255.255.255.255`로 표시된다.
- 따라서 Vercel·샌드박스 egress IP 허용 목록이 현재 Access denied의 원인은 아니다.
- SQL Editor의 `SHOW TABLES`는 성공하지만 SQL Editor 내부 세션 인증과 Public Endpoint 비밀번호 인증은 별개일 수 있다. 외부 mysql2 연결에서 계속 Access denied가 발생하므로 실제 Public Endpoint 비밀번호 인증값을 다시 확인해야 한다.

## 화면 제어 Reset 결과

- 사용자의 확인 후 TiDB Cloud Connect 화면에서 `Reset Password`를 직접 실행했다.
- 화면에 `Reset successfully! Password`와 새 Connection String이 표시되었다.
- 새 비밀번호 값은 이 기록과 사용자 메시지에 저장하지 않는다.
- 다음 단계는 화면에 표시된 새 값으로 샌드박스 TLS 연결을 한 번만 검증하는 것이다.

## 공식 문서 교차 검증

공식 문서는 Starter/Essential Public Endpoint에서 기본 연결 모델이 `Public`, branch가 `main`, 비밀번호는 Connect 대화상자에서 Generate/Reset 후 저장해야 한다고 설명한다. 표준 Public Endpoint는 TLS 연결만 허용한다. TiDB의 공식 `node-mysql2` 예제는 연결 URL에 임의의 `ssl` query parameter를 넣는 방식이 아니라 `host`, `port`, `user`, `password`, `database`와 함께 `ssl: { minVersion: 'TLSv1.2', ca: ... }` 옵션을 명시하고 `TIDB_ENABLE_SSL=true`를 사용한다.

현재 테스트는 `mysql.createConnection(url)`에 URL query로 `ssl={"rejectUnauthorized":true}`를 전달하고 있다. 이 방식은 공식 예제의 명시적 TLS 옵션과 다르다. 따라서 다음 진단 단계는 애플리케이션 코드를 host/user/password/database/ssl 객체 방식으로 보정하고, Debian CA bundle(`/etc/ssl/certs/ca-certificates.crt`)을 사용해 한 번 재검증하는 것이다.

참고 문서:

- https://docs.pingcap.com/tidbcloud/connect-via-standard-connection-serverless/
- https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/
- https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-mysql2/

## 핵심 원인 후보 확인

TiDB SQL Editor에서 `SELECT USER(), CURRENT_USER(), DATABASE(), @@hostname`을 실행한 결과는 다음과 같다.

- `session_user`: `28SYiZDiMDpHQdv.parade_E51euHbi@10.0.40.55`
- `authenticated_user`: `28SYiZDiMDpHQdv.parade_E51euHbi@%`
- `current_database`: `g2b_bid_monitor`
- `db_host`: `localhost`

즉 SQL Editor가 실제로 인증하는 계정은 `28SYiZDiMDpHQdv.root`가 아니라 `28SYiZDiMDpHQdv.parade_E51euHbi`이다. 지금까지 외부 Public Endpoint 테스트가 `28SYiZDiMDpHQdv.root`로 반복되어 모두 `Access denied`가 발생했을 가능성이 높다. 다음 단계는 SQL Editor에서 계정 목록을 읽기 전용으로 확인하고, Connect 화면의 실제 Public Endpoint 사용자명과 대조하는 것이다.

## 실제 계정 비밀번호 변경 결과

SQL Editor에서 `ALTER USER '28SYiZDiMDpHQdv.parade_E51euHbi'@'%' IDENTIFIED BY '<generated-secret>';`를 승인 하에 실행했고 TiDB는 `Query OK, 0 rows affected`를 반환했다. 그러나 동일 계정과 새 비밀번호로 Public Endpoint를 명시적 TLS로 연결한 결과도 `Access denied`였다. 따라서 SQL Editor가 사용하는 계정명을 root로 잘못 선택한 것이 단독 원인은 아니며, SQL Editor 내부 인증과 Public Endpoint 비밀번호 인증 경로가 별도로 동작하거나 외부 endpoint의 자격증명 발급/전파 문제가 남아 있다. 새 계정 비밀번호는 Vercel에 반영하지 않았다.

## 앱 전용 사용자 생성 결과

SQL Editor에서 `CREATE USER IF NOT EXISTS '28SYiZDiMDpHQdv.g2b_app'@'%' IDENTIFIED BY '<generated-secret>'; GRANT ...;`를 실행했을 때 Query Log는 두 번째 `GRANT` 문을 실행했고 `You are not allowed to create a user with GRANT` 오류를 반환했다. 즉 현재 SQL Editor 계정은 새 사용자에게 권한을 부여할 `GRANT OPTION`이 없거나, TiDB Cloud가 SQL Editor 계정의 사용자 관리 권한을 제한한다. 데이터베이스는 변경되지 않았고 앱 전용 사용자는 권한 부여 전 상태일 수 있다. 다음은 계정 생성 여부를 읽기 전용으로 확인하고, 가능하면 별도 권한 부여 구문 또는 TiDB Cloud Connect의 사용자 관리 경로를 사용해야 한다.

## 앱 전용 사용자 생성·권한 부여 성공

이전 실패는 SQL Editor가 다중 구문 중 `GRANT`만 실행한 상태에서 존재하지 않는 사용자에게 권한을 부여하려 했기 때문이었다. `CREATE USER '28SYiZDiMDpHQdv.g2b_app'@'%' ...`를 단독 실행해 Query OK를 확인했고, 이어서 `GRANT ALL PRIVILEGES ON g2b_bid_monitor.* TO '28SYiZDiMDpHQdv.g2b_app'@'%';`를 단독 실행해 Query OK를 확인했다. 이제 앱 전용 계정의 Public Endpoint TLS 연결을 검증한다.

## 앱 전용 사용자 연결 및 Vercel 전환

`CREATE USER`와 `GRANT`를 각각 단독 실행해 모두 Query OK를 확인했다. 생성된 앱 전용 계정으로 명시적 TLS 연결과 핵심 테스트를 실행했으며 전체 Vitest 47개 파일·108개 테스트가 통과했다. Vercel `DATABASE_URL`을 앱 전용 계정으로 Preview·Production에 갱신하고 Production 재배포를 생성했다.

새 Production alias `g2b-bid-monitor-nine.vercel.app` 검증 결과는 `/api/health` HTTP 200과 `{"ok":true,"runtime":"vercel"}`, 비로그인 `auth.me` HTTP 200과 JSON null, 보호된 `/api/cron/health` HTTP 401이다. 이는 서버리스 기동·공개 tRPC·Cron 인증 보호가 정상임을 보여준다. 실제 DB 쿼리 경로는 인증 세션 또는 보호된 애플리케이션 절차로 추가 확인이 필요하다.

## Production 최종 검증

새 Production 배포에서 GitHub 로그인 후 화면이 `y540346-a11y` 사용자와 대시보드로 전환되었고, `/settings` 화면에서 사용자별 설정 조회 절차가 정상 로드되었다. 이는 새 앱 전용 TiDB 계정으로 세션·설정 데이터 경로가 연결된 것을 확인하는 증거다. 비로그인 `/api/trpc/auth.me`는 HTTP 200 JSON null, 로그인 후 UI 세션은 정상이다.

현재 `CRON_SECRET`으로 `/api/cron/health`에 Authorization Bearer 요청을 보내 HTTP 200을 확인했다. 비밀값 없이 요청하면 HTTP 401이므로 Cron 보호도 정상이다. Production `/api/health`는 HTTP 200 `runtime: vercel`이다.
