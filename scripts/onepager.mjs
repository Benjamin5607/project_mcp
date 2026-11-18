import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createOnePager } from "../lib/onepager/run.mjs";
import { applyReview } from "../lib/onepager/review.mjs";
import { renderExport } from "../lib/onepager/export-html.mjs";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

const pain = arg("pain", process.env.ONEPAGER_PAIN || "AI가 데이터베이스에서 정보를 찾아오는데 너무 느림");
const requirements = arg(
  "requirements",
  process.env.ONEPAGER_REQUIREMENTS || "클라우드와 연결되지 않은 인트라넷에서만 작동 요망 그리고 그래픽카드 최소화",
);
const customer = arg("customer", process.env.ONEPAGER_CUSTOMER || "내부 지식검색");
const out = arg("out", "");
const reviewer = arg("reviewer", "");

const created = await createOnePager({ pain, requirements, customerLabel: customer });
const doc = reviewer ? applyReview(created.id, { action: "approve", reviewer }) : created;
const summary = {
  id: doc.id,
  status: doc.status,
  theme: doc.solution.theme,
  solution: doc.solution.name,
  model: doc.specialist.authoringModelId,
  connection: doc.specialist.connection,
  called: doc.specialist.called,
  references: doc.references.map((item) => item.caseCode),
  rejected: doc.rejected.map((item) => item.caseCode),
};
console.log(JSON.stringify(summary, null, 2));

if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "onepager.json"), JSON.stringify(doc, null, 2));
  if (doc.status === "approved") {
    writeFileSync(path.join(out, "report.html"), renderExport(doc, "report"));
    writeFileSync(path.join(out, "slides.html"), renderExport(doc, "slides"));
  }
  console.log(`wrote ${out}`);
}
