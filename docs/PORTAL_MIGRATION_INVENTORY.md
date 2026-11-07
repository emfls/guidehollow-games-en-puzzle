# 단일 다국어 게임 포털 이관 자산 감사

감사 기준: **2026-11-07 15:18 UTC**. 목적지는 `games.guidehollow.com` 하나이며, 이 문서는 기존 자산과 재사용 조건을 기록한다. GitHub 조사는 connector의 읽기 전용 검색·브랜치·트리·파일·Actions 조회로 수행했다. 이번 감사가 작성한 파일은 이 문서뿐이다. 저장소 생성, 외부 쓰기, DNS 변경, 삭제, 기존 사이트 수정은 하지 않았다.

## 1. 결론과 보존 기준

- 연결된 `emfls` 계정에서 `guidehollow-games-*` 저장소는 **4개**를 확인했다. 검색 질의는 `user:emfls guidehollow-games- in:name`, 첫 페이지 결과 4개, 다음 페이지 0개였다. 12개 신규 영어 장르 저장소나 KO/JA 저장소는 발견되지 않았다.
- 네 공개 main은 **공통 40개 카탈로그**를 각각 포함하며, 각 사이트가 그중 자기 장르의 10개를 발행한다. 이 중복 사본을 160개의 서로 다른 기존 게임으로 세면 안 된다.
- 확장본은 기존 puzzle 저장소의 `work/english-major-genres` 브랜치, 커밋 **`df6d5b39819d493b5294069fce9f28c6cfc8c99a`**에 보존되어 있다. 이 확장본에 **160개 고유 게임, 16개 영어 장르별 10개 선택**이 있다.
- 공개 main의 기존 40개 레코드를 로컬 확장본과 필드별로 비교한 결과 변경은 **0개**다. 기존 EN 본문과 KO 40개·JA 40개 번역을 모두 보존했다. 원고는 총 **240개 game–locale 조합**이며, 이는 서로 다른 게임 수 160개와 구분한다.
- 기존의 ‘제공업체가 해당 게임 언어를 지원하고, 완성된 해당 언어 안내문이 있다’는 두 조건을 함께 적용하면 즉시 이관 후보는 **EN 160 + KO 15 + JA 19 = 194개 game–locale 조합**이다. 이는 데이터 적격성 수치이며, 새 포털 구현·검수·발행이 끝났다는 뜻은 아니다.
- 원본 카탈로그를 유지하고 발행 가능한 locale 목록을 별도로 계산하는 편이 안전하다. 번역은 남기고, 게임 자체 언어를 원고 언어로 덮어쓰지 않는다.

## 2. 현존 저장소, Pages 구성, main 기준점

