# GuideHollow 다국어 게임 포털

**`games.guidehollow.com` 하나에서 Playgama 제휴 게임 전체를 언어와 주요 장르별로 제공하는 Astro 정적 사이트입니다.** 기존 언어·장르별 저장소와 서브도메인을 늘리던 계획을 중단하고, 기존 puzzle 저장소의 `work/unified-game-portal` 브랜치에서 통합했습니다.

Cloudflare Pages Free의 `guidehollow-games` 운영 브랜치는 main입니다. 공개 배포와 IndexNow 수신은 별도로 확인하며, 최신 수신 기록은 `data/portal/indexnow-receipt.json`, 빌드별 전수 검사 결과는 `release-manifests/portal-verification.json`에 있습니다. 이전 이관 범위와 검증은 [배포 문서](docs/PORTAL_DEPLOYMENT.md), [검증 기록](docs/PORTAL_VERIFICATION.md)에 보존합니다. 기존 4개 사이트와 저장소는 유지합니다.

## 구현 범위

| 항목 | 현재 범위 |
| --- | --- |
| 공식 제휴 카탈로그 | 2,846개 고유 게임; 피드 페이지네이션 끝까지 수집 |
| 게임 언어 | 22개 기본 언어, 8,896개 게임·언어 조합 |
| 주요 장르 | 16개; 모든 화면 언어에서 전체 게임 탐색, 지원 언어 필터 별도 |
| 상세 경로 | 언어별로 게임당 하나; 장르 간 중복 상세 없음 |
| 기존 원고 | 160개 고유 게임 및 기존 한국어·일본어 원고 보존 |
| 색인 허용 게임 가이드 | 기존 206개에 개별 원문 대조를 통과한 언어별 원고와 검토된 원문을 추가; 최신 수량은 검증 리포트의 `guideCoverage` |
| 실행 방식 | 공식 iframe; 사용자가 Play를 누른 뒤 생성 |
| 호스팅 | Cloudflare Pages Free (`guidehollow-games`), GitHub 소스·검증 유지 |

전체 카탈로그와 색인 허용 원고 수는 다릅니다. 충분한 해당 언어 안내문이 없는 게임도 지원 언어에서 탐색·실행할 수 있지만, 상세 페이지는 `noindex,follow`이고 사이트맵에서 제외됩니다. 제공업체 원문을 번역된 본문으로 가장하지 않습니다. 게임 수를 100개나 500개로 제한하지 않습니다.

## URL과 분류

경로는 `/`, `/{locale}/`, `/{locale}/{genre}/`, `/{locale}/{genre}/page/2/`, `/{locale}/play/{game-slug}/`, `/{locale}/play/?game={game-id}`, `/{locale}/search/`입니다.

게임을 열어도 선택한 화면 언어를 유지합니다. 게임 자체의 지원 언어와 안내 페이지 언어는 별개입니다. 원문 대조를 거친 원고를 우선하고 기계 번역 사용을 표시하며, 원문 제목으로도 검색할 수 있습니다. 해당 언어 가이드가 준비되면 게임 자체의 언어 지원과 관계없이 고유 상세 URL을 제공하고, 그 외 조합은 언어별 `noindex` 플레이어를 사용합니다. 저장된 가이드가 원문 변경으로 자격을 잃으면 URL을 유지하되 `noindex`로 내리고 사이트맵·hreflang·검색 통지에서 제외합니다.

