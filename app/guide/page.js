export const metadata = { title: "구축 가이드 · 케이스 뱅크" };

const STEPS = [
  {
    title: "1. 수집과 청킹",
    body: "공개 뉴스룸, 블로그, Cisco Live, 제품 페이지를 data/authoring에 사례로 옮긴다. lib/chunk.mjs가 비즈니스 케이스, 아키텍처, 범위, 요구사항, RACI, WBS, 리스크, KPI를 의미 단위로 자른다. 산업, 솔루션, 출처 등급은 청크 헤더에 같이 들어간다. 주간 수집은 GitHub Actions가 data/inbox 초안만 만든다.",
  },
  {
    title: "2. 임베딩",
    body: "기본 모델은 lib/embed.mjs의 feature-hash-v1, 384차원이다. 질의와 문서가 같은 함수를 쓰므로 망 밖으로 나가지 않는다. Ollama의 nomic-embed-text로 바꿀 때는 컬럼을 vector(768)로 바꾸고 인덱스를 다시 만든다. 두 모델을 한 인덱스에 섞지 않는다.",
  },
  {
    title: "3. Supabase 적재와 HNSW",
    body: "supabase/migrations/001_pm_case_bank.sql이 pgvector, 코사인 HNSW, match_case_chunks를 만든다. npm run seed가 supabase/seed.sql에 사례와 벡터를 쓴다. 공개·게시 행만 anon이 읽는다. 앱은 data/index.json 또는 메모리 인덱스로 같은 검색을 한다.",
  },
  {
    title: "4. PM 파이프라인",
    body: "질의 화면이 /api/ask로 사례별 최고 청크 중 상위 5개를 받고, 1위 사례의 RACI·WBS·리스크·이메일 초안을 합성한다. workers/src/index.js는 같은 계약을 가진 게이트웨이다. 고영향 보안 조치와 금액은 항상 사람 검토 문장과 함께 나온다.",
  },
];

export default function GuidePage() {
  return (
    <article className="guide">
      <p className="kicker">Architecture</p>
      <h1>네 단계로 돌아가는 케이스 뱅크</h1>
      <p className="lede">
        프론트는 이 Next.js 앱, API는 Node 라우트와 Workers 핸들러, 벡터 저장은 Supabase pgvector,
        기본 추론은 로컬 임베딩입니다. Ollama와 Hugging Face는 인덱스를 다시 만들 때의 교체 옵션입니다.
      </p>
      <ol>
        {STEPS.map((step) => (
          <li key={step.title}>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <section className="section">
        <h2>PM 테이블</h2>
        <p>
          solution_cases 아래에 이해관계자, 요구사항, RACI, WBS, 마일스톤, 리스크, 이슈, KPI, 원가,
          품질 게이트, 의사소통, 조달, 의사결정, 교훈, 편익, 청크, 출처, 수집 이력이 있습니다.
          지식 영역은 PMI 10개에 보안과 AI 거버넌스를 더했습니다.
        </p>
      </section>
      <section className="section">
        <h2>실행</h2>
        <p>npm test 로 검증하고, npm run dev 로 라이브러리를 엽니다. npm run ask -- "질문" 은 터미널 초안입니다.</p>
      </section>
    </article>
  );
}
