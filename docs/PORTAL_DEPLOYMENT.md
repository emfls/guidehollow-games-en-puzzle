# 통합 포털 배포와 기존 사이트 이관

기준일: **2026-11-08 KST**. 최종 주소는 `https://games.guidehollow.com/` 하나다. 이 문서는 확인한 공개 배포 상태와 남은 운영 전환·검색 제출 작업을 기록한다.

## 현재 완료한 부분

기존 `emfls/guidehollow-games-*` 저장소 4개를 감사했고 신규 저장소는 생성하지 않았다. puzzle 저장소의 `work/unified-game-portal` 브랜치에 Astro 통합 구조를 준비하고, 기존 확장 브랜치·네 저장소 main·원고와 디자인을 보존했다. 추가 12개 저장소·DNS 생성 계획은 취소했다.

전체 피드 2,846개 게임, 22개 언어, 16개 주요 장르를 반영한다. 지원 언어 조합 8,896개만 게임 상세 경로로 생성한다. 전체 HTML·사이트맵·source ID 완전성·제휴 URL, 실제 생성 HTML의 DOM 동작, IndexNow dry-run을 검사한다. [검증 기록](PORTAL_VERIFICATION.md), [이관 자산](PORTAL_MIGRATION_INVENTORY.md)을 참고한다.

## 공개 배포 완료와 남은 작업

Cloudflare Pages Free 프로젝트 `guidehollow-games`에 기존 GitHub 저장소를 연결했다. 통합 브랜치의 소스 `7a80870bdf44378eb3d11049167a2c0299573c79`로 최초 검증 배포 `ae918eba`와 운영 전환 배포 `70d5fa12-5d9c-4c9c-abab-5b39a374b0ee`가 성공했다. `games.guidehollow.com`의 Custom domain은 활성·SSL 사용 상태이며, 루트와 `/ko/`의 HTTPS 접속을 확인했다.

