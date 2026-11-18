import Link from "next/link";
import { CaseBrowser } from "../components/CaseBrowser";
import { loadCases } from "../lib/store.mjs";
import { summarize } from "../lib/present.mjs";

export default function HomePage() {
  const cases = loadCases().map(summarize);
  const industries = new Set(cases.map((item) => item.industry)).size;
  return (
    <>
      <p className="kicker">Cisco public architecture · PM portfolio</p>
      <h1>솔루션 사례를 일정, 역할, 리스크로 엽니다.</h1>
      <p className="lede">
        Hypershield, AI Defense, NVIDIA AI 팩토리, Webex 특화 모델, Silicon One, XDR을
        프로젝트 차터에 바로 붙일 수 있는 필드로 정리했습니다. 검색은 로컬 벡터 인덱스이고,
        금액과 기간은 계획 밴드입니다.
      </p>
      <p className="row">
        <Link className="badge teal" href="/onepager">프로젝트 원페이저</Link>
        <Link className="badge" href="/ask">질의로 초안</Link>
      </p>
      <section className="stats">
        <div className="stat"><b>{cases.length}</b><span>공개 사례</span></div>
        <div className="stat"><b>{industries}</b><span>산업 필터</span></div>
        <div className="stat"><b>5</b><span>질의 때 고르는 사례</span></div>
        <div className="stat"><b>384</b><span>로컬 임베딩 차원</span></div>
      </section>
      <CaseBrowser cases={cases} />
    </>
  );
}
