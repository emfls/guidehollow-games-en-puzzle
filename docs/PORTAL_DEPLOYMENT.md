# 통합 포털 배포와 기존 사이트 이관

기준일: **2026-11-08 KST**. 최종 주소는 `https://games.guidehollow.com/` 하나다. 이 문서는 설정과 완료 여부를 구분하며, 새 도메인의 배포 또는 검색 제출 완료 기록이 아니다.

## 현재 완료한 부분

기존 `emfls/guidehollow-games-*` 저장소 4개를 감사했고 신규 저장소는 생성하지 않았다. puzzle 저장소의 `work/unified-game-portal` 브랜치에 Astro 통합 구조를 준비하고, 기존 확장 브랜치·네 저장소 main·원고와 디자인을 보존했다. 추가 12개 저장소·DNS 생성 계획은 취소했다.

전체 피드 2,846개 게임, 22개 언어, 16개 주요 장르를 반영한다. 지원 언어 조합 8,896개만 게임 상세 경로로 생성한다. 전체 HTML·사이트맵·source ID 완전성·제휴 URL, 실제 생성 HTML의 DOM 동작, IndexNow dry-run을 검사한다. [검증 기록](PORTAL_VERIFICATION.md), [이관 자산](PORTAL_MIGRATION_INVENTORY.md)을 참고한다.

## 미완료 외부 작업과 접근 차단

Cloudflare 프로젝트 생성·GitHub 연결·커스텀 도메인 연결, 가비아 DNS 변경, 새 호스트 Google Search Console 사이트맵 제출, 새 호스트 Naver IndexNow 실제 POST는 실행하지 않았다. `portal/config.json`의 `deploymentReady`는 `false`다.

연결된 브라우저 플러그인은 **originating browser context가 필요하다**는 오류를 반환한다. 로그인 만료나 계정 부재를 확인한 것은 아니다. 계정 대시보드 조작을 위해 연결된 확장 프로그램이 있는 브라우저에서 이 대화를 다시 열어야 한다. GitHub connector로 소스·브랜치·PR·Actions 검증은 진행할 수 있다. 현재 통합 브랜치는 기존 공개 사이트를 덮어쓰지 않는다.

## 무료 호스팅 결정

소스와 검증은 GitHub에 유지하고 **Cloudflare Pages Free의 정적 호스팅**으로 배포하도록 준비했다. GitHub Pages의 온라인 사업용 무료 호스팅 제한 때문에 신규 수익형 포털 호스트로 채택하지 않았다. Vercel Hobby의 비상업 제한과 Netlify Free의 크레딧 소진 시 정지도 비교했다. 공식 근거·판단 범위는 [호스팅 검토](PORTAL_HOSTING_AND_SEARCH.md)에 있다.

현재 약 1만 파일은 Pages Free 20,000파일 이내다. 검증은 전체 파일 수와 최대 개별 파일 크기도 확인한다. 향후 한도 초과 시 빌드가 실패하고 직전 배포를 유지한다. 게임을 조용히 제외하거나 자동 유료 전환하지 않으며, 그때 무료 동적 렌더링과 다른 무료 플랫폼 한도를 다시 평가한다.

## Cloudflare 프로젝트 설정

새 저장소 없이 기존 저장소를 Git integration으로 연결한다. 약 1만 파일은 대시보드 드래그앤드롭 업로드에 적합하지 않다.

| 항목 | 값 |
| --- | --- |
| Git 저장소 | `emfls/guidehollow-games-en-puzzle` |
| 초기 검증 브랜치 | `work/unified-game-portal` |
| 이관 후 운영 브랜치 | `main` |
| 프레임워크 / 프로젝트 루트 | Astro 정적 / 저장소 루트 |
| Node | `24` (`.node-version` 포함) |
| 빌드 명령 / 출력 | `npm run build` / `dist-portal` |
| 초기 검증 환경 | `PORTAL_PREVIEW=1`, `ASTRO_TELEMETRY_DISABLED=1` |
| 생산 환경 | `PORTAL_PREVIEW` 제거 또는 `0` |
| 최종 도메인 | `games.guidehollow.com` |

프로젝트 이름과 실제 `<project>.pages.dev` 주소는 **아직 미확정**이다. 예시 값을 DNS에 입력하지 않는다. 무료 플랜으로 생성하며 유료 Functions·스토리지·분석 서비스를 추가하지 않는다.

### 연결 복구 후 진행 순서

