import { AskStudio } from "../../components/AskStudio";
import { loadCases } from "../../lib/store.mjs";

export const metadata = { title: "Ask · Case bank" };

export default function AskPage() {
  const industries = [...new Map(loadCases().map((item) => [item.industry, item.industryLabel])).entries()];
  return (
    <>
      <p className="kicker">RAG</p>
      <h1>A draft grounded in cases</h1>
      <p className="lede">
        The question is embedded with the local 384-dimension model. Cosine similarity and term overlap pick the closest chunk of each case, then the top five cases.
        The draft quotes that case's RACI, WBS, and risks. A planning band is not rewritten as a customer result.
      </p>
      <AskStudio industries={industries} />
    </>
  );
}
