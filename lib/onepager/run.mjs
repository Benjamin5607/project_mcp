import { loadCases, loadIndex } from "../store.mjs";
import { retrieve } from "../retrieve.mjs";
import { INDUSTRIES } from "../taxonomy.mjs";
import { parseConstraints } from "./constraints.mjs";
import { composeDocument } from "./compose.mjs";
import { rankCases } from "./select.mjs";
import { completeNarrative, selectSpecialist } from "./models.mjs";
import { allocateId, saveOnePager } from "./store.mjs";
import { resolveLanguage } from "../locale.mjs";
import { customerLabel, httpError, introducesUnknownCustomer, requireText } from "./text.mjs";

function normalizeIndustry(value) {
  if (!value) return "";
  if (typeof value !== "string" || !INDUSTRIES[value]) throw httpError("That industry code is not in the case bank.", 400);
  return value;
}

function clipField(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function narrativeText(raw) {
  return String(raw || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "");
}

/** The name is assembled at request time so a build without the variable cannot freeze an empty value. */
function runtimeNvidiaKey() {
  const name = Buffer.from("TlZJRElBX0FQSV9LRVk=", "base64").toString("utf8");
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function mergeNarrative(doc, raw) {
  const text = narrativeText(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { doc, applied: false, error: "The model reply was not structured, so the local draft was kept." };
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { doc, applied: false, error: "The model reply was not structured, so the local draft was kept." };
  }
  const source = `${doc.pain}\n${doc.requirements}`;
  const headline = clipField(parsed.headline, 160);
  const executiveSummary = clipField(parsed.executiveSummary, 1800);
  const rationale = clipField(parsed.recommendationRationale, 800);
  const notes = Array.isArray(parsed.constraintNotes) ? parsed.constraintNotes.map((item) => clipField(item, 240)).filter(Boolean).slice(0, 4) : [];
  const joined = [headline, executiveSummary, rationale, ...notes].join("\n");
  if (!headline || !executiveSummary || introducesUnknownCustomer(joined, source)) {
    return { doc, applied: false, error: "The model reply left the draft format, so the local draft was kept." };
  }
  const flat = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const nextSummary = flat(executiveSummary);
  const localSummary = flat(doc.executiveSummary);
  const solutionSummary = flat(doc.solution.summary);
  const copied = nextSummary === localSummary
    || nextSummary === solutionSummary
    || (solutionSummary.length > 80 && nextSummary.includes(solutionSummary))
    || (localSummary.length > 80 && localSummary.includes(nextSummary));
  if (copied) {
    return { doc, applied: false, copied: true, error: "The model repeated the local draft, so the local draft was kept." };
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
  if (!input || typeof input !== "object" || Array.isArray(input)) throw httpError("A JSON object is required.", 400);
  const language = resolveLanguage(input.language);
  const pain = requireText(input.pain, language === "ko" ? "페인포인트" : "pain point", 2000);
  const requirements = requireText(input.requirements, language === "ko" ? "특별 요구사항" : "special requirements", 2000);
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
  const picked = rankCases(cases, matches, profile, language);
  if (!picked.kept.length) throw httpError(language === "ko" ? "조건에 맞는 게시 사례가 없습니다." : "No published case fits these constraints.", 400);
  const apiKey = opts.apiKey === undefined ? runtimeNvidiaKey() : opts.apiKey || "";
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const specialist = await selectSpecialist({
    profile,
    apiKey,
    fetchImpl,
    allowNetwork: opts.allowNetwork !== false,
    language,
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
    language,
  });
  if (specialist.connection === "nvidia-api") {
    try {
      let raw = await completeNarrative({
        apiKey,
        model: specialist.authoringModelId,
        document: doc,
        fetchImpl,
      });
      let merged = mergeNarrative(doc, raw);
      if (merged.copied) {
        raw = await completeNarrative({
          apiKey,
          model: specialist.authoringModelId,
          document: doc,
          fetchImpl,
          rewrite: true,
        });
        merged = mergeNarrative(doc, raw);
      }
      doc.specialist.called = true;
      if (merged.applied) doc.specialist.narrativeSource = "nvidia";
      else doc.specialist.error = merged.error;
    } catch (error) {
      const status = Number(error.status) || 0;
      doc.specialist.called = true;
      doc.specialist.error = language === "ko"
        ? `NVIDIA API 호출에 실패했습니다${status ? ` (${status})` : ""}. 로컬 페르소나 초안을 유지했습니다.`
        : `The NVIDIA API call failed${status ? ` (${status})` : ""}, so the local persona draft was kept.`;
      doc.specialist.reason = language === "ko"
        ? `${doc.specialist.reason} 호출에 실패해 로컬 문장을 남겼습니다.`
        : `${doc.specialist.reason} The call failed, so the local wording was kept.`;
    }
  }
  return saveOnePager(doc, opts.dir);
}