| 저장소 | main SHA | CNAME에 기록된 Pages 사용자 도메인 | 최신 main Actions |
| --- | --- | --- | --- |
| [emfls/guidehollow-games-en-puzzle](https://github.com/emfls/guidehollow-games-en-puzzle) | `17d2a282e2bfa52415f6f58da88db289a8d20872` | <https://en-puzzle.guidehollow.com/> | [42383483040 — success](https://github.com/emfls/guidehollow-games-en-puzzle/actions/runs/42383483040) |
| [emfls/guidehollow-games-en-racing](https://github.com/emfls/guidehollow-games-en-racing) | `89470c82c1c3e7f2dd722ba3a2c4a0017c5dd9ef` | <https://en-racing.guidehollow.com/> | [42383492770 — success](https://github.com/emfls/guidehollow-games-en-racing/actions/runs/42383492770) |
| [emfls/guidehollow-games-en-sports](https://github.com/emfls/guidehollow-games-en-sports) | `71a3791cce03274eae3897bb70098464db898ff6` | <https://en-sports.guidehollow.com/> | [42383501094 — success](https://github.com/emfls/guidehollow-games-en-sports/actions/runs/42383501094) |
| [emfls/guidehollow-games-en-arcade](https://github.com/emfls/guidehollow-games-en-arcade) | `e79fe625a0595cd201699e3166d728123badf978` | <https://en-arcade.guidehollow.com/> | [42383510265 — success](https://github.com/emfls/guidehollow-games-en-arcade/actions/runs/42383510265) |

모두 public, 기본 브랜치 `main`, 저장소 메타데이터의 `has_pages: true`다. main 최신 커밋 메시지는 모두 `Add same-language genre navigation`이며 2026-11-07 14:50 UTC에 기록되어 있다. 네 저장소의 재귀 트리는 잘리지 않았고, 전체 파일 blob 비교에서 차이가 난 경로는 **`CNAME`, `deployment.json` 두 개뿐**이다. 공통 카탈로그·UI·스타일·스크립트·워크플로는 동일한 Git blob이다.

Pages 주소는 실제 읽은 CNAME, `has_pages`, 성공한 배포 Actions를 근거로 기록했다. 이 감사에서 시도한 공개 웹 fetch는 도구의 접근 오류로 본문을 읽지 못했다. 따라서 이 조회 결과를 새 HTTPS 실시간 검사나 DNS 장애 판정으로 해석하지 않는다. GitHub connector는 Pages 설정/배포 API의 일부 endpoint를 허용하지 않아, 이 문서에는 재확인하지 않은 TLS 강제 설정이나 DNS 레코드 값을 넣지 않았다.

### 확장본 검증

[확장 커밋](https://github.com/emfls/guidehollow-games-en-puzzle/commit/df6d5b39819d493b5294069fce9f28c6cfc8c99a)의 [Verify broad English genre previews 실행 42385220860](https://github.com/emfls/guidehollow-games-en-puzzle/actions/runs/42385220860)은 **completed / success**다. 로컬 `release-manifests/major-genres-build.json`도 2026-11-07 15:09:57 UTC에 16개 preview, 208개 정상 경로, 각 장르별 10개 게임을 모두 passed로 기록한다. 이는 추가 12개 호스트의 공개 배포가 아니다.

기준 카탈로그 Git blob: `faabe5bb3ab9dd1b46e2564385d2017479c2ad79`. 로컬 `data/catalog.json`의 blob이 확장 커밋 트리와 정확히 일치한다. 공개 main의 40개 카탈로그 blob은 `69d6be8e2e6f4863b8fd90e9452a401cae5150bc`다.

## 3. 원고와 게임 내 언어의 분리

완성 원고는 `title`, `description`, `instructions`가 모두 있는 경우로 집계했다. 영어는 루트 필드, KO/JA는 `translations.ko`와 `translations.ja`를 사용한다. ‘게임 내 언어’는 제공업체의 `supportedLanguages`를 보존한 `languages`에서 locale prefix를 정규화한 결과다. 제공업체 선언을 확인한 것이며, 160개 게임을 직접 실행해 언어 메뉴를 검증했다는 뜻은 아니다.

| 언어 | 완성 원고 | 게임 자체 지원 | 두 조건 모두 | 번역은 있으나 게임 지원 없음 | 게임 지원은 있으나 원고 없음 |
| --- | ---: | ---: | ---: | ---: | ---: |
| English (`en`) | 160 | 160 | 160 | 0 | 0 |
| 한국어 (`ko`) | 40 | 23 | 15 | 25 | 8 |
| 日本語 (`ja`) | 40 | 34 | 19 | 21 | 15 |

부분 번역 레코드는 없고, KO/JA 이외 언어의 별도 원고는 없다. 새 120개는 모두 영어 원고만 가진다. KO 8개와 JA 15개, 총 23개 원고를 추가하면 현재 카탈로그에서 게임 언어 지원이 있는 EN/KO/JA 조합 217개를 채울 수 있다. 추가 번역에는 별도 내용 검수가 필요하다.

### 장르별 재사용 수량

아래 원고/지원 수는 별도 수치다. 기존 네 장르의 KO/JA 원고는 각각 10개씩 있으나 모두 해당 게임 내 언어 지원을 갖는 것은 아니다.

| 장르 | EN 원고/지원 | KO 원고 / 게임 지원 | JA 원고 / 게임 지원 | 기존 공개 여부 |
| --- | ---: | ---: | ---: | --- |
| `puzzle` | 10 / 10 | 10 / 6 | 10 / 7 | 기존 공개 |
| `racing` | 10 / 10 | 10 / 4 | 10 / 6 | 기존 공개 |
| `sports` | 10 / 10 | 10 / 2 | 10 / 3 | 기존 공개 |
| `arcade` | 10 / 10 | 10 / 3 | 10 / 3 | 기존 공개 |
| `action` | 10 / 10 | 0 / 0 | 0 / 3 | 준비만 완료 |
| `adventure` | 10 / 10 | 0 / 0 | 0 / 0 | 준비만 완료 |
| `strategy` | 10 / 10 | 0 / 1 | 0 / 2 | 준비만 완료 |
| `simulation` | 10 / 10 | 0 / 0 | 0 / 1 | 준비만 완료 |
| `horror` | 10 / 10 | 0 / 1 | 0 / 2 | 준비만 완료 |
| `shooting` | 10 / 10 | 0 / 1 | 0 / 1 | 준비만 완료 |
| `rpg` | 10 / 10 | 0 / 2 | 0 / 2 | 준비만 완료 |
| `platform` | 10 / 10 | 0 / 1 | 0 / 1 | 준비만 완료 |
| `idle` | 10 / 10 | 0 / 0 | 0 / 0 | 준비만 완료 |
| `card-board` | 10 / 10 | 0 / 1 | 0 / 1 | 준비만 완료 |
| `multiplayer` | 10 / 10 | 0 / 0 | 0 / 1 | 준비만 완료 |
| `creative` | 10 / 10 | 0 / 1 | 0 / 1 | 준비만 완료 |

### 현재 원고와 게임 언어가 모두 있는 KO/JA 목록

**KO — 15개:** `sudoku-online`, `favorite-puzzles`, `arrow-cube-3d`, `screw-match`, `math-crosswords`, `slime-loop`, `car-destruction-king`, `city-chase-escape-police`, `car-stunt-racing-game-3d--car-games`, `canyon-drifter`, `soccerlat-3d-football-online`, `pickle-rally`, `slowmo-sniper`, `loot-hole`, `the-biggest-number`.

**JA — 19개:** `sudoku-online`, `favorite-puzzles`, `arrow-cube-3d`, `screw-match`, `math-crosswords`, `slime-loop`, `nonogram`, `car-destruction-king`, `city-chase-escape-police`, `car-stunt-racing-game-3d--car-games`, `canyon-drifter`, `moto-flow`, `buggy-simulator-sandbox-3d`, `soccerlat-3d-football-online`, `football-free-kick`, `putt-party`, `slowmo-sniper`, `loot-hole`, `the-biggest-number`.

### 보존하되 게임 언어 지원으로 표시하면 안 되는 원고

다음 목록은 번역 오류 판정이 아니다. 번역된 안내문이 존재하더라도 게임 자체의 지원 언어에는 해당 locale이 없다는 뜻이다. 현재 native 지원을 약속하는 언어별 게임 목록에서는 제외하고 원고 자체는 유지한다. 향후 안내문 언어만 기준으로 제공하기로 결정한다면 별도 정책과 명확한 게임 언어 표시가 필요하다.

**KO — 25개:** `mahjong-lines`, `good-sort-master`, `nuts-puzzle-sort-by-color`, `nonogram`, `deadly-descent`, `moto-x3m`, `mr-racer-car-racing`, `driver-club-highway-racing`, `moto-flow`, `buggy-simulator-sandbox-3d`, `football-free-kick`, `putt-party`, `soccer-random`, `school-of-basketball`, `bowling-stars`, `cricket-mania`, `ultimate-billiard-3d-game`, `boxing-stars`, `rooftop-run`, `deep-drill-run`, `jiffy`, `chroma-trek`, `night-lake`, `cut-it-3d`, `jelly-gobble`.

**JA — 21개:** `mahjong-lines`, `good-sort-master`, `nuts-puzzle-sort-by-color`, `deadly-descent`, `moto-x3m`, `mr-racer-car-racing`, `driver-club-highway-racing`, `pickle-rally`, `soccer-random`, `school-of-basketball`, `bowling-stars`, `cricket-mania`, `ultimate-billiard-3d-game`, `boxing-stars`, `rooftop-run`, `deep-drill-run`, `jiffy`, `chroma-trek`, `night-lake`, `cut-it-3d`, `jelly-gobble`.

### 게임 언어 지원은 있으나 원고가 없는 번역 후보

**KO — 8개:** `escape-from-the-crypt`, `dogfight`, `fleet-merge`, `knight-legend`, `battlecross`, `cubegate`, `chess-online-multiplayer`, `hair-salon-3d`.

**JA — 15개:** `tall-grass`, `escape-from-the-crypt`, `dogfight`, `burger-restaurant-simulator-3d`, `epic-sword-battle-fight-in-the-ragdoll-arena`, `draw-action`, `ragdoll-battle-royale-throw-down-the-enemy`, `aod--art-of-defense`, `fleet-merge`, `red--blue-online-build-destroy-fight`, `knight-legend`, `battlecross`, `cubegate`, `chess-online-multiplayer`, `hair-salon-3d`.

### 그 밖의 게임 내 언어 메타데이터

총 23개 지역 언어 태그, 22개 기본 언어가 있다. 별도 원고가 없는 언어의 지원 수는 다음과 같다: `ar` 11, `az` 4, `de` 54, `es` 57, `fr` 46, `hi` 14, `id` 27, `it` 38, `kk` 5, `nl` 10, `pl` 21, `pt` 47, `ru` 82, `th` 12, `tr` 45, `uk` 10, `uz` 5, `vi` 16, `zh` 28. `pt` 47은 `pt-PT` 43개와 `pt-BR` 4개의 합이며 지역 태그는 원본 배열에 그대로 보존한다. 이 수치는 새 언어 포털을 즉시 발행할 수 있다는 의미가 아니다.

## 4. 전체 게임 선택 목록

아래 목록은 `data/sites.json`의 영어 16개 선택에서 직접 산출했다. 전체 160개가 고유하며 장르 간 선택 ID 중복은 없다. 제공업체 상세 `categories`는 그대로 유지되어 한 게임이 여러 하위 유형에 속할 수 있다.

| 장르 | 보존할 게임 ID 10개 |
| --- | --- |
| `puzzle` | `sudoku-online`, `favorite-puzzles`, `arrow-cube-3d`, `screw-match`, `math-crosswords`, `slime-loop`, `mahjong-lines`, `good-sort-master`, `nuts-puzzle-sort-by-color`, `nonogram` |
| `racing` | `deadly-descent`, `moto-x3m`, `mr-racer-car-racing`, `driver-club-highway-racing`, `car-destruction-king`, `city-chase-escape-police`, `car-stunt-racing-game-3d--car-games`, `canyon-drifter`, `moto-flow`, `buggy-simulator-sandbox-3d` |
| `sports` | `soccerlat-3d-football-online`, `football-free-kick`, `pickle-rally`, `putt-party`, `soccer-random`, `school-of-basketball`, `bowling-stars`, `cricket-mania`, `ultimate-billiard-3d-game`, `boxing-stars` |
| `arcade` | `slowmo-sniper`, `loot-hole`, `the-biggest-number`, `rooftop-run`, `deep-drill-run`, `jiffy`, `chroma-trek`, `night-lake`, `cut-it-3d`, `jelly-gobble` |
| `action` | `stickman-kombat-2d`, `epic-sword-battle-fight-in-the-ragdoll-arena`, `dogs-vs-aliens`, `draw-action`, `ragdoll-battle-royale-throw-down-the-enemy`, `crumple-rumble`, `attack--dash`, `frogtress`, `food-run-and-battle`, `tumble-tower-survival` |
| `adventure` | `hidden-object-clues-and-mysteries`, `hidden-object-street-of-secrets`, `hidden-object-my-hotel`, `hidden-objects-island`, `wild-love`, `my-castle-merge--story`, `blackriver-mystery-hidden-objects`, `the-escape-series-playgama`, `detective-max-mystery-the-disappearance-of-mr-winters`, `desolate-isle-survival` |
| `strategy` | `aod--art-of-defense`, `merge-elementals-castle-defense`, `kingdom-defender-tower-defense`, `fleet-merge`, `epic-battle-simulator-2`, `hex-hamlet`, `musketeers-gunpowder-vs-steel`, `line-control`, `epic-empire-tower-defense`, `animals-battle` |
| `simulation` | `bridge-builder`, `pocket-mart`, `city-bus-simulator-driving-games`, `field-master`, `flufflings-pocket-pets`, `airplane-flight-manager-game`, `dream-home`, `burger-restaurant-simulator-3d`, `launch-the-dummy`, `fun-fishing` |
| `horror` | `the-tall-man`, `animal-clinic-anomaly`, `abandoned-mansion`, `backrooms-exit-protocol-0`, `last-night`, `room-45`, `unfamiliar-object`, `pulse-of-fear`, `tall-grass`, `escape-from-the-crypt` |
| `shooting` | `hazmob-fps-online-shooter`, `sniper-attack2`, `road-chase-shooter-realistic-guns`, `bomb-the-castle`, `iron-defense`, `deorbit--space-survivors`, `dogfight`, `archery-ragdoll`, `naval-base`, `flip-gun-3d-ragdoll-shooter` |
| `rpg` | `primal-druid--kingdom-of-animals`, `pocket-zone`, `minimight-fantasy-rpg`, `runic-curse`, `heroes-of-the-dungeons-match3-rpg`, `arcuz-treasure-hunters`, `knight-legend`, `duohex`, `wander-wild`, `battlecross` |
| `platform` | `mushroom-runners`, `bottle-flip`, `leap-and-avoid-2`, `sketchy-levels`, `froggy-hop`, `portal-hop`, `planet-404-episode-1`, `music-note`, `cubegate`, `swing-hero` |
| `idle` | `my-arcade-center`, `idle-game-dev-simulator`, `idle-zoo-tycoon`, `idle-supermarket-tycoon`, `ant-colony-idle`, `idle-train-empire`, `idle-airport-tycoon`, `event-horizon-black-hole-idle`, `chicken-farm`, `idle-hotel-empire-tycoon` |
| `card-board` | `chess-online-multiplayer`, `master-checkers-25e9-1`, `backgammon-multiplayer`, `domino-battle`, `reversi-classic`, `ludo-legend`, `yatzy-82db-1`, `mahjong-classic`, `solitaire-8-collection`, `4-colors` |
| `multiplayer` | `traffic-rush-online`, `ragdoll-soccer`, `2-player-games-mini-games`, `toy-soccer-cup`, `bomb-pong-online`, `bomb-royale-online`, `snakewar-io`, `red--blue-online-build-destroy-fight`, `robostrike-3d`, `ragdoll-football-online` |
| `creative` | `make-a-dress`, `idol-livestream-doll-dress-up`, `fashion-week-2025`, `nail-salon`, `hair-salon-3d`, `diamond-painting-by-number`, `pixel-color-quest`, `diy-phone-case-maker`, `kiki-world-kawaii-doll-decor`, `the-ink-shop--tattoo-art-asmr` |

## 5. 재사용 자산과 포털에서 바꿔야 할 경계

| 자산 | 확인한 재사용 가치 | 단일 포털 적용 조건 |
| --- | --- | --- |
| `data/catalog.json` | 160개 고유 ID, 원문 URL·썸네일·장르·기기·방향·언어·EN 원고 및 기존 80개 번역 | 단일 원본으로 유지. 게임 ID/제공업체 URL을 다시 만들지 말고 locale별 발행 목록을 별도로 계산 |
| `data/genre-groups.json`, `data/sites.json` | 16개 대장르 묶음과 상세 제공업체 분류; 전체 카탈로그에는 137개 고유 상세 태그 | 대장르는 포털 내 경로/탐색으로 옮기고 기존 subdomain/repo 설정과 분리. 한 게임의 정규 URL을 장르마다 중복 생성하지 않도록 설계 |
| `data/expansion-*.json` 5개 원고 배치 | 새 120개 원고와 선택 목록을 재구성 가능 | 최종 카탈로그와 동기성을 유지하거나 불변 이관 자료로 보존 |
| `data/provider-evidence.json`, `data/expansion-sources.json` | 160개 메타데이터 스냅샷, 25개 요청/출처 기록 | 아래 원문 근거 보존 공백을 해소. 시점이 오래되면 언어·기기·URL만 갱신해도 원고 내용까지 자동 검증되지는 않음 |
| `shared/render.mjs` | 서버에서 만든 게임 카드, 상세 원고, 기기/언어 표시, 이미지 fallback, 추천 카드, 탐색, about/privacy, 404 | 단일 origin과 locale/genre 경로에 맞게 링크 함수·context를 교체. 현재 `root`는 기존 2단계 game 경로와 장르별 host를 가정 |
| `shared/site.css` | 8개 테마, 반응형 카드/hero/player, focus 스타일, reduced-motion 대응 | 통합 브랜드와 페이지 구성에 맞게 토큰 재사용. 16개 모두 고유 디자인인 것은 아니며 테마를 공유 |
| `shared/site.js` | 검색, 태그 필터, curated/A–Z 정렬, 즐겨찾기·최근 실행, URL 상태, 공유, 플레이어 수명 관리 | 현재 검색 데이터는 해당 collection에 한정. 전역 검색과 장르 검색 범위를 명시하고 전체 ID 집합으로 저장 데이터를 검증 |
| `shared/i18n.mjs` | EN/KO/JA 각각 108개 UI 키, FAQ/about/privacy/오류/플레이어 문구 | 대장르 이름은 EN 16개, KO/JA 각 4개뿐. 신규 장르와 상세 분류 label을 검수·번역. 데이터 원고 누락 fallback을 색인 가능 페이지에 그대로 쓰지 않음 |
| Astro 설정·동적 정적 경로 | Astro `7.4.7`, 정적 출력, trailing slash, 커스텀 404 | 현재 한 genre/locale를 선택하고 origin을 `${locale}-${genre}.guidehollow.com`으로 조립하므로 포털 route registry로 바꿔야 함 |
| 빌드 검증·preview 차단 | 경로, 메타데이터, 스키마, 언어, iframe 지연, sitemap, CLID, noindex/robots 검사 | 기존 단일 host/genre 전제를 새 URL 행렬에 맞춰 교체. 현재 검증에는 번역 완성도 hard gate가 없음 |
| `.github/workflows/deploy.yml` | Node 24 + `npm ci`, `npm run build`, Pages artifact/deploy, 분리된 IndexNow 알림 | 최종 선택한 기존 저장소 한 곳의 배포 대상으로 연결. 이 감사에서는 workflow를 변경하거나 실행하지 않음 |

### 그대로 살릴 기능

홈의 대표 게임과 카드, 실제 게임 페이지 링크, 제목/원어 제목/분류를 검색하는 입력창, 하위 태그 필터, 정렬, 빈 결과 안내, 즐겨찾기·최근 실행, 게임 공유, 썸네일 오류 대체, 키보드 focus/skip link/상태 알림을 재사용할 수 있다. 플레이어는 Play를 눌러야 iframe을 만들며, 닫기·화면 종료 시 제거하고 전체화면을 지원한다. 외부 Playgama 대체 링크에는 `noopener sponsored`가 있으며 지정 CLID를 유지한다. 로딩 이벤트는 게임 시작 완료를 보장하지 않아 문구도 게임 프레임 상태로 표현한다. 이는 소스 구현 감사이며 이번 감사에서 모든 기능을 다시 브라우저로 조작한 것은 아니다.

즐겨찾기 키는 현재 `guidehollow:${siteId}:${type}`이고, 최근 목록은 24개로 제한된다. 새 origin은 기존 네 subdomain의 localStorage를 직접 읽을 수 없으므로 자동 이전된다고 약속하면 안 된다. 통합 origin의 저장 namespace를 정하고, 현재 화면의 좁은 게임 목록 때문에 다른 장르/언어의 저장 ID가 삭제되지 않게 해야 한다. 기존 사이트를 바꾸는 별도 export/import 이관은 이번 작업 범위에 포함하지 않는다.

## 6. SEO 자산과 현재 한계

확인한 구현 자산은 페이지별 title/description, 자기 정규 URL, HTML `lang`, Open Graph와 `summary_large_image`, 게임별 `VideoGame` + `BreadcrumbList`, 홈의 `CollectionPage`, sitemap·robots, 활성화된 실제 언어 counterpart의 `hreflang`이다. sitemap에는 영어 counterpart를 `x-default`로 넣지만 HTML head에는 현재 별도 `x-default`가 없다. 404와 preview는 noindex이며 preview robots는 전체 차단한다. 메타데이터의 평점·리뷰 수를 꾸며 넣는 코드는 없다. 검색/필터의 query 상태는 기본 페이지 canonical과 분리되어 있다.

현재 hreflang과 언어 전환은 같은 장르와 포함된 게임 ID를 기준으로 active site끼리 연결한다. 새 포털에서는 각 게임의 실제 발행된 locale 페이지를 기준으로 HTML·sitemap·언어 메뉴를 함께 생성해야 한다. KO/JA 본문이 없는 게임을 영어 fallback으로 내보내면서 번역 완료된 counterpart처럼 연결하지 않는다. `localizedGame()`는 현재 누락된 본문을 영어로 대체하고 안내를 보여주므로, 정적 페이지를 만들기 전에 발행 적격성 검사가 필요하다.

기존 16개 별도 호스트 계획의 `data/deployment-queue.json`, `docs/new-genre-dns-records.tsv`, `docs/MAJOR_GENRES.md`는 역사적 준비 자산이다. 단일 포털 전환 이후 실행 대기 목록으로 사용하지 않는다. 새 포털 정규 URL과 구 사이트 대응표를 먼저 확정한 뒤 기존 호스트 경로를 처리해야 하며, 이 감사는 redirect·canonical·DNS를 실제 수정하지 않았다. 검색엔진 재색인이나 순위 유지 여부는 소스 검사만으로 확정할 수 없다.

## 7. 데이터 품질 검사와 발행 게이트 권고

### 이번 감사에서 확인한 것

- 160개 고유 ID, 모든 EN 원고 존재, KO/JA 각 40개 완성 번역, 부분 번역 0개.
- 현재 catalog와 metadata snapshot의 언어 배열·장르 배열·썸네일·기기·화면 방향 및 CLID를 제외한 제공업체 URL이 모두 일치한다. 제목 3개의 차이는 제공업체 앞뒤 공백을 trim한 것뿐이다: `car-destruction-king`, `car-stunt-racing-game-3d--car-games`, `buggy-simulator-sandbox-3d`.
- Desktop 160개, Android 153개, iOS 150개로 기록되어 있다. 실제 기기 플레이 검증으로 확대 해석하지 않는다.
- 임베드 host는 `playgama.com` 155개와 `deadlydescent.net`, `mrracer.online`, `rooftoprun.net`, `fishitgame.io`, `stickmankombat.io` 각 1개다. slug 기반으로 모두 Playgama URL을 재생성하면 이 원본 경로를 잃는다.
- 모든 embed/fallback URL에 `clid=p_d84f9dc3-740c-40ae-bc98-c1fbd7c2de92`가 정확히 한 번 들어 있다.
- 영어 설명+조작 안내는 공백 분리 기준 124–161단어다. 정확히 같은 description 또는 instructions를 가진 서로 다른 게임은 없다. 기존 `screw-match`가 124단어로, 새 원고 작성 당시의 125단어 하한보다 1단어 짧다. 기존 원고를 보존하고 실질적인 내용 기준으로 재검수하며, 단어 수만 채우는 수정은 필요하지 않다.

### 원문 근거 보존 공백

커밋된 `data/provider-evidence.json`은 160개 게임의 제공업체 메타데이터를 보존하지만 **description/howToPlayText는 0개**다. 확장 커밋의 재귀 tree에는 `data/raw/`가 없다. 감사 시점 로컬에는 63개 raw JSON 응답이 있지만 이것만으로 외부 저장소의 원문 근거가 보존된 것은 아니다. `expansion-sources.json`의 요청·시점·파일명 기록은 유용하나 원문 조작법을 대신하지 않는다.

권고: 선택한 160개 게임에 한정해 원문 `description`, `howToPlayText`, 제공업체 ID/slug, source URL, 수집 시각과 현재 스냅샷 metadata를 갖는 작은 evidence 파일을 보존한다. 필요하면 전체 raw 응답도 별도 자료로 남긴다. 이는 제안이며 이번 감사에서는 데이터 파일을 수정하지 않았다.

### 권장 hard gate

1. **ID와 귀속 보존:** 고유 slug, 정확한 제공업체 embed/fallback URL, HTTPS, CLID 1개, 알려진 이미지/기기/언어 값을 검증한다. 제공업체가 별도 도메인을 준 게임은 그 URL을 보존한다.
2. **원고 적격성:** 해당 locale의 title·설명·조작 안내가 모두 있어야 색인 가능한 해당 언어 가이드를 만든다. 영어 fallback은 preview나 명시된 원문 보기로만 처리한다. 모든 장르 이름·필터·오류·본문 주변 문구도 해당 언어로 검수한다.
3. **게임 언어 적격성:** native 지원을 약속하는 locale collection은 제공업체가 해당 locale을 선언한 게임만 포함한다. UI 번역과 게임 언어를 별도 값으로 표시한다. 범용 번역 가이드를 허용하는 정책은 별도 결정으로 남긴다.
4. **내용 근거:** 목표, 조작, 모드, 인원, 진행 방식의 중요한 주장을 원문 description/howToPlayText와 대조한다. 메타데이터 스냅샷 일치만으로 모든 원고 문장의 사실성이 검증되지는 않는다. 체험·별점·오프라인 진행·실시간 멀티플레이 등을 근거 없이 추가하지 않는다.
5. **URL 일관성:** 단일 origin과 확정 route registry로 canonical·hreflang·sitemap·Open Graph·언어 메뉴·카드·IndexNow를 함께 생성한다. 발행하지 않는 locale 페이지를 counterpart로 넣지 않는다. 게임 한 개에 장르별 중복 정규 URL을 만들지 않는다.
6. **발행 검증:** 정적 빌드 검사에 더해 대표 mobile/desktop 화면과 키보드 동작, 검색·저장·공유·지연 iframe·닫기·전체화면·실패 fallback을 확인한다. 전체 source 검토와 실제 game runtime 확인을 기록상 구분한다. 성공한 Pages 배포, HTTPS 도달, 검색엔진 통지는 각각 별도 상태로 남긴다.

기존 자동 검증은 route/언어/canonical/메타/schema/sitemap/CLID와 preview 차단을 확인하는 유용한 출발점이다. 현재 누락된 번역 완성도·상호 hreflang·포털 전체 내부 링크 검사와 문서화된 원문 근거 보존을 추가하면 이관 때의 주요 데이터 손실과 언어 혼동을 막을 수 있다.

## 8. 근거 경로

아래 링크는 이번 감사에서 읽은 확장 커밋에 고정되어 있다. main SHA와 Actions 근거는 2절에 별도로 기록했다.

- [data/catalog.json](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/data/catalog.json) — 160개 원고·메타데이터.
- [data/sites.json](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/data/sites.json) — 기존 locale/장르 선택과 active 상태.
- [data/genre-groups.json](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/data/genre-groups.json) — 16개 대장르와 source 분류.
- [data/provider-evidence.json](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/data/provider-evidence.json) — 160개 제공업체 메타데이터 스냅샷.
- [data/expansion-sources.json](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/data/expansion-sources.json) — API 요청·시점·raw 파일 출처.
- [shared/render.mjs](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/shared/render.mjs) — HTML·SEO·언어 탐색 구현.
- [shared/site.js](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/shared/site.js) — 검색·즐겨찾기·플레이어 구현.
- [shared/site.css](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/shared/site.css) — 반응형 스타일과 테마.
- [shared/i18n.mjs](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/shared/i18n.mjs) — 3개 locale UI·원고 fallback.
- [scripts/build-context.mjs](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/scripts/build-context.mjs) — 현재 host/locale/native 검증 전제.
- [scripts/prepare-assets.mjs](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/scripts/prepare-assets.mjs) — sitemap·robots·public key 생성.
- [scripts/verify-build.mjs](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/scripts/verify-build.mjs) — 정적 빌드 검증.
- [.github/workflows/deploy.yml](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/.github/workflows/deploy.yml) — 기존 Pages 배포 워크플로.
- [.github/workflows/verify-major-genres.yml](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/.github/workflows/verify-major-genres.yml) — 16장르 preview 검증 워크플로.
- [docs/VERIFICATION.md](https://github.com/emfls/guidehollow-games-en-puzzle/blob/df6d5b39819d493b5294069fce9f28c6cfc8c99a/docs/VERIFICATION.md) — 직전 검증 범위와 한계.
