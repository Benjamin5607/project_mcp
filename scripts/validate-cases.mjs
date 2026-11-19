import { cases } from "../data/authoring/index.mjs";
import { KNOWLEDGE_CODES, PHASE_CODES } from "../lib/taxonomy.mjs";

const RECORD_TYPES = new Set(["public_announcement", "validated_design", "reference_scenario", "video_demo", "partner_guide"]);
const FIDELITY = new Set(["primary_source", "public_composite"]);
const COMPLEXITY = new Set(["low", "medium", "high", "very_high"]);
const RESPONSES = new Set(["avoid", "mitigate", "transfer", "accept", "exploit"]);
const COST_TYPES = new Set(["capex", "opex"]);
const INFLUENCE = new Set(["low", "medium", "high"]);

const errors = [];
const fail = (code, message) => errors.push(`${code}: ${message}`);

function https(url) {
  return typeof url === "string" && url.startsWith("https://");
}

function min(code, list, count, label) {
  if (!Array.isArray(list) || list.length < count) fail(code, `${label}는 ${count}개 이상이어야 합니다.`);
}

for (const item of cases) {
  const code = item.caseCode || "(no code)";
  if (!/^(CSCO|IND)-[A-Z0-9-]+$/.test(item.caseCode || "")) fail(code, "caseCode 형식");
  if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) fail(code, "slug");
  for (const field of ["title", "titleEn", "fidelityNote", "executiveSummary", "problemStatement", "opportunity", "strategicAlignment", "businessValue", "architecturePattern", "planningBandNote", "publishedOn"]) {
    if (!item[field] || String(item[field]).trim().length < 8) fail(code, `${field}가 비었습니다.`);
  }
  if (!RECORD_TYPES.has(item.recordType)) fail(code, "recordType");
  if (!FIDELITY.has(item.fidelity)) fail(code, "fidelity");
  if (item.status !== "published") fail(code, "공개 사례 status는 published");
  if (item.confidentiality !== "public") fail(code, "이 시드 뱅크의 confidentiality는 public");
  if (!COMPLEXITY.has(item.complexity)) fail(code, "complexity");
  if (!["published", "expected_planning"].includes(item.outcomeType)) fail(code, "outcomeType");
  if (!(item.dealSizeLowUsd <= item.dealSizeHighUsd)) fail(code, "deal size band");
  if (!(item.leadTimeWeeksLow <= item.leadTimeWeeksHigh)) fail(code, "lead time");
  if (!(item.durationWeeksLow <= item.durationWeeksHigh)) fail(code, "duration");
  min(code, item.ciscoSolutions, 1, "ciscoSolutions");
  min(code, item.aliases, 3, "aliases");
  min(code, item.regulatoryContext, 1, "regulatoryContext");
  min(code, item.scopeIn, 3, "scopeIn");
  min(code, item.scopeOut, 2, "scopeOut");
  min(code, item.assumptions, 2, "assumptions");
  min(code, item.constraints, 2, "constraints");
  min(code, item.successCriteria, 3, "successCriteria");
  min(code, item.outcomes, 2, "outcomes");
  min(code, item.sourceUrls, 1, "sourceUrls");
  min(code, item.stakeholders, 5, "stakeholders");
  min(code, item.requirements, 3, "requirements");
  min(code, item.raci, 6, "raci");
  min(code, item.wbs, 8, "wbs");
  min(code, item.milestones, 3, "milestones");
  min(code, item.risks, 4, "risks");
  min(code, item.issues, 1, "issues");
  min(code, item.kpis, 3, "kpis");
  min(code, item.costs, 3, "costs");
  min(code, item.qualityGates, 3, "qualityGates");
  min(code, item.communications, 3, "communications");
  min(code, item.procurement, 2, "procurement");
  min(code, item.decisions, 2, "decisions");
  min(code, item.lessons, 2, "lessons");
  min(code, item.benefits, 2, "benefits");
  min(code, item.narrative, 2, "narrative");

  for (const source of item.sourceUrls || []) {
    if (!https(source.url)) fail(code, `출처 URL이 https가 아닙니다: ${source.url}`);
  }
  if (item.videoUrl && !https(item.videoUrl)) fail(code, "videoUrl");

  const wbsCodes = new Set((item.wbs || []).map((row) => row.wbsCode));
  for (const row of item.wbs || []) {
    if (!PHASE_CODES.includes(row.phase)) fail(code, `WBS phase ${row.phase}`);
    if (!KNOWLEDGE_CODES.includes(row.knowledgeArea)) fail(code, `WBS area ${row.knowledgeArea}`);
    if (!(row.durationDaysLow <= row.durationDaysHigh)) fail(code, `WBS 기간 ${row.wbsCode}`);
    for (const pred of row.predecessors || []) {
      if (!wbsCodes.has(pred)) fail(code, `WBS ${row.wbsCode}의 선행 ${pred}가 없습니다.`);
    }
  }
  for (const row of item.raci || []) {
    if (!PHASE_CODES.includes(row.phase)) fail(code, `RACI phase ${row.phase}`);
    if (!KNOWLEDGE_CODES.includes(row.knowledgeArea)) fail(code, `RACI area ${row.knowledgeArea}`);
    if (!row.accountable || !row.responsible?.length) fail(code, `RACI ${row.activity}의 R/A`);
  }
  for (const row of item.risks || []) {
    if (row.probability < 1 || row.probability > 5 || row.impact < 1 || row.impact > 5) fail(code, `리스크 점수 ${row.riskCode}`);
    if (!RESPONSES.has(row.response)) fail(code, `리스크 대응 ${row.riskCode}`);
  }
  for (const row of item.stakeholders || []) {
    if (!INFLUENCE.has(row.influence)) fail(code, `영향도 ${row.roleName}`);
  }
  for (const row of item.costs || []) {
    if (!COST_TYPES.has(row.costType)) fail(code, `원가 유형 ${row.name}`);
  }
  for (const row of item.requirements || []) {
    if (!KNOWLEDGE_CODES.includes(row.knowledgeArea)) fail(code, `요구사항 영역 ${row.reqCode}`);
  }
}

const hangul = /[가-힣]/;
function walk(value, path, code) {
  if (typeof value === "string") {
    if (hangul.test(value)) fail(code, `Korean text in ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, code));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, code);
  }
}
for (const item of cases) walk(item, item.caseCode, item.caseCode);

const codes = cases.map((item) => item.caseCode);
if (new Set(codes).size !== codes.length) fail("ALL", "caseCode 중복");
const slugs = cases.map((item) => item.slug);
if (new Set(slugs).size !== slugs.length) fail("ALL", "slug 중복");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`validated ${cases.length} published cases`);
