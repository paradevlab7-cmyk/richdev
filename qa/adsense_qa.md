# Google AdSense QA

## 구현

`AdSenseSlot`을 공통 DashboardLayout의 본문과 저작권 footer 사이에 배치했다. AdSense 스크립트는 동일한 `src`가 이미 존재하면 재삽입하지 않으며, 스크립트 load 이후 `adsbygoogle.push({})`를 호출한다. 광고 슬롯은 제공된 publisher client와 slot을 사용하고 `data-full-width-responsive="true"`로 설정했다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| AdSense 슬롯 metadata 테스트 | 통과 |
| 스크립트 중복 방지·초기화 테스트 | 통과 |
| 전체 Vitest | 45개 파일, 100개 테스트 통과 |
| TypeScript 검사 | 통과 |
| 프로덕션 빌드 | 통과 |
| 데스크톱 1280px | 본문 하단 광고 영역과 footer가 분리되어 표시됨 |
| 모바일 375px | 가로 넘침 없이 광고 영역이 반응형으로 표시됨 |

광고 계정 승인·사이트 심사 전에는 실제 광고 대신 빈 영역이 표시될 수 있다. 이는 코드 오류가 아니라 AdSense의 광고 제공 상태에 따른 동작이다.