Production 환경은 `PORTAL_PREVIEW=0`, Preview 환경은 `PORTAL_PREVIEW=1`이다. 공개 `/build-info.json`의 origin·`preview:false`·build ID와 robots·한국어 canonical·사이트맵·공개 키 파일을 확인했다. 모바일·PC 화면, 한국어 검색, 공식 iframe의 프리롤과 실제 Sudoku 보드 로딩도 확인했다. 세부 관측과 확인 범위는 [공개 배포 검증](PORTAL_VERIFICATION.md#공개-배포-검증--2026-11-08-kst)에 기록했다.

[최종 브랜치 CI](https://github.com/emfls/guidehollow-games-en-puzzle/actions/runs/42416811438)의 모든 단계 통과 후 PR #1을 main에 병합했다(`39894a35cecc84d203b3b3ff3a2caa0d5013089d`). Cloudflare Production branch도 main으로 전환했고 main 운영 배포 `a88c0e88-b7ab-4054-8a6a-6adcbcf1fc1f`가 2026-11-08 06:42 KST에 성공했다.

`portal/config.json`의 `deploymentReady: true`를 main의 `c99fc3092e5f3043d8b37b4e7de09f6f3bb49031`에 반영했다. 운영 배포 `3acaf7a7-e447-473d-8238-067e49fa5a20` 성공 후 실제 `games.guidehollow.com`에서 새 fingerprint와 `preview:false`를 확인했다. Naver IndexNow에 변경 URL 562개를 통지해 HTTP 200 응답을 확인했다. 이 응답은 실제 색인·검색 순위·수익 발생의 검증이 아니다. Google Search Console 사이트맵 제출은 비공개 속성·검색 데이터 접근의 명시적 승인 대기로 남아 있다. 기존 4개 사이트는 유지한다.

## 무료 호스팅 결정

소스와 검증은 GitHub에 유지하고 **Cloudflare Pages Free의 정적 호스팅**으로 배포했다. GitHub Pages의 온라인 사업용 무료 호스팅 제한 때문에 신규 수익형 포털 호스트로 채택하지 않았다. Vercel Hobby의 비상업 제한과 Netlify Free의 크레딧 소진 시 정지도 비교했다. 공식 근거·판단 범위는 [호스팅 검토](PORTAL_HOSTING_AND_SEARCH.md)에 있다.

현재 약 1만 파일은 Pages Free 20,000파일 이내다. 검증은 전체 파일 수와 최대 개별 파일 크기도 확인한다. 향후 한도 초과 시 빌드가 실패하고 직전 배포를 유지한다. 게임을 조용히 제외하거나 자동 유료 전환하지 않으며, 그때 무료 동적 렌더링과 다른 무료 플랫폼 한도를 다시 평가한다.

## Cloudflare 프로젝트 설정

새 저장소 없이 기존 저장소를 Git integration으로 연결했다. 약 1만 파일은 대시보드 드래그앤드롭 업로드에 적합하지 않다.

| 항목 | 값 |
| --- | --- |
| Git 저장소 | `emfls/guidehollow-games-en-puzzle` |
| 초기 검증 브랜치 | `work/unified-game-portal` |
| 현재 운영 브랜치 | `main` |
| 프레임워크 / 프로젝트 루트 | Astro 정적 / 저장소 루트 |
| Node | `NODE_VERSION=24` (`.node-version` 포함) |
| 빌드 명령 / 출력 | `npm run build` / `dist-portal` |
| 초기 검증 환경 | `PORTAL_PREVIEW=1`, `ASTRO_TELEMETRY_DISABLED=1` |
| Production 환경 | `PORTAL_PREVIEW=0`, `ASTRO_TELEMETRY_DISABLED=1` |
| Preview 환경 | `PORTAL_PREVIEW=1` |
| 최종 도메인 | `games.guidehollow.com` |

프로젝트는 `guidehollow-games`, 실제 기본 호스트는 `guidehollow-games.pages.dev`다. 이 실제 호스트를 가비아 CNAME 대상으로 저장했다. 무료 플랜을 사용하며 유료 Functions·스토리지·분석 서비스를 추가하지 않는다.

### 운영 공개와 검색 통지 순서

1. Cloudflare에서 기존 GitHub 저장소와 통합 브랜치를 연결하고 `PORTAL_PREVIEW=1`로 초기 검증 빌드를 만든다.
2. 실제 `pages.dev` 배포에서 모바일·PC 레이아웃, 언어·장르 이동, 검색, 실제 게임 실행과 제공업체 광고 흐름을 확인한다. 광고 클릭으로 수익 테스트를 하지 않는다.
3. Cloudflare 프로젝트의 Custom domains에 `games.guidehollow.com`을 먼저 등록한다.
4. 가비아에서 현재 DNS 전체와 사용처를 읽고 충돌·다른 사이트 영향을 확인한 뒤, 아래 단일 `games` CNAME을 추가한다. 관련 없는 A/MX/TXT/CNAME·네임서버는 변경하지 않는다.
5. HTTPS가 준비되면 생산 환경의 preview를 해제하고 재배포한다. 최종 호스트의 robots·canonical·lang·사이트맵·키·fingerprint를 확인한다.
6. `deploymentReady: false`를 유지한 채 검증된 PR을 main에 병합하고 Cloudflare 운영 브랜치도 main으로 변경한다. main의 운영 배포 완료와 실제 호스트의 build 정보를 확인한다. 두 자동화 워크플로는 기본 브랜치를 체크아웃하므로 이 단계를 IndexNow보다 먼저 완료한다.
7. main의 공개 배포를 확인한 뒤 `deploymentReady: true` 변경을 커밋하고 재배포한다. 이 설정 파일 변경은 fingerprint를 바꾸므로 새 공개 build ID가 소스와 일치하고 `preview:false`이며 공개 키가 맞는지 확인한 후 IndexNow를 실행한다. 플래그 변경만으로 제출하지 않는다.
8. Google Search Console 접근의 명시적 승인을 받은 뒤, 확인된 Domain 속성 또는 URL-prefix 속성에 `https://games.guidehollow.com/sitemap.xml`을 제출한다. 현재는 승인 대기이며, 과거 4개 호스트 제출을 새 호스트 성공으로 간주하지 않는다.
9. 아래 기존 배포 정리 절차를 수행한다. 새 호스트 공개 확인 전에 기존 4개 사이트를 중지하지 않는다.

## 가비아 DNS: 최종 게임용 레코드 1개

| 타입 | 호스트 | 대상 | TTL | 상태 |
| --- | --- | --- | ---: | --- |
| CNAME | `games` | `guidehollow-games.pages.dev` | 600 | 2026-11-08 06:29:14 KST 저장, HTTPS 접속 확인 |

가비아 DNS와 네임서버를 유지할 수 있다. 서브도메인 연결은 전체 도메인의 Cloudflare DNS 이전을 요구하지 않는다. Cloudflare Custom domains 등록 없이 CNAME만 먼저 만들지 않는다. [공식 연결 순서](https://developers.cloudflare.com/pages/configuration/custom-domains/)

연결 전 읽기 전용 조회에서는 `games.guidehollow.com`이 NXDOMAIN이었고, 기존 `en-puzzle`, `en-racing`, `en-sports`, `en-arcade`는 `emfls.github.io`를 가리켰다. 이번 가비아 저장에서는 `games` CNAME 한 개를 추가했으며 기존 13개 레코드가 유지된 총 14개 레코드를 확인했다. 기존 레코드와 네임서버 `ns.gabia.co.kr`는 변경하지 않았다.

최종 게임 레코드는 games 하나만 남긴다. 기존 4개 레코드는 **통합 배포 검증·각 레코드 사용처 확인·콘텐츠 이관 확인 이후** 정리한다. 검색 이전을 위한 임시 리디렉션 기간에는 옛 호스트 DNS가 필요하므로 그 과도기를 ‘단일 레코드 완료’로 기록하지 않는다. 옛 레코드를 제거한 뒤에는 그 호스트의 리디렉션도 제공할 수 없음을 이관 기록에 남긴다.

## 기존 저장소와 배포 보존

| 저장소 / 옛 호스트 | 현재 상태 | 통합 검증 후 |
| --- | --- | --- |
| puzzle / `en-puzzle` | 통합 main·Cloudflare 운영, 옛 Pages 보존 | 통합 소스 저장소 보존, 옛 Pages는 수동 rollback 전용 |
| racing / `en-racing` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |
| sports / `en-sports` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |
| arcade / `en-arcade` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |

main에 반영한 legacy Pages 워크플로는 수동 rollback 전용이다. 옛 Pages 배포와 DNS는 유지하며, 다른 세 저장소 워크플로도 아직 중지하지 않았다.

옛 게임 URL은 새 `/en/play/<slug>/`, 장르 홈은 새 `/en/<genre>/`로 대응한다. 가능하면 URL별 서버 리디렉션을 적용하고 응답을 확인한다. GitHub Pages에 `_redirects`를 넣는 것만으로 서버 301이 된다고 가정하지 않는다. 모든 옛 게임을 새 홈페이지 하나로 보내지 않는다.

## 자동화와 무료 사용량

- 전체 카탈로그: 매일 **05:17 KST** (`20:17 UTC`), 수집·빌드·전수 정적·DOM 검사를 모두 통과한 데이터만 커밋.
- Naver: 매시간 **43분**, 공개 배포와 일치하는 변경·제거 URL만 통지.
- 두 예약 워크플로를 기본 브랜치 main에 반영했다. 실행 소스는 모두 기본 브랜치이며, Cloudflare 운영 브랜치도 main이다. 일일 카탈로그 동기화는 이번 작업에서 수동 실행하지 않았다.
- Cloudflare Git integration은 main을 자동 배포한다. 현재 Build watch paths는 기본 포함 패턴 `*`이며 문서·영수증 변경 제외는 설정하지 않았다. 향후 `data/portal/indexnow-receipt.json`과 문서·보고서만 바뀐 커밋을 제외하면 불필요한 빌드를 줄일 수 있다. 카탈로그·UI·원고·설정·의존성 변경은 계속 빌드 대상으로 유지해야 한다.
- GitHub 검증 보고서는 7일 보관. 대형 정적 아카이브는 기본 업로드하지 않고 수동 입력으로만 1일 보관.

게임 수 제한은 없다. 호스팅 한도 초과나 새 지원 언어 UI 누락은 조용한 제외 대신 명시적인 실패로 처리한다. 제공업체의 실제 지원 변화와 무료 서비스 조건은 운영 중 다시 확인한다.
