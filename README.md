# AI & Tech 솔루션 케이스 뱅크

시스코가 공개한 AI·보안 아키텍처를 프로젝트 관리 프레임워크로 검색하고, RACI·WBS·위험 계획 초안을 만드는 RAG 케이스 뱅크입니다.

금액, 기간, KPI 목표 중 계획 밴드라고 적힌 값은 고시 가격이나 특정 고객의 실적이 아닙니다. `public_composite` 사례는 공개 자료를 산업 제약에 올려 짠 계획 시나리오입니다.

## 바로 실행

```bash
npm install
npm test
npm run dev
```

브라우저에서 라이브러리, `/ask`, `/onepager`, `/compare`, `/guide`를 엽니다. GitHub Pages 배포는 `npm run build:pages` 결과이며, 공개 주소는 https://benjamin5607.github.io/project_mcp/ 입니다. 그 페이지의 질의와 원페이저는 브라우저 안에서 동작하고, 원페이저 초안은 그 브라우저에만 저장됩니다.

```bash
npm run ask -- "금융권 고객의 AI 애플리케이션 보안 가시성 확보를 위한 Hypershield 도입 사례와 RACI 매트릭스 초안을 작성해 줘"
```

## 아키텍처

| 레이어 | 이 저장소 | 역할 |
| --- | --- | --- |
| 프론트 | Next.js (`app/`) | 사례 검색, 비교, 초안 |
| API | `app/api/ask`, `workers/src/index.js` | 상위 5개 청크와 산출물. 호출자가 URL을 지정하지 않음 |
| 벡터 저장 | Supabase pgvector, 로컬 `data/index.json` | 관계형 PM 데이터와 임베딩 |
| 임베딩 | `lib/embed.mjs` (`feature-hash-v1`, 384차원) | 기본은 망 밖으로 나가지 않음. Ollama·Hugging Face는 인덱스 재생성 옵션 |

## 네 단계

### 1. 수집과 청킹

공개 사례의 원본은 `data/authoring/`입니다. `npm run materialize`가 `data/cases/*.json`을 갱신합니다. `lib/chunk.mjs`는 비즈니스 케이스, 아키텍처, 범위, 요구사항, RACI, WBS, 리스크, KPI를 청크로 나눕니다. 산업과 솔루션은 청크 헤더에 붙습니다.

GitHub Actions(`.github/workflows/collect-cases.yml`)는 매주 월요일 08:00(Asia/Kuala_Lumpur)에 Cisco 공개 피드를 읽어 `data/inbox` 초안만 만듭니다. 초안은 `status: inbox`라 검색에 들어가지 않습니다. PM이 필드를 채운 뒤 `reviewed`로 올립니다. 피드에 없는 금액과 고객 실적은 봇이 채우지 않습니다.

### 2. 임베딩

`lib/embed.mjs`가 질의와 문서를 같은 384차원 벡터로 바꿉니다. 민감한 구성도를 이 공개 뱅크에 넣지 않으며, 기본 경로에는 외부 임베딩 API 호출이 없습니다.

Ollama `nomic-embed-text`(768차원)나 Hugging Face 임베딩으로 바꿀 때는 문서와 질의를 같은 모델로 다시 만들고, `case_chunks.embedding`을 `vector(768)`로 바꾼 다음 HNSW를 다시 겁니다. 차원이 다른 벡터를 한 컬럼에 섞지 않습니다.

### 3. Supabase 적재와 HNSW

