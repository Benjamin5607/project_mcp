import { CompareStudio } from "../../components/CompareStudio";
import { comparison } from "../../lib/present.mjs";
import { loadCases } from "../../lib/store.mjs";

export const metadata = { title: "Compare · Case bank" };

export default function ComparePage() {
  const cases = loadCases().map(comparison);
  return (
    <>
      <p className="kicker">Portfolio</p>
      <h1>Up to three cases, side by side</h1>
      <p className="lede">Compare duration bands, success criteria, and the highest-scoring risks. Badges separate planning scenarios from public sources.</p>
      <CompareStudio cases={cases} />
    </>
  );
}