1. Cloudflare에서 기존 GitHub 저장소와 통합 브랜치를 연결하고 `PORTAL_PREVIEW=1`로 초기 검증 빌드를 만든다.
2. 실제 `pages.dev` 배포에서 모바일·PC 레이아웃, 언어·장르 이동, 검색, 실제 게임 실행과 제공업체 광고 흐름을 확인한다. 광고 클릭으로 수익 테스트를 하지 않는다.
3. Cloudflare 프로젝트의 Custom domains에 `games.guidehollow.com`을 먼저 등록한다.
4. 가비아에서 현재 DNS 전체와 사용처를 읽고 충돌·다른 사이트 영향을 확인한 뒤, 아래 단일 `games` CNAME을 추가한다. 관련 없는 A/MX/TXT/CNAME·네임서버는 변경하지 않는다.
5. HTTPS가 준비되면 생산 환경의 preview를 해제하고 재배포한다. 최종 호스트의 robots·canonical·lang·사이트맵·키·fingerprint를 확인한다.
6. `deploymentReady: true` 변경을 커밋해 재배포한다. 공개 fingerprint 일치 후 IndexNow를 실행한다. 플래그 변경만으로 제출하지 않는다.
7. Google Search Console의 확인된 Domain 속성 또는 URL-prefix 속성에 `https://games.guidehollow.com/sitemap.xml`을 제출한다. 과거 4개 호스트 제출을 새 호스트 성공으로 간주하지 않는다.
8. 새 통합 호스트 검증 후 PR을 main에 병합하고 Cloudflare 운영 브랜치도 main으로 변경한다. 기본 브랜치의 동기화·IndexNow 예약 작업이 이때 활성화된다.
9. 아래 기존 배포 정리 절차를 수행한다. 새 호스트 공개 확인 전에 기존 4개 사이트를 중지하지 않는다.

## 가비아 DNS: 최종 게임용 레코드 1개

| 타입 | 호스트 | 대상 | 상태 |
| --- | --- | --- | --- |
| CNAME | `games` | 실제 발급받은 `<project>.pages.dev` | 미등록·대상 미확정 |

가비아 DNS와 네임서버를 유지할 수 있다. 서브도메인 연결은 전체 도메인의 Cloudflare DNS 이전을 요구하지 않는다. Cloudflare Custom domains 등록 없이 CNAME만 먼저 만들지 않는다. [공식 연결 순서](https://developers.cloudflare.com/pages/configuration/custom-domains/)

읽기 전용 DNS 확인에서 `games.guidehollow.com`은 NXDOMAIN이었고, 기존 `en-puzzle`, `en-racing`, `en-sports`, `en-arcade`는 `emfls.github.io`를 가리켰다. 이것은 가비아 전체 레코드 감사를 대신하지 않는다. 이번 작업에서 DNS를 변경·삭제하지 않았다.

최종 게임 레코드는 games 하나만 남긴다. 기존 4개 레코드는 **통합 배포 검증·각 레코드 사용처 확인·콘텐츠 이관 확인 이후** 정리한다. 검색 이전을 위한 임시 리디렉션 기간에는 옛 호스트 DNS가 필요하므로 그 과도기를 ‘단일 레코드 완료’로 기록하지 않는다. 옛 레코드를 제거한 뒤에는 그 호스트의 리디렉션도 제공할 수 없음을 이관 기록에 남긴다.

## 기존 저장소와 배포 보존

| 저장소 / 옛 호스트 | 현재 상태 | 통합 검증 후 |
| --- | --- | --- |
| puzzle / `en-puzzle` | main·Pages 유지, 통합 브랜치 작업 | 통합 소스 저장소로 보존, 옛 콘텐츠 자동 배포 중지 |
| racing / `en-racing` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |
| sports / `en-sports` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |
| arcade / `en-arcade` | 변경 없음 | 원본 보존, 불필요한 자동 배포 중지 |

통합 브랜치의 legacy Pages 워크플로는 수동 rollback 전용이다. main 병합 전에는 기존 main 배포에 영향을 주지 않는다. 다른 세 저장소 워크플로도 아직 중지하지 않았다.

옛 게임 URL은 새 `/en/play/<slug>/`, 장르 홈은 새 `/en/<genre>/`로 대응한다. 가능하면 URL별 서버 리디렉션을 적용하고 응답을 확인한다. GitHub Pages에 `_redirects`를 넣는 것만으로 서버 301이 된다고 가정하지 않는다. 모든 옛 게임을 새 홈페이지 하나로 보내지 않는다.

## 자동화와 무료 사용량

- 전체 카탈로그: 매일 **05:17 KST** (`20:17 UTC`), 수집·빌드·전수 정적·DOM 검사를 모두 통과한 데이터만 커밋.
- Naver: 매시간 **43분**, 공개 배포와 일치하는 변경·제거 URL만 통지.
- 두 예약 작업은 기본 브랜치 반영 전에는 실행되지 않으며 현재는 준비 상태.
- Cloudflare Git integration은 설정한 운영 브랜치를 배포. Build watch paths에서 `data/portal/indexnow-receipt.json`과 문서·보고서만 바뀐 커밋을 제외해 불필요한 빌드를 줄임. 카탈로그·UI·원고·설정·의존성 변경은 빌드 대상으로 유지.
- GitHub 검증 보고서는 7일 보관. 대형 정적 아카이브는 기본 업로드하지 않고 수동 입력으로만 1일 보관.

게임 수 제한은 없다. 호스팅 한도 초과나 새 지원 언어 UI 누락은 조용한 제외 대신 명시적인 실패로 처리한다. 제공업체의 실제 지원 변화와 무료 서비스 조건은 운영 중 다시 확인한다.
