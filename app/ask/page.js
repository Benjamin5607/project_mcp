import { AskStudio } from "../../components/AskStudio";
import { loadCases } from "../../lib/store.mjs";

export const metadata = { title: "질의 · 케이스 뱅크" };

export default async function AskPage({ searchParams }) {
  const params = await searchParams;
  const industries = [...new Map(loadCases().map((item) => [item.industry, item.industryLabel])).entries()];
  const query = typeof params.q === "string" ? params.q : "";
  return (
    <>
      <p className="kicker">RAG</p>
      <h1>사례를 붙인 초안</h1>
      <p className="lede">
        질문을 로컬 384차원 임베딩으로 바꾼 뒤 코사인 유사도와 용어 겹침으로 사례마다 가장 가까운 청크를 고르고, 그 중 상위 5개 사례를 가져옵니다.
        초안은 그 사례의 RACI, WBS, 리스크를 그대로 인용하고, 계획 밴드를 고객 실적으로 바꾸지 않습니다.
      </p>
      <AskStudio defaultQuery={query} industries={industries} />
    </>
  );
}
