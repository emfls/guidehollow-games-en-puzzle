# 통합 Playgama 포털: 호스팅과 검색 등록 검토

작성·확인 기준: **2026-11-08 KST**. 로컬 산출물의 최종 근거는 [portal-verification.json](../release-manifests/portal-verification.json)이며, 보고서 확인 시각은 **2026-11-08 01:06:14 KST**다. 호스팅·검색 정책은 아래에 연결한 운영사와 검색엔진의 공식 문서를 근거로 한다.

목표 호스트는 `https://games.guidehollow.com/`이다. **통합 포털의 로컬 빌드와 파일 검증은 완료했지만, Cloudflare 프로젝트 생성·배포·DNS 연결·새 호스트의 Google Search Console 등록·IndexNow 실제 제출은 아직 하지 않았다.** 브라우저의 origin context 연결 문제로 계정 화면 작업이 막혀 있으며, 아래의 로컬 성공 결과를 공개 사이트 운영 완료로 해석하면 안 된다.

## 1. 권고와 현재 결정 조건

**우선 추천은 Cloudflare Pages Free에 Astro 정적 산출물을 배포하는 방식이다. 단, 전체 배포 파일이 20,000개 이하여야 한다.** HTML을 그대로 제공하므로 검색엔진이 가이드를 읽기 쉽고, 정적 요청에는 사용량 요금이 없으며, 현재 가비아 DNS를 유지하면서 `games` 서브도메인만 CNAME으로 연결할 수 있다. [Pages 제한](https://developers.cloudflare.com/pages/platform/limits/), [정적 요청 요금](https://developers.cloudflare.com/pages/functions/pricing/), [외부 DNS 연결](https://developers.cloudflare.com/pages/configuration/custom-domains/)

**최종 빌드 실측:** 2,846개 게임과 22개 기본 언어로 구성된 포털은 게임 상세 8,896개를 포함해 **10,350 HTML(404 포함), 총 10,403파일**을 생성했다. 총 크기는 **314,746,434바이트**, 가장 큰 파일은 **`assets/catalog/en.json`의 828,957바이트**다. 현재 구현의 파일 수 검증 조건인 20,000개 미만과 개별 파일 25MiB 조건을 모두 통과했다. 이 실제 산출물 규모에서는 정적 Pages를 사용할 수 있으며, 파일 수 때문에 SSR을 먼저 도입할 필요는 없다.

카탈로그는 [data/portal/catalog.json](../data/portal/catalog.json)을 사용한다. 전수 수집의 원본 ID 목록과 수집 총수·해시는 [data/portal/sync-state.json](../data/portal/sync-state.json)에 보존되어 있어, CI는 두 파일의 ID 집합과 스냅샷을 비교한다. 큰 중간 수집 파일을 CI의 필수 입력으로 사용하지 않는다.

| 최종 확인 항목 | 실측 결과 |
|---|---:|
| 게임 / 기본 언어 / 주요 장르 | 2,846 / 22 / 16 |
| 일반 경로 / 404 포함 HTML | 10,349 / 10,350 |
| 게임 상세 경로 | 8,896 |
| 전체 배포 파일 | 10,403 |
| 전체 크기 | 314,746,434바이트 |
| 최대 개별 파일 | `assets/catalog/en.json` — 828,957바이트 |
| Astro 빌드 | 12.46초 |
| 로컬 검증 | 12.924초 |
| 색인 허용 페이지 / 사이트맵 URL | 562 / 562 |
| 사이트맵 하위 파일 | 23개 |
| 검증 오류 | 0개 |

파일·페이지·크기·검증 시간은 [최종 검증 보고서](../release-manifests/portal-verification.json)의 값이다. Astro 12.46초는 해당 최종 빌드의 실행 기록이며, 보고서의 `durationMs: 12924`는 별도의 검증 시간이다. 이 시간은 현재 로컬 환경의 실측이며 Cloudflare에서의 빌드 시간 보장은 아니다.

향후 전체 게임과 지원 언어를 조합한 실제 파일 수가 한도를 넘으면 이 권고의 전제는 성립하지 않는다. 일부 언어·게임을 몰래 제외하거나 여러 계정으로 쪼개지 않는다. 다음을 구분해서 결정한다.

- **20,000파일 이내:** 현재 Astro 정적 빌드 유지. 게임·언어·장르 목록뿐 아니라 HTML, JSON, CSS, JS, 이미지, 사이트맵, 키 파일까지 합산한다.
- **20,000파일 초과:** Netlify의 전체 정적 배포와 Cloudflare의 동적 렌더링을 비교한다. 전자는 월 무료 사용량 소진 시 정지하고, 후자는 무료 요청·CPU 한도와 구현·DNS 조건이 생긴다. 아래 4절의 조건을 확인하기 전에는 “전체 포털을 무료로 수용한다”고 확정하지 않는다.
- **현재 보존 대상:** 조사 시점의 `data/catalog.json`은 고유 게임 160개다. 이 편집 원고 및 기존 원본·번역은 통합 과정에서도 보존한다. 이 수는 전체 Playgama 카탈로그 크기나 최종 게임×언어 페이지 수가 아니다.

기존 `en-puzzle`, `en-racing`, `en-sports`, `en-arcade`의 공개 서비스는 통합 호스트의 실제 정상 동작을 확인할 때까지 유지한다. 신규 장르별 레포·도메인을 계속 만드는 계획은 통합 목표에 포함하지 않는다.

## 2. 무료 호스팅 비교

| 항목 | GitHub Pages | Cloudflare Pages Free | Netlify Free | Vercel Hobby |
|---|---|---|---|---|
| 수익형 포털 적합성 | 온라인 사업을 위한 무료 호스팅 사용 제한이 명시되어 있어 신규 포털용으로 비추천 | 일반 약관·Developer Platform 약관 적용. 검토 문서에서 비상업 개인 용도로만 제한하는 조항은 확인하지 못했으며, 광고·제휴형 HTML 포털의 후보로 판단 | 공식 Free 소개에서 상업 프로젝트 사용 가능 명시 | 개인 비상업 용도 전용이므로 이 포털에 부적합 |
| 주요 무료 한도 | 공개 사이트 1GB, 월 전송량 100GB 소프트 한도 | 사이트당 20,000파일, 파일당 25MiB | 월 300크레딧 하드 한도 | 상업용 제한이 먼저 적용됨 |
| 빌드·배포 | Pages 배포 10분 타임아웃. 시간당 10빌드 소프트 한도는 사용자 지정 Actions 워크플로에 적용되지 않음 | 월 500빌드, 동시 1빌드, 빌드 20분 타임아웃 | 프로덕션 배포 1회 15크레딧. 현재 크레딧 요금제는 빌드 시간을 별도 사용량 항목으로 계산하지 않음 | 빌드 45분. CLI 입력 소스 15,000파일·Hobby 100MB 제한; 빌드 출력 파일 수와는 다른 제한 |
| 대량 파일 | 파일 수보다 전체 1GB와 배포 시간이 우선 제약 | 실제 배포 파일 20,000개가 직접 제약 | 배포 전체 파일 수 상한 없음. 디렉터리당 54,000파일 제한 | 빌드 출력 파일 수 상한은 명시하지 않지만 대량 생성으로 45분을 넘으면 실패 |
| 트래픽 | 월 100GB 소프트 한도 | Functions를 호출하지 않는 정적 요청 무료·무제한 | 전송 1GB당 20크레딧, 요청 10,000회당 2크레딧 | 무료 상업용 후보에서 제외 |
| 현실적인 단점 | 현재 사업 목적과 서비스 조건의 불일치 위험 | 파일 한도, 신규 계정/배포 권한 필요, 공식 Astro SSR 대상은 Workers로 바뀜 | 소진 시 사이트 자동 일시정지. 새 무료 요금제를 과거의 100GB 무료 플랜과 혼동하면 안 됨 | 수익 발생 전이라도 상업 목적을 Hobby 허용으로 볼 수 없음 |

표의 공식 근거:

- GitHub: [Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [추가 제품 약관의 Pages 항목](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features). 일부 기부·크라우드펀딩 수익화 허용이 모든 온라인 사업의 허용을 뜻하지는 않는다.
- Cloudflare: [Self-Serve 약관](https://www.cloudflare.com/terms/), [Developer Platform 약관](https://www.cloudflare.com/service-specific-terms-developer-platform/), [Pages 제한](https://developers.cloudflare.com/pages/platform/limits/). 무료 상업 적합성은 이 약관 검토에 따른 판단이며, 개별 사업에 대한 운영사의 별도 승인이라는 뜻은 아니다. 무제한 정적 요청도 약관상 서비스 보호를 위한 제한 가능성까지 없앤다는 뜻은 아니다.
- Netlify: [Free의 상업 프로젝트 허용](https://www.netlify.com/blog/introducing-netlify-free-plan/)은 이용 용도 근거로만 사용했다. 현재 사용량은 [크레딧 요금제](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [크레딧 FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/), 파일 수는 [Deploy overview](https://docs.netlify.com/deploy/deploy-overview/)가 근거다.
- Vercel: [Hobby](https://vercel.com/docs/plans/hobby), [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines), [Limits](https://vercel.com/docs/limits). CLI 업로드 100MB를 사이트 전체 출력 용량 제한으로 잘못 해석하지 않는다.

Netlify의 계산 예시: 월 프로덕션 배포 4회(60) + 전송 10GB(200) + 요청 100,000회(20)는 **280크레딧**이다. 이는 위 공식 단가를 적용한 예시이며 실제 예상 방문량이 아니다. 임베드 게임 제공 서버의 트래픽과 포털이 직접 제공하는 HTML·자산 트래픽은 분리해서 측정해야 한다.

## 3. 확정된 경로 구조와 실제 파일 구성

현재 구현은 게임의 실제 인게임 지원 언어에 해당하는 경로만 생성한다. 포털에 포함하는 게임과 검색 색인을 허용하는 페이지는 구분한다. 원문만 있는 자동 안내 페이지도 이용할 수 있지만, 해당 언어의 편집 원고와 품질 조건을 충족하기 전에는 `noindex` 처리하고 색인용 사이트맵에서 제외한다.

| 용도 | 실제 경로 |
|---|---|
| 언어 선택 루트 | `/` |
| 언어별 목록 | `/{locale}/` |
| 언어별 목록 다음 페이지 | `/{locale}/page/{n}/` |
| 주요 장르 목록 | `/{locale}/{genre}/` |
| 장르 목록 다음 페이지 | `/{locale}/{genre}/page/{n}/` |
| 게임 상세 | `/{locale}/play/{slug}/` |
| 사이트맵 인덱스 | `/sitemap.xml` |

동일 게임을 여러 장르에서 소개해도 게임 상세는 언어당 하나의 `/play/` 경로로 유지한다. 최종 HTML 구성은 다음과 같다.

| 페이지 종류 | HTML 수 |
|---|---:|
| 언어 선택 루트 | 1 |
| 언어별 목록과 페이지네이션 | 381 |
| 장르 목록과 페이지네이션 | 1,005 |
| 소개 / 개인정보 / 검색 | 각 22, 합계 66 |
| 게임 상세 | 8,896 |
| 404 | 1 |
| **합계** | **10,350** |

여기에 JSON·CSS·JS·사이트맵·키 등 비HTML 파일 53개를 더한 총 배포 파일 수가 **10,403개**다. 색인 허용 페이지는 **562개**이며, 그중 게임 상세는 **194개(EN 160, KO 15, JA 19)**다. 나머지 게임 경로가 없는 것이 아니라, 페이지 생성과 색인 허용을 별도로 판단한 결과다.

```text
게임 HTML 수 = Σ(각 게임에 실제로 게시할 언어 URL 수)
전체 파일 수 = 게임 HTML + 언어 홈 + 장르/카테고리/목록 페이지
             + 소개/개인정보/404 + 사이트맵 + 키/검증 파일
             + CSS/JS/JSON/이미지 등 나머지 배포 자산
```

| 가정한 규모 | 게임 HTML만의 수 | Pages Free 판단 |
|---|---:|---|
| 3,000게임 × 평균 3언어 | 9,000 | 다른 파일을 더한 실측 필요 |
| 3,000게임 × 평균 5언어 | 15,000 | 카테고리·페이지네이션·JSON까지 더해 20,000 이내인지 확인 |
| 3,000게임 × 평균 10언어 | 30,000 | 전체 정적 배포 불가 |
| 5,000게임 × 평균 10언어 | 50,000 | 전체 정적 배포 불가 |

이 표는 향후 확장을 설명하기 위한 가정이다. 현재 배포 판단에는 표의 가정이나 과거 추정치를 사용하지 않고, 검증을 통과한 `dist-portal`의 **10,350 HTML / 10,403파일**을 사용한다. 다음 동기화로 게임·언어가 늘어나면 같은 방식으로 파일 수와 크기를 다시 검증한다. 사이트맵을 쪼개거나 URL 구조만 바꿔도 HTML 파일 총수 자체는 줄어들지 않는다.

Netlify는 이 파일 수 제약이 더 느슨하지만, 공식 문서도 수만 HTML 파일의 처리가 수분 이상 길어질 수 있고 10MB를 넘는 개별 파일은 업로드에 문제가 생길 수 있다고 안내한다. 거대한 검색용 JSON 하나를 만드는 방식도 별도로 확인해야 한다. [Netlify 대형 사이트 안내](https://docs.netlify.com/build/configure-builds/troubleshooting-tips/)

## 4. Cloudflare의 DNS·배포·SSR 조건

### 4.1 Pages의 서브도메인은 가비아 DNS 유지 가능

`games.guidehollow.com`은 apex가 아닌 서브도메인이므로 Cloudflare의 DNS zone으로 이전할 필요가 없다. Pages 프로젝트의 Custom domains에서 먼저 연결을 등록하고, 이후 가비아에서 `games` CNAME을 해당 프로젝트의 `<project>.pages.dev`로 지정하는 구성이다. 대시보드 연결 없이 CNAME만 먼저 추가하면 `522`가 발생할 수 있다는 공식 주의사항이 있다. 루트 `guidehollow.com`을 Pages에 직접 연결하는 경우에는 Cloudflare zone과 네임서버 설정이 필요하므로 이번 서브도메인 구성과 구별한다. [Pages Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

이 문서 작성 중 DNS 설정을 변경하지 않았다. `<project>`는 미확정 이름이며 실제 연결값으로 사용하면 안 된다.

### 4.2 계정·배포 권한과 현재 실행 가능 여부

Cloudflare 계정 및 프로젝트 접근 권한이 필요하다. GitHub 연동은 Git 제공자 연결 승인이 필요하고, GitHub Actions에서 직접 업로드하려면 Cloudflare 계정 ID와 적절한 API 토큰이 필요하다. 토큰은 저장소의 공개 파일이 아닌 Actions secret에 둔다. 기존 Git 저장소를 재사용할 수 있으므로 언어·장르별 신규 저장소를 만들 이유는 없다. [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

대용량 포털은 대시보드 드래그앤드롭보다 Git 연동 또는 Wrangler 배포가 적합하다. 공식 문서상 드래그앤드롭은 1,000파일, Wrangler는 20,000파일 한도이며, Direct Upload로 만든 프로젝트를 나중에 Git integration 프로젝트로 전환할 수는 없다. 대시보드 드래그앤드롭은 `functions` 폴더의 컴파일도 지원하지 않는다. [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

현재 브라우저의 origin context 연결 문제로 계정 화면 작업이 막혀 있다. **Cloudflare 프로젝트 생성, 배포, DNS 연결은 미실행**이며, 새 호스트의 공개 HTTP 응답·TLS와 실제 대시보드 조작 가능 여부도 확인하지 못했다. 새 가입·OAuth 승인·토큰 발급 역시 이 작업에서 실행하지 않았다. 로컬 빌드가 한도를 통과했다는 사실과 공개 배포가 완료됐다는 사실을 구분한다.

### 4.3 20,000파일을 넘으면 동적 렌더링의 다른 한도를 검토

Cloudflare Workers Free의 최신 공식 한도는 다음과 같다. Pages Functions도 Workers 요청 한도를 공유한다.

| 항목 | 현재 무료 한도/동작 |
|---|---|
| Worker/Function 요청 | 계정의 해당 무료 사용량 합계 100,000회/일, UTC 자정 초기화 |
| CPU | HTTP 요청당 10ms. 네트워크 응답 대기시간은 CPU 시간과 구별 |
| 메모리 | 128MB |
| Worker 번들 | **비압축 64MiB**, 압축 크기 별도 한도 없음 |
| 초기화 | 전역 코드 파싱·실행 1초 |
| 외부 subrequest | 요청당 50회 |
| Workers Static Assets | 무료도 20,000파일, 파일당 25MiB |

근거: [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/), [Pages Functions 요금](https://developers.cloudflare.com/pages/functions/pricing/). 과거의 “Free Worker는 gzip 3MB” 설명은 현재 문서와 맞지 않는다. 실제 번들 크기 외에도 초기화·CPU·메모리를 측정해야 한다.

캐시가 요청 한도를 자동으로 없애지는 않는다. `caches.default`는 Worker 안에서 실행되며 캐시 내용이 모든 데이터센터로 자동 복제되지 않는다. 별도의 Workers Caching도 현재 요금 문서에서는 캐시 적중 요청을 요청 수에 포함한다. 캐시가 절약하는 CPU와 요청 수는 구분한다. [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

Pages Functions를 추가하면 기본적으로 모든 요청이 Function을 호출할 수 있으므로 `_routes.json`에서 정적 자산 경로를 제외한다. SSR이 필요 없는 CSS·JS·사이트맵·robots·IndexNow 키가 일일 요청 한도를 소비하지 않도록 하는 목적이다. Workers의 `run_worker_first`도 대상 요청마다 Worker를 실행하며, 무료 한도 소진 시 정적 파일로 자동 복구하는 것으로 기대하면 안 된다. [Pages routing](https://developers.cloudflare.com/pages/functions/routing/), [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

런타임 데이터가 필요한 경우 Workers의 `ASSETS` binding으로 배포 자산을 가져올 수 있다. 다만 모든 게임을 요청마다 파싱·검색하는 설계가 10ms 안에 들어간다고 가정하지 않는다. 게임 ID와 언어별로 찾을 수 있게 빌드 때 정리하고, 데이터 크기·캐시 부재 상태·실제 렌더링 비용을 확인한다. 이는 구현 권고이며 검증된 운영 성능 수치가 아니다. [Assets binding](https://developers.cloudflare.com/workers/static-assets/binding/)

### 4.4 Astro 7 SSR과 Pages는 같은 배포 대상이 아님

현재 공식 `@astrojs/cloudflare` 문서는 v13/Astro 6 전환에서 **Cloudflare Pages 지원 제거**를 명시한다. 정적 Astro는 어댑터 없이 Pages에 배포할 수 있지만, 최신 공식 어댑터로 SSR을 켜는 경로는 Workers다. Pages Functions에서 별도 렌더 함수를 구현하는 선택은 가능성을 따로 검증해야 하는 구현 작업이며, 공식 Astro 어댑터를 붙이는 작업과 동일하지 않다. [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

Workers Custom Domain은 **활성 Cloudflare zone**을 요구한다. 따라서 Pages의 외부 DNS CNAME 가능성을 Workers에도 그대로 적용하면 안 된다. 일반적인 무료 구성에서 Workers 커스텀 호스트로 바꾸려면 DNS 운영 방식 변경이 추가로 필요하다. Cloudflare의 유료 partial zone 구성을 무료 대안처럼 제시하지 않는다. [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [DNS setup 종류](https://developers.cloudflare.com/dns/zone-setups/)

Cloudflare 자체도 신규 애플리케이션에는 Workers를 권고하고 있다. 이번 Pages 우선 권고는 기존 Astro 정적 결과와 가비아 DNS 유지에 맞춘 선택이며, 장기 SSR 확장에 아무 제약이 없다는 의미가 아니다. [Pages overview](https://developers.cloudflare.com/pages/)

## 5. 네이버 IndexNow

### 지원 범위와 언어

네이버 Search Advisor는 새 URL·업데이트·삭제를 알리는 IndexNow를 공식 지원한다. `200`은 요청 수신 성공이며 색인이나 상위 노출 보장이 아니다. [IndexNow 소개](https://searchadvisor.naver.com/guide/indexnow-about), [FAQ](https://searchadvisor.naver.com/guide/indexnow-faq)

확인한 네이버 API 사양에는 언어 매개변수나 한국어 URL만 허용한다는 제한이 없다. 따라서 한 호스트 아래 `/en/`, `/ko/`, `/ja/` 등 실제로 공개된 경로를 통지 대상으로 구성할 수 있다는 것은 **API 사양에 근거한 판단**이다. 모든 외국어 페이지가 네이버에서 색인·노출된다는 보장으로 해석하지 않는다. [요청 사양](https://searchadvisor.naver.com/guide/indexnow-request)

### 키와 요청

통합 호스트 전용 키를 준비한다. 네이버는 호스트별 별도 키, UTF-8, 8–128자, 문자 집합 `a-f`, `A-F`, `0-9`, `-`를 안내한다. 무작위 32자리 16진수면 이 조건을 충족한다. 루트의 `/<key>.txt` 내용은 키 자체다. 루트 키를 쓰면 언어별 디렉터리를 같은 호스트에서 처리할 수 있다. 하위 디렉터리 키는 그 경로 범위만 유효하므로 이 구조에는 적합하지 않다. [키 규칙](https://searchadvisor.naver.com/guide/indexnow-api-key)

```json
{
  "host": "games.guidehollow.com",
  "key": "<실제 발급한 호스트 전용 키>",
  "keyLocation": "https://games.guidehollow.com/<key>.txt",
  "urlList": [
    "https://games.guidehollow.com/en/play/<slug>/",
    "https://games.guidehollow.com/ko/play/<slug>/"
  ]
}
```

위 JSON은 설명용이며 그대로 전송할 데이터가 아니다. POST 대상은 `https://searchadvisor.naver.com/indexnow`, Content-Type은 `application/json; charset=utf-8`다. 한 요청 최대 **10,000 URL**이므로 초과분은 순차 배치로 나눈다. `200`은 성공 수신, `202`는 키 확인 중, `400`은 형식, `403`은 키, `422`는 URL·키 범위 문제, `429`는 과도한 요청이다. [공식 요청·상태 코드](https://searchadvisor.naver.com/guide/indexnow-request)

### 현재 상태와 배포 후 자동 통지

**통합 호스트에 대한 IndexNow 실제 POST는 아직 보내지 않았다.** 현재 빌드의 색인 허용 URL 집합은 562개이며, 최초 공개 후 키와 HTTPS를 확인한 다음 이 집합을 기준으로 제출한다. 단순히 게임 상세가 8,896개라는 이유로 `noindex` 페이지까지 전부 통지하지 않는다. 이후 변경·삭제 알림은 직전 성공 배포와 비교한다.

1. 프로덕션 배포 성공 후 공개 HTTPS 키 파일을 일반 TLS 검증으로 읽고 내용이 일치하는지 확인한다. DNS·인증서가 아직 준비되지 않았으면 통지는 대기 상태로 남긴다.
2. 직전 성공 배포와 비교해 추가·변경·삭제된 URL만 정리한다. 통합 호스트의 최초 공개 URL은 새 URL이지만, 이후 매번 변경 없는 전체 목록을 다시 보내지 않는다.
3. 실제 존재하는 URL을 중복 제거해 최대 10,000개씩 순차 전송한다. `429`에서 반복 전송을 멈추고, 이후 재시도를 별도 상태로 기록한다.
4. 통지 실패와 사이트 배포 실패를 구별한다. `202`를 키 검증 완료로, `200`을 색인 완료로 기록하지 않는다.

2–4의 변경 통지 범위는 네이버 FAQ와 요청 사양을 따른다. 나머지 검증·재시도 방식은 운영 권고다. 네이버는 `404`, `301`, `302`로 바뀐 URL도 통지할 수 있다고 안내하므로 삭제·이전 알림을 무조건 “현재 200인 URL만”으로 제한하지 않는다. [FAQ](https://searchadvisor.naver.com/guide/indexnow-faq)

검색에 남길 정상 게임 페이지는 외부에서 접근 가능해야 하며, robots 차단·`noindex`·방화벽 문제·중복 URL·콘텐츠 품질은 IndexNow 요청 성공과 별도로 확인한다. 네이버 FAQ는 IndexNow가 사이트맵이나 다른 수집 경로를 대체하지 않는다고 설명한다. [미노출 점검](https://searchadvisor.naver.com/guide/faq-serpmissing), [로봇 메타 태그](https://searchadvisor.naver.com/guide/markup-structure)

## 6. Google Search Console·사이트맵·다국어

### 별도 속성 및 사이트맵

통합 호스트만 관리하려면 `https://games.guidehollow.com/` URL-prefix 속성이 명확하다. HTML 검증 파일·메타 태그 등 지원되는 방식으로 소유권을 확인할 수 있다. `guidehollow.com` Domain 속성은 모든 프로토콜·서브도메인을 포함하지만 DNS 검증이 필요하다. 기존 Domain 소유권이 실제 확인되지 않은 상태에서 자동 승계되었다고 가정하지 않는다. [속성 종류](https://support.google.com/webmasters/answer/34592?hl=en), [소유권 확인](https://support.google.com/webmasters/answer/9008080?hl=en)

현재 구현의 사이트맵 인덱스는 **`https://games.guidehollow.com/sitemap.xml`**이다. 최종 로컬 검증에서 **하위 사이트맵 23개, 색인 허용 URL 562개**를 확인했다. 새 호스트의 Search Console 속성 등록과 이 인덱스의 실제 제출은 아직 하지 않았다. 단일 사이트맵은 **비압축 50MB 또는 50,000 URL** 중 먼저 도달하는 한도가 적용된다. 절대 HTTPS 주소와 실제 canonical URL만 넣으며, 언어 대체 링크를 추가하면 XML 바이트가 늘 수 있으므로 URL 수와 파일 크기를 함께 검증한다. [사이트맵 작성](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [사이트맵 인덱스](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps/)

프로덕션용 `robots.txt`의 사이트맵 주소도 `Sitemap: https://games.guidehollow.com/sitemap.xml`이다. 이 파일이 생성됐다는 사실은 실제 Search Console 제출·소유권 확인을 완료했다는 뜻이 아니다. [robots sitemap 필드](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)

일반 게임 페이지에 Google Indexing API를 사용하지 않는다. 공식 지원 대상은 `JobPosting` 또는 `VideoObject` 안의 `BroadcastEvent` 페이지다. 네이버 IndexNow 성공을 Google 검색 등록 완료로 보고하지 않는다. [Indexing API 지원 범위](https://developers.google.com/search/apis/indexing-api/v3/quickstart)

### 언어 URL과 실제 콘텐츠

언어마다 고유 URL을 유지하며, 실제 게임 경로는 `/en/play/<slug>/`, `/ko/play/<slug>/`처럼 `/{locale}/play/{slug}/` 규칙을 사용한다. 브라우저 언어만으로 같은 URL의 본문을 바꾸거나 강제 이동시키면 검색엔진이 모든 변형을 찾기 어려울 수 있다. Google은 페이지의 보이는 내용으로 언어를 판단하므로 영어 원문에 한국어 메뉴·`lang="ko"`만 붙인 페이지를 완전한 한국어 가이드로 취급해서는 안 된다. [다국어 사이트 관리](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)

인게임 언어 지원은 Playgama 메타데이터이고, 웹 안내문 언어는 포털 콘텐츠의 속성이다. 두 조건을 별도로 저장·검증한다. 게임이 한국어를 지원한다는 사실만으로 한국어 설명 원고가 준비된 것은 아니다. 이 문서는 원본 영어 문장을 임의의 언어 태그로 재분류하는 방식을 권하지 않는다.

### Canonical과 hreflang

- 실제 번역된 각 게임 페이지는 해당 언어의 대표 URL을 canonical로 사용한다. 한국어·일본어 페이지를 일괄 영어 URL로 canonical 처리하지 않는다. 내부 링크와 사이트맵도 같은 URL을 사용한다. [Google canonical 지침](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- `hreflang`은 같은 게임의 실제 공개된 언어 대체 페이지끼리 연결한다. 자기 자신과 다른 변형을 포함하고 서로 역방향 연결을 유지한다. 미배포 언어, 존재하지 않는 게임 페이지, 다른 게임의 URL을 섞지 않는다. [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- HTML head 또는 XML 사이트맵 등 공식 지원 방식 하나를 일관되게 관리하면 된다. 두 방식을 함께 써도 검색상 추가 이득은 없으며 서로 다른 목록이 생기지 않도록 주의한다. 사이트맵 방식의 `xhtml:link`는 URL 개수 한도에 추가로 세지 않지만 XML 파일 크기는 증가시킨다. 같은 공식 localized versions 문서가 근거다.
- 언어 선택용 루트가 있다면 `x-default` 후보로 사용할 수 있다. 게임 상세의 대체 링크를 무조건 사이트 홈으로 돌리는 패턴과는 구별한다.

검색에 게시할 페이지는 Googlebot 접근 가능, HTTP 200, 색인 가능한 본문 조건을 갖춰야 한다. 조건 충족과 사이트맵 제출은 색인·순위 보장이 아니다. 게임 설명과 조작법을 iframe 밖의 초기 HTML에 제공하면 검색엔진이 페이지 자체의 내용을 읽을 수 있다는 것이 현재 정적 설계의 실질적인 이점이다. [Google 기술 요건](https://developers.google.com/search/docs/essentials/technical)

## 7. 기존 4개 사이트에서 통합 호스트로 옮기는 순서

1. 기존 160개 편집 데이터와 원본·번역을 보존하고, 현재 공개 URL을 새 포털의 같은 게임·언어 URL로 대응시킨다.
2. 새 통합 빌드와 공개 호스트에서 HTTPS, 대표 게임, 언어 이동, canonical, 사이트맵, robots, IndexNow 키, 실제 게임 실행을 확인한다.
3. 새 URL 검증이 끝난 뒤 이전 URL을 대응되는 새 URL로 영구 리디렉션한다. 서버 측 301/308이 권장되며 모든 옛 게임을 새 홈페이지 하나로 보내지 않는다.
4. 새 Search Console 사이트맵과 네이버 변경 알림을 적용하고, 그 뒤 기존 4개의 콘텐츠 배포 워크플로를 중단한다. 저장소·원고 삭제와 리디렉션 호스트 폐쇄는 별도 작업으로 취급한다.

Google은 이전 URL의 리디렉션을 일반적으로 최소 1년 유지하라고 안내한다. 따라서 “기존 배포 중지”를 “옛 도메인을 즉시 끊기”로 해석하지 않는다. 현재 GitHub Pages만으로 원하는 서버 리디렉션을 제공할 수 있는지, 다른 호스트에서 기존 도메인을 받아야 하는지는 실제 이관 단계에서 검증할 항목이다. 이 조사에서는 기존 사이트를 중지하거나 DNS를 전환하지 않았다. [Google 사이트 이전 지침](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)

## 8. 완료 범위와 남은 외부 작업

[최종 로컬 검증 보고서](../release-manifests/portal-verification.json)는 `status: passed`, 오류 0개이며 **10,350 HTML 전체**를 검사했다. 보고서의 `preview: false`는 프로덕션 모드로 산출했다는 뜻이지 공개 호스트에 배포했다는 뜻이 아니다. 원본 스냅샷 해시는 `2ba4b81eb1e8e6c3515c157a33501c417735f9b7e9e09d757670c44cddedcd4f`다.

| 구분 | 현재 상태 |
|---|---|
| 전수 카탈로그와 native 언어별 경로 | 로컬 확인 완료: 2,846게임, 22언어, 8,896게임 경로 |
| 정적 빌드와 파일 검증 | 완료: 10,350 HTML, 10,403파일, 오류 0개 |
| 색인 정책과 사이트맵 산출 | 로컬 확인 완료: 색인 허용 562개, `/sitemap.xml` 및 하위 23개 |
| Cloudflare 프로젝트 생성·배포 | **미실행** |
| `games.guidehollow.com` DNS·공개 HTTPS/TLS | **미연결·미검증** |
| 새 호스트의 Google Search Console 등록·사이트맵 제출 | **미실행** |
| 통합 호스트의 IndexNow 실제 제출 | **미실행** |
| 공개 브라우저 화면·게임 실행 | 최종 파일 검증 보고서의 범위 밖이며 미검증 |

브라우저 origin context 연결 문제가 해소되고 필요한 계정 화면에 접근할 수 있어야 외부 작업을 이어갈 수 있다. 공개 배포 후에는 실제 HTTP 응답, DNS/TLS, 게임 실행과 검색 제출 응답을 별도로 기록한다. 현재 로컬 결과만으로 월 방문량·광고 수익·무료 플랜의 장기 지속 가능성·색인 또는 검색 순위를 산정하지 않는다.

**새 호스트의 실제 정상 운영 확인이 기존 4개 배포 중단보다 먼저다.**
