# GuideHollow 다국어 게임 포털

**`games.guidehollow.com` 하나에서 Playgama 제휴 게임 전체를 언어와 주요 장르별로 제공하는 Astro 정적 사이트입니다.** 기존 언어·장르별 저장소와 서브도메인을 늘리던 계획을 중단하고, 기존 puzzle 저장소의 `work/unified-game-portal` 브랜치에서 통합했습니다.

현재 소스 구현과 로컬 검증은 완료했습니다. **새 도메인의 외부 배포·DNS 연결·Google 제출·Naver 실전 통지는 아직 완료되지 않았습니다.** 기존 4개 사이트와 저장소는 유지합니다. 실제 설정과 차단 요인은 [배포 문서](docs/PORTAL_DEPLOYMENT.md), 재현 가능한 결과는 [검증 기록](docs/PORTAL_VERIFICATION.md)에 있습니다.

## 구현 범위

| 항목 | 현재 범위 |
| --- | --- |
| 공식 제휴 카탈로그 | 2,846개 고유 게임; 피드 페이지네이션 끝까지 수집 |
| 게임 언어 | 22개 기본 언어, 8,896개 게임·언어 조합 |
| 주요 장르 | 최대 16개; 해당 언어에 게임이 있는 장르만 표시 |
| 상세 경로 | 언어별로 게임당 하나; 장르 간 중복 상세 없음 |
| 기존 원고 | 160개 고유 게임 및 기존 한국어·일본어 원고 보존 |
| 색인 허용 게임 가이드 | 194개: 영어 160, 한국어 15, 일본어 19 |
| 실행 방식 | 공식 iframe; 사용자가 Play를 누른 뒤 생성 |
| 운영 후보 | Cloudflare Pages Free, GitHub 소스·검증 유지 |

전체 카탈로그와 색인 허용 원고 수는 다릅니다. 충분한 해당 언어 안내문이 없는 게임도 지원 언어에서 탐색·실행할 수 있지만, 상세 페이지는 `noindex,follow`이고 사이트맵에서 제외됩니다. 제공업체 원문을 번역된 본문으로 가장하지 않습니다. 게임 수를 100개나 500개로 제한하지 않습니다.

## URL과 분류

경로는 `/`, `/{locale}/`, `/{locale}/{genre}/`, `/{locale}/{genre}/page/2/`, `/{locale}/play/{game-slug}/`, `/{locale}/search/`입니다.

