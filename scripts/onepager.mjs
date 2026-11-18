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

const pain = arg("pain", process.env.ONEPAGER_PAIN || "AI is too slow when it retrieves information from the database");
const requirements = arg(
  "requirements",
  process.env.ONEPAGER_REQUIREMENTS || "Must run only on an intranet with no cloud connection, and keep the GPU footprint to a minimum.",
);
const customer = arg("customer", process.env.ONEPAGER_CUSTOMER || "Internal knowledge search");
const language = arg("language", process.env.ONEPAGER_LANGUAGE || "en");
const out = arg("out", "");
const reviewer = arg("reviewer", "");

const created = await createOnePager({ pain, requirements, customerLabel: customer, language });
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