언어는 `ar`, `az`, `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `kk`, `ko`, `nl`, `pl`, `pt`, `ru`, `th`, `tr`, `uk`, `uz`, `vi`, `zh`입니다. 지역 언어를 기본 언어로 정규화하고 원래 선언도 보존합니다. `ru-KZ`는 러시아어로 유지하며, 모호한 `kr-ZZ`를 한국어로 임의 변환하지 않습니다. [카탈로그 조사](docs/PORTAL_CATALOG_FINDINGS.md)에 언어별 수량과 근거가 있습니다.

주요 장르는 `puzzle`, `racing`, `sports`, `arcade`, `action`, `adventure`, `strategy`, `simulation`, `horror`, `shooting`, `rpg`, `platform`, `idle`, `card-board`, `multiplayer`, `creative`입니다. 원본 세부 유형은 이 범주로 통합합니다.

## 실행과 검증

Node.js 24와 잠긴 npm 의존성을 사용합니다.

```sh
npm ci
node scripts/test-portal-guide-quality.mjs
node scripts/test-portal-budget.mjs
npm run build
node scripts/test-portal-discovery.mjs
node scripts/test-portal-localization.mjs
node scripts/test-portal-translations.mjs
node scripts/test-portal-details.mjs
npm run test:client
npm run indexnow -- --dry-run
npm run preview
```

`npm run build`는 자산·검색 JSON·사이트맵을 준비하고 Astro로 HTML을 생성한 뒤 **전체 정적 결과를 검사**합니다. 출력은 `dist-portal/`이며 소스 저장소에는 커밋하지 않습니다. 전체 카탈로그 JSON은 검색·지원 언어 필터·다른 언어 지원 게임의 플레이어를 열 때 요청합니다. 기본 목록은 정적 HTML로 제공됩니다.

개발은 `npm run dev`, 색인 금지 검증 빌드는 `PORTAL_PREVIEW=1 npm run build`입니다. preview는 모든 페이지와 robots를 차단하고 IndexNow도 거부합니다. 생산 환경에서는 이 값을 제거하거나 `0`으로 설정합니다.

## 소스와 동기화

- `portal/`: 공통 렌더러, 카탈로그·경로 계산, UI, 22개 언어 문구, Astro 라우트.
- `portal/details.mjs`, `portal/locales/game-details.json`: 원문에서 확인한 입력·진행 요소와 기기·언어 안내, 원문 해시가 일치할 때만 사용하는 확장 가이드. 기존 작성 원고가 우선합니다.
- `portal/guides.mjs`, `portal/locales/guides/`: 개별 검토한 언어별 제목·설명·조작법. 원문 해시, 검토한 본문 해시, 정확한 원문 인용과 검토 기록이 필요합니다.
- `portal/locales/provider-reviews.json`, `portal/locales/guide-holds.json`: 원문 일관성 검토 및 핵심 충돌 보류 기록. 제공업체 원문은 독립 작성 원고와 구분합니다. 비핵심 주장을 생략해 다시 쓴 경우에는 해결 근거를 명시하고 본문을 재검증하며, 전역 핵심 충돌은 계속 차단합니다.
- `data/portal/catalog.json`: 전체 피드의 경량 실행 데이터. 게임 소스는 포함하지 않습니다.
- `data/portal/sync-state.json`: 받은 스냅샷, 변환 전 제공업체 ID 전수 목록, 제거·재등장 이력.
- `data/portal/genre-overrides.json`: 원문 근거가 기록된 장르 보정.
- `data/catalog.json`, `data/sites.json`, `shared/`: 기존 원고·선정 목록·디자인 보존과 재사용.
- `scripts/sync-portal-catalog.mjs`: 공식 API 전체 동기화, 안전한 갱신.
- `scripts/sync-portal-localizations.mjs`, `portal/locales/catalog/`: 제공업체 제목·짧은 설명의 저장된 기계 번역. 원문 해시가 바뀐 항목만 갱신하고, 요청 제한 시 중단하며 저장된 진행 상태를 재사용합니다.
- `scripts/verify-portal.mjs`, `scripts/test-portal-client.mjs`: 전수 정적 및 실제 생성 HTML의 DOM 검사.
- `scripts/notify-portal-indexnow.mjs`: 공개 배포를 확인하고 변경된 색인 적격 URL만 통지.

`npm run sync` 이후 누락 번역 동기화, 번역 범위 검사, 빌드와 DOM 검사를 실행합니다. 전체 API 수집과 검증이 성공해야 새 스냅샷을 커밋합니다. 누락·중복·총수 변화·잘못된 응답·429에서는 이전 운영 데이터를 보존합니다. 피드에서 사라진 게임은 미등재로 처리하며, API가 제공하지 않는 삭제·비활성 상태를 추측하지 않습니다.

원본 피드와 중간 정규화 파일은 임시 검사 자료로 커밋하지 않습니다. 커밋한 source ID 집합·수량·해시로 누락을 검증합니다. [동기화 운영 문서](docs/PORTAL_SYNC.md)에 갱신과 실패 보존 정책이 있습니다.

## 검색과 사용자 경험

각 언어에 고유 URL·HTML `lang`·self-canonical을 둡니다. UI와 준비된 원고를 초기 HTML에 렌더링하고, 실제 색인 적격 언어 페이지끼리 reciprocal `hreflang`을 연결합니다. `/sitemap.xml`은 전역 선택 페이지와 언어별 사이트맵을 묶는 인덱스입니다. 페이지네이션·검색·원고 부족 상세는 무조건 색인시키지 않습니다.

홈·장르·검색은 화면 언어와 관계없이 전체 2,846개 게임을 제공합니다. 한국어 지원 165개 등 제공업체의 언어 선언은 별도 필터로 구분합니다. 카드에 실제 게임 언어를 표시하고, 준비된 안내는 고유 상세 URL로, 그 외 조합은 해당 화면 언어의 공용 플레이어로 엽니다. 게임의 언어 지원 자체를 추가했다고 표시하지 않습니다. 제목·짧은 소개에는 원문 해시와 연결한 저장 번역을 사용하며, 원문 게임 이름도 검색할 수 있습니다. 품질 검사를 통과하지 못한 소개는 확인 가능한 장르·기기 사실로 대체하고 데이터에 구분합니다. 실제 인기·출시일·플레이 수를 만들지 않습니다.

썸네일 지연 로딩, 24개씩 페이지네이션, 즐겨찾기·최근 게임, 검색 재시도, 키보드 닫기·포커스 복원, 모바일 스타일과 아랍어 RTL을 제공합니다. 추가 광고 네트워크·분석기는 없으며, 제공업체 광고·제휴 동작을 변조하지 않습니다.

언어별 첫 화면의 추천은 최대 6개 게임을 6초마다 전환합니다. 이전·다음·일시정지 버튼을 제공하고, 마우스·키보드 조작 중이거나 탭과 추천 영역이 보이지 않을 때는 전환을 멈춥니다. 동작 줄이기 설정에서는 수동 전환만 사용합니다. JavaScript가 없어도 첫 게임을 볼 수 있고 조작부 높이는 미리 확보합니다.

상세 페이지에는 소개·플레이 방법·확인된 입력·진행 요소·기기와 언어 정보를 제공합니다. 원문과 화면 언어가 일치하면 원문 설명·조작법을 본문에 바로 표시하고, 다른 언어에서는 저장 번역과 확인 가능한 정보를 사용합니다. 설명과 조작법의 원문 언어를 따로 판별하며 불명확하면 `und`로 표시합니다. 기술 SEO 검사는 전체 정적 경로의 metadata·canonical·hreflang·본문 구조와 WebPage/VideoGame/BreadcrumbList 관계를 확인합니다. 구조 보강만으로 색인 허용 원고 수를 늘리지 않습니다. 수동 확장 가이드의 원문 해시가 바뀌면 재검토가 필요합니다.

새 가이드는 언어·본문 완결성·원문 근거·중복·명시된 조작키와 충돌 보류를 공통 판정으로 검사합니다. 내부 최소 길이는 부족한 원고를 찾는 기준이며 검색 성과 점수가 아닙니다. 키 추출과 본문 해시는 의미의 정확성을 자동 증명하지 않으므로, 숫자·부정·입력과 행동의 대응은 원문을 개별 대조합니다. `guideCoverage`는 언어별 준비 수, 원고 출처, 미완료 이유를 기록하며 실제 색인 수와 구분합니다.

`scripts/translate-guide-candidates.py`는 선택적 로컬 초안 생성 도구입니다. 모델·Python 런타임은 저장소 밖에 두고, 후보는 `portal/locales/guides/` 밖에 저장합니다. 기계 출력만으로 검색 자격을 부여하지 않습니다. 생성 전에 예상 전체 파일 수를 검사하여 20,000개 미만을 유지합니다. 이번 원고 확대에 새 예약 작업은 추가하지 않았습니다.

GitHub Actions의 일일 전체 동기화와 시간별 IndexNow 점검을 기본 브랜치 main에 반영했으며, Cloudflare의 운영 브랜치도 main입니다. 두 워크플로는 기본 브랜치를 체크아웃합니다. `deploymentReady: true` 상태에서도 공개 키와 배포 fingerprint가 소스와 일치해야 전송하며, HTTP 200 수신을 실제 색인·검색 순위·수익 발생의 검증으로 간주하지 않습니다.

## 이전 작업과 배포

기존 4개 저장소 감사는 [이관 자산 목록](docs/PORTAL_MIGRATION_INVENTORY.md)에 있습니다. 취소한 12개 추가 장르 저장소·DNS 계획은 기록만 남겼습니다. 기존 단일 장르는 `npm run build:legacy`로 재현하며 [이전 README](docs/LEGACY_README.md)는 역사 자료입니다.

유료 플랜·새 저장소·추가 장르 서브도메인은 만들지 않습니다. 통합 호스트를 검증하기 전에는 기존 배포와 DNS를 중지하지 않습니다. [호스팅·검색 공식 문서 검토](docs/PORTAL_HOSTING_AND_SEARCH.md)에 플랫폼 선택 이유와 무료 한도가 있습니다.
