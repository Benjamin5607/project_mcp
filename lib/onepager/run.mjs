import { loadCases, loadIndex } from "../store.mjs";
import { retrieve } from "../retrieve.mjs";
import { INDUSTRIES } from "../taxonomy.mjs";
import { parseConstraints } from "./constraints.mjs";
import { composeDocument } from "./compose.mjs";
import { rankCases } from "./select.mjs";
import { completeNarrative, selectSpecialist } from "./models.mjs";
import { allocateId, saveOnePager } from "./store.mjs";
import { customerLabel, httpError, introducesUnknownCustomer, requireText } from "./text.mjs";

function normalizeIndustry(value) {
  if (!value) return "";
  if (typeof value !== "string" || !INDUSTRIES[value]) throw httpError("산업 코드가 케이스 뱅크에 없습니다.", 400);
  return value;
}

function clipField(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export function mergeNarrative(doc, raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { doc, applied: false, error: "응답을 구조로 읽지 못해 로컬 문장을 유지했습니다." };
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { doc, applied: false, error: "응답을 구조로 읽지 못해 로컬 문장을 유지했습니다." };
  }
  const source = `${doc.pain}\n${doc.requirements}`;
  const headline = clipField(parsed.headline, 160);
  const executiveSummary = clipField(parsed.executiveSummary, 1800);
  const rationale = clipField(parsed.recommendationRationale, 800);
  const notes = Array.isArray(parsed.constraintNotes) ? parsed.constraintNotes.map((item) => clipField(item, 240)).filter(Boolean).slice(0, 4) : [];
  const joined = [headline, executiveSummary, rationale, ...notes].join("\n");
  if (!headline || !executiveSummary || introducesUnknownCustomer(joined, source)) {
    return { doc, applied: false, error: "응답이 초안 형식을 벗어나 로컬 문장을 유지했습니다." };
  }
  doc.headline = headline;
  doc.executiveSummary = executiveSummary;
  doc.solution.rationale = rationale || doc.solution.rationale;
  for (const note of notes) {
    if (!doc.solution.fit.includes(note)) doc.solution.fit.push(note);
  }
  doc.solution.fit = doc.solution.fit.slice(0, 6);
  return { doc, applied: true, error: null };
}

export async function createOnePager(input, opts = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw httpError("JSON 객체가 필요합니다.", 400);
  const pain = requireText(input.pain, "페인포인트", 2000);
  const requirements = requireText(input.requirements, "특별 요구사항", 2000);
  const label = customerLabel(input.customerLabel);
  const industry = normalizeIndustry(input.industry);
  const profile = parseConstraints(`${pain}\n${requirements}`);
  const cases = (opts.cases || loadCases()).filter((item) => item.status === "published");
  const index = opts.index || loadIndex();
  const matches = retrieve(index.chunks, `${pain}\n${requirements}`, {
    limit: 6,
    diverse: true,
    industry: industry || null,
  });
  const picked = rankCases(cases, matches, profile);
  if (!picked.kept.length) throw httpError("조건에 맞는 게시 사례가 없습니다.", 400);
  const apiKey = opts.apiKey === undefined ? process.env.NVIDIA_API_KEY || "" : opts.apiKey || "";
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const specialist = await selectSpecialist({
    profile,
    apiKey,
    fetchImpl,
    allowNetwork: opts.allowNetwork !== false,
  });
  const at = (opts.now || (() => new Date()))();
  const doc = composeDocument({
    id: allocateId(at),
    now: at.toISOString(),
    customerLabel: label,
    pain,
    requirements,
    industry,
    profile,
    picked,
    specialist,
  });
  if (specialist.connection === "nvidia-api") {
    try {
      const raw = await completeNarrative({
        apiKey,
        model: specialist.authoringModelId,
        document: doc,
        fetchImpl,
      });
      const merged = mergeNarrative(doc, raw);
      doc.specialist.called = true;
      if (merged.applied) doc.specialist.narrativeSource = "nvidia";
      else doc.specialist.error = merged.error;
    } catch {
      doc.specialist.called = false;
      doc.specialist.connection = "local-persona";
      doc.specialist.error = "NVIDIA API 호출에 실패해 로컬 페르소나 초안을 유지했습니다.";
      doc.specialist.reason = `${doc.specialist.reason} 호출에 실패해 로컬 문장을 남겼습니다.`;
    }
  }
  return saveOnePager(doc, opts.dir);
}
