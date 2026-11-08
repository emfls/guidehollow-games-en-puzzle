# 게임 설명·번역 QA — 2026-11-08

## 변경한 범위

- 한국어 165개 수동 검토 게임 설명과 기존 검색 색인 정책은 유지.
- 기존 제공업체 설명에서 확인된 진행 목표·조작·게임 규칙을 근거로 다음 8개 게임의 **일본어, 중국어, 스페인어, 프랑스어, 독일어, 러시아어** 제목 및 카드 설명 총 48쌍을 수동 보완: `car-destruction-king`, `pocket-universe`, `domino-online-multiplayer`, `chess-online-multiplayer`, `escape-from-the-crypt`, `dead-frequency`, `fruit-fusion`, `favorite-puzzles`.
- 공포 장르 소개를 지원 언어 22개에서 위협·탐색·관찰·도주처럼 실제 즐길 방식을 설명하도록 변경. 기존 한국어의 상세 공포 소개는 보존.
- 영어의 16개 주요 장르 소개를 게임별 선택 기준과 상호작용에 초점을 맞춰 개선.
- `scripts/test-portal-localization.mjs`에서 게임별 제목·카드 설명·일본어 검색 JSON·공포 장르 페이지·영어 장르 소개를 검사하도록 추가.

## 보존한 안전 장치

- iframe `embedUrl`, publisher `clid`, 제휴 외부 링크와 게임 실행 동작을 변경하지 않음.
- 게임이 실제 지원하지 않는 언어로 게임 라우트를 신설하지 않음.
- 번역된 한 줄 카드 설명은 독립적으로 충분한 게임 가이드가 아니므로, 기존 게임 상세 `noindex,follow` 조건을 바꾸지 않음.
- 구체적인 게임 내 첫 실행 언어는 제공업체의 공식 지원 방식 및 실제 실행 확인 없이 임의의 `lang` 쿼리나 경로를 추가하지 않음.
- 가입 계정의 Playgama CLID 소유권·실제 게임 플레이 귀속·광고 수익 대시보드 값은 **외부 계정 검증 전까지 미확인**. URL에 식별자가 있다는 것과 실제 매출 귀속이 있다는 것은 다름.

## 증거와 후속 검증

- [Playgama 파트너 공식 시작 안내](https://wiki.playgama.com/playgama/for-partners/getting-started): CLID는 게임 실행 통계 및 수익 귀속에 사용됨.
- [Playgama 공식 카탈로그 삽입 안내](https://wiki.playgama.com/playgama/for-partners/import-the-game-catalog): 로그인한 상태의 공식 iframe URL 사용 권장.
- 실제 사이트의 최신 배포, GSC 사이트맵 제출 및 외부 Playgama 대시보드 수익 귀속은 별도 점검 필요. 이 문서가 해당 실행 성공을 증명하지 않음.
- 재현: `npm ci && npm run build && node scripts/test-portal-localization.mjs && npm run test:client`.

기존 22개 언어의 전체 8,896개 게임·언어 상세를 전부 사람 손으로 번역했다는 의미가 아니다. 기본 템플릿이 필요한 게임은 계속 `noindex` 경로로 운영하며, 추가 콘텐츠는 게임별 사실 근거가 확보되는 순서대로 확장한다.
