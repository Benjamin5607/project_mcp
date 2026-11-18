import { CompareStudio } from "../../components/CompareStudio";
import { comparison } from "../../lib/present.mjs";
import { loadCases } from "../../lib/store.mjs";

export const metadata = { title: "비교 · 케이스 뱅크" };

export default function ComparePage() {
  const cases = loadCases().map(comparison);
  return (
    <>
      <p className="kicker">Portfolio</p>
      <h1>같은 질문으로 세 사례까지 나란히</h1>
      <p className="lede">기간 밴드, 성공 기준, 점수 높은 리스크를 비교합니다. 계획 시나리오와 공개 출처를 뱃지로 구분합니다.</p>
      <CompareStudio cases={cases} />
    </>
  );
}