언어는 `ar`, `az`, `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `kk`, `ko`, `nl`, `pl`, `pt`, `ru`, `th`, `tr`, `uk`, `uz`, `vi`, `zh`입니다. 지역 언어를 기본 언어로 정규화하고 원래 선언도 보존합니다. `ru-KZ`는 러시아어로 유지하며, 모호한 `kr-ZZ`를 한국어로 임의 변환하지 않습니다. [카탈로그 조사](docs/PORTAL_CATALOG_FINDINGS.md)에 언어별 수량과 근거가 있습니다.

주요 장르는 `puzzle`, `racing`, `sports`, `arcade`, `action`, `adventure`, `strategy`, `simulation`, `horror`, `shooting`, `rpg`, `platform`, `idle`, `card-board`, `multiplayer`, `creative`입니다. 원본 세부 유형은 이 범주로 통합합니다.

## 실행과 검증

Node.js 24와 잠긴 npm 의존성을 사용합니다.

```sh
npm ci
npm run build
npm run test:client
npm run indexnow -- --dry-run
npm run preview
```

`npm run build`는 자산·검색 JSON·사이트맵을 준비하고 Astro로 HTML을 생성한 뒤 **전체 정적 결과를 검사**합니다. 출력은 `dist-portal/`이며 소스 저장소에는 커밋하지 않습니다. 검색용 전체 언어 카탈로그는 검색 페이지에서만 요청합니다.

개발은 `npm run dev`, 색인 금지 검증 빌드는 `PORTAL_PREVIEW=1 npm run build`입니다. preview는 모든 페이지와 robots를 차단하고 IndexNow도 거부합니다. 생산 환경에서는 이 값을 제거하거나 `0`으로 설정합니다.

## 소스와 동기화

- `portal/`: 공통 렌더러, 카탈로그·경로 계산, UI, 22개 언어 문구, Astro 라우트.
- `data/portal/catalog.json`: 전체 피드의 경량 실행 데이터. 게임 소스는 포함하지 않습니다.
- `data/portal/sync-state.json`: 받은 스냅샷, 변환 전 제공업체 ID 전수 목록, 제거·재등장 이력.
- `data/portal/genre-overrides.json`: 원문 근거가 기록된 장르 보정.
- `data/catalog.json`, `data/sites.json`, `shared/`: 기존 원고·선정 목록·디자인 보존과 재사용.
- `scripts/sync-portal-catalog.mjs`: 공식 API 전체 동기화, 안전한 갱신.
- `scripts/verify-portal.mjs`, `scripts/test-portal-client.mjs`: 전수 정적 및 실제 생성 HTML의 DOM 검사.
- `scripts/notify-portal-indexnow.mjs`: 공개 배포를 확인하고 변경된 색인 적격 URL만 통지.

`npm run sync` 이후 빌드와 DOM 검사를 실행합니다. 전체 API 수집이 성공해야 새 스냅샷을 반영합니다. 누락·중복·총수 변화·잘못된 응답·429에서는 이전 데이터를 보존합니다. 피드에서 사라진 게임은 미등재로 처리하며, API가 제공하지 않는 삭제·비활성 상태를 추측하지 않습니다.

원본 피드와 중간 정규화 파일은 임시 검사 자료로 커밋하지 않습니다. 커밋한 source ID 집합·수량·해시로 누락을 검증합니다. [동기화 운영 문서](docs/PORTAL_SYNC.md)에 갱신과 실패 보존 정책이 있습니다.

## 검색과 사용자 경험

각 언어에 고유 URL·HTML `lang`·self-canonical을 둡니다. UI와 준비된 원고를 초기 HTML에 렌더링하고, 실제 색인 적격 언어 페이지끼리 reciprocal `hreflang`을 연결합니다. `/sitemap.xml`은 전역 선택 페이지와 언어별 사이트맵을 묶는 인덱스입니다. 페이지네이션·검색·원고 부족 상세는 무조건 색인시키지 않습니다.

장르 탐색·관련 게임은 현재 언어의 지원 게임만 보여줍니다. 언어 변경은 같은 게임의 지원 언어로 이동하고, 미지원 언어를 선택하면 그 언어 홈으로 이동합니다. 인기 순서는 공식 피드 기본 순위이며 신규는 포털에 처음 관측된 시점입니다. 출시일·플레이 수를 만들지 않습니다.

썸네일 지연 로딩, 24개씩 페이지네이션, 즐겨찾기·최근 게임, 검색 재시도, 키보드 닫기·포커스 복원, 모바일 스타일과 아랍어 RTL을 제공합니다. 추가 광고 네트워크·분석기는 없으며, 제공업체 광고·제휴 동작을 변조하지 않습니다.

GitHub Actions에는 일일 전체 동기화와 시간별 IndexNow 점검을 준비했습니다. **기본 브랜치 반영 전에는 예약 작업이 활성화되지 않습니다.** 현재 `deploymentReady: false`로 실제 Naver 통지를 차단합니다. 활성화 후에도 공개 키와 배포 fingerprint가 소스와 일치해야 전송하며, HTTP 200 수신을 실제 색인으로 간주하지 않습니다.

## 이전 작업과 배포

기존 4개 저장소 감사는 [이관 자산 목록](docs/PORTAL_MIGRATION_INVENTORY.md)에 있습니다. 취소한 12개 추가 장르 저장소·DNS 계획은 기록만 남겼습니다. 기존 단일 장르는 `npm run build:legacy`로 재현하며 [이전 README](docs/LEGACY_README.md)는 역사 자료입니다.

유료 플랜·새 저장소·추가 장르 서브도메인은 만들지 않습니다. 통합 호스트를 검증하기 전에는 기존 배포와 DNS를 중지하지 않습니다. [호스팅·검색 공식 문서 검토](docs/PORTAL_HOSTING_AND_SEARCH.md)에 플랫폼 선택 이유와 무료 한도가 있습니다.
