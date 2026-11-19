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
      <h1>Open solution cases as schedule, roles, and risk.</h1>
      <p className="lede">
        Hypershield, AI Defense, the NVIDIA AI Factory, Webex specialized models, Silicon One, and XDR
        are stored as fields a project charter can use. Search is a local vector index.
        Amounts and durations are planning bands.
      </p>
      <p className="row">
        <Link className="badge teal" href="/onepager">One-pager</Link>
        <Link className="badge" href="/ask">Draft from a question</Link>
      </p>
      <section className="stats">
        <div className="stat"><b>{cases.length}</b><span>Published cases</span></div>
        <div className="stat"><b>{industries}</b><span>Industry filters</span></div>
        <div className="stat"><b>5</b><span>Cases kept per question</span></div>
        <div className="stat"><b>384</b><span>Local embedding dimensions</span></div>
      </section>
      <CaseBrowser cases={cases} />
    </>
  );
}