```bash
npm run seed
psql "$DATABASE_URL" -f supabase/migrations/001_pm_case_bank.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

`DATABASE_URL`은 환경 변수로만 넘깁니다. 마이그레이션은 코사인 `hnsw` 인덱스와 `match_case_chunks(query_embedding, match_count, filter_industry, filter_solution)`를 만듭니다. 익명 읽기는 `published`이면서 `confidentiality = public`인 행만 허용합니다.

로컬 앱은 Supabase 없이도 같은 코사인 검색을 메모리에서 합니다. `SUPABASE_URL`을 앱에 넣지 않아도 됩니다.

### 4. PM 파이프라인

`/ask`가 질의를 보내면 상위 5개 청크를 고르고, 점수가 가장 높은 사례의 구조화 필드로 초안을 만듭니다.

- RACI, WBS, 위험 관리 계획, 제안 이메일, 경영진 브리프
- 질문 문장에 RACI, WBS, 위험, 이메일이 있으면 산출물을 고릅니다
- 초안 끝에 출처 등급과 계획 밴드 고지가 붙습니다

## 프로젝트 원페이저

라이브러리, 질의, 비교, 구축 가이드, API 오류, 사례 본문, 그리고 데이터베이스 `app_settings.default_language`와 `solution_cases.language`는 영어입니다. 원페이저의 한국어는 그 화면에서 언어를 고를 때만 나옵니다.

`/onepager`는 고객 페인포인트와 특별 요구를 받아 케이스 뱅크에서 참고 사례를 고르고, 솔루션·이해관계자·RACI·자원·리스크가 채워진 초안을 만듭니다. 기본 언어는 영어이고, 한국어는 그 화면의 언어 설정에서만 고릅니다. PM이 고치고 승인한 뒤에만 보고서 HTML과 슬라이드 HTML을 내려받습니다. 슬라이드에는 이해관계자 표, RACI 표, 자원 표가 그대로 들어갑니다.

모델 선정은 NVIDIA 통합 API 카탈로그의 내장 프로파일을 점수로 정렬합니다. 원페이저 화면은 `/api/onepager`로 초안을 요청하고, 서버가 런타임 비밀 `NVIDIA_API_KEY`로 모델을 호출해 요약을 다시 씁니다. 값을 채팅이나 저장소에 넣지 않습니다. 인트라넷, 폐쇄망, 클라우드 금지가 적혀 있으면 그 호출은 하지 않습니다. GitHub Actions에서는 저장소 시크릿 `NVIDIA_API_KEY`를 워크플로 `One-pager specialist`가 읽습니다. `use_nvidia`가 꺼져 있으면 `ONEPAGER_ALLOW_NVIDIA=false`라 시크릿이 있어도 호출하지 않습니다. Vercel에서는 이 이름이 프로젝트 런타임에 연결되어 있어야 하며, 팀 공유 변수만 만들어 두고 프로젝트를 연결하지 않으면 서버는 키가 없다고 봅니다. 변수를 연결한 뒤에는 다시 배포해야 반영됩니다.

특별 요구에 인트라넷, 폐쇄망, 클라우드와 연결되지 않음이 있으면 페인포인트 원문을 API로 보내지 않습니다. 그때는 선정된 컴팩트 모델의 페르소나만 로컬 초안에 연결됩니다. 그래픽카드 최소화가 있으면 대형 모델보다 컴팩트 프로파일을 위에 두고, 검색 경로의 그래픽카드는 0장으로 적습니다.

검토 문서는 `data/onepagers`에만 저장되며 공개 케이스 시드에 들어가지 않습니다. 디렉터리는 git에서 제외합니다. Vercel처럼 프로젝트 디렉터리가 읽기 전용이면 같은 파일은 `/tmp/case-bank-onepagers`에 저장됩니다.

```bash
npm run onepager -- --pain "AI가 데이터베이스에서 정보를 찾아오는데 너무 느림" --requirements "클라우드와 연결되지 않은 인트라넷에서만 작동 요망 그리고 그래픽카드 최소화"
```

## 데이터 모델

PMI 프로세스(착수·계획·실행·감시·종료)와 지식 영역 10개에 보안, AI 거버넌스를 더했습니다.

| 테이블 | 내용 |
| --- | --- |
| `solution_cases` | 사례 마스터. 산업, 배치, 리드타임, 수행 기간, 지출 밴드, 포함·제외, 성공 기준, 출처 등급 |
| `stakeholders` | 역할, 조직, 영향, 관심, 참여, 리듬 |
| `requirements` | 요구, 지식 영역, 우선순위, 수용 기준, 출처 |
| `raci_items` | 활동별 R/A/C/I. Accountable은 한 역할 |
| `wbs_items` | 코드, 선행, 기간 밴드, 산출물, 수용 |
| `milestones` | 착수 후 주 차 밴드와 기준 |
| `risks` | 확률, 영향, 생성 열 `score`, 대응, 완화, 유발, 비상 |
| `issues` | 열린 이슈와 다음 행동 |
| `kpis` | 기준, 목표, 측정 방법이 계획 목표인지 공개 설계 목표인지 |
| `cost_lines` | CapEx/OpEx 밴드 |
| `quality_gates` | 단계 게이트 |
| `communications` | 대상, 메시지, 채널, 리듬 |
| `procurement_items` | 품목, 계약 방식, 리드타임 |
| `decisions` | 결정과 이유 |
| `lessons`, `benefits` | 교훈, 편익 |
| `case_chunks` | RAG 본문과 `vector(384)` |
| `source_documents` | 공개 URL |
| `collection_runs` | 수집 봇 이력 |

시드 사례:

| 코드 | 내용 |
| --- | --- |
| `CSCO-AID-ENT-001` | 2025-01-15 AI Defense 발표 |
| `CSCO-HYP-FIN-001` | 금융권 Hypershield + AI Defense 계획 시나리오 |
| `CSCO-AIF-NVD-001` | Secure AI Factory with NVIDIA |
| `CSCO-WX-AIM-001` | Webex 특화 모델과 보안 제품 LLM 거버넌스 |
| `CSCO-SIO-DC-001` | Silicon One AI 패브릭. 수 주 창은 하드웨어 도착 후 파일럿만 |
| `CSCO-XDR-SOC-001` | XDR AI 보안 운영. [CiscoKorea 데모](https://www.youtube.com/watch?v=pYz-1Qr1AsY) |
| `IND-SIE-COP-001` | Siemens Industrial Copilot. 2023-10-31 발표의 주 단위 단축은 회사 주장 |
| `IND-DEERE-SPRAY-001` | John Deere See & Spray. 2024-09-18 발표의 59%와 800만 갤런은 Deere의 시즌 수치 |
| `IND-MOD-MRNA-001` | Moderna와 AWS. 42일과 25일 문장은 출처가 달라 합치지 않음 |
| `IND-DBS-AI-001` | DBS. 2024-09-16의 800개 모델과 이후 페이지의 1,500개를 날짜와 함께 보관 |

## 데모 영상

CiscoKorea, `[Digital Resilience] AI가 도와주는 보안 운영 Cisco XDR`.

https://www.youtube.com/watch?v=pYz-1Qr1AsY

XDR 사례의 워크숍 과업은 이 영상과 공개 백서·블로그를 대조합니다. 영상 클릭 순서를 작업기술서로 옮기지 않습니다.
