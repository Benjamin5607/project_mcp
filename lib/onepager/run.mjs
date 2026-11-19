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

function flat(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function listOf(value, max) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clipField(item, 80)).filter(Boolean).slice(0, max);
}

function inventedPercent(text, source) {
  const found = String(text || "").match(/\d+(?:\.\d+)?\s*%/g) || [];
  const hay = source.replace(/\s+/g, "");
  return found.some((item) => !hay.includes(item.replace(/\s+/g, "")));
}

function takeStakeholders(value, source) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 8)) {
    const roleName = clipField(item?.roleName, 80);
    const interest = clipField(item?.interest, 400);
    if (!roleName || !interest) continue;
    if (introducesUnknownCustomer(`${roleName}\n${interest}`, source)) continue;
    rows.push({
      roleName,
      organization: clipField(item?.organization, 80) || "Customer",
      interest,
      influence: /^(high|medium|low)$/i.test(String(item?.influence || "")) ? String(item.influence).toLowerCase() : "medium",
      engagement: clipField(item?.engagement, 400) || "Review",
      cadence: clipField(item?.cadence, 80) || "Weekly",
    });
  }
  return rows.length >= 3 ? rows : null;
}

function takeRaci(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 12)) {
    const activity = clipField(item?.activity, 200);
    const accountable = clipField(item?.accountable, 80);
    if (!activity || !accountable || /[,;]/.test(accountable)) continue;
    rows.push({
      activity,
      phase: clipField(item?.phase, 40) || "Plan",
      accountable,
      responsible: listOf(item?.responsible, 6),
      consulted: listOf(item?.consulted, 6),
      informed: listOf(item?.informed, 6),
    });
  }
  return rows.length >= 3 ? rows : null;
}

function takeResources(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 12)) {
    const name = clipField(item?.name, 80);
    if (!name) continue;
    rows.push({
      kind: clipField(item?.kind, 40) || "role",
      name,
      amount: clipField(item?.amount, 120) || "Planning band",
      notes: clipField(item?.notes, 400),
    });
  }
  return rows.length >= 2 ? rows : null;
}

function takeNamed(value, fields) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 8)) {
    const row = {};
    let ok = true;
    for (const field of fields) {
      row[field] = clipField(item?.[field], 400);
      if (!row[field] && field !== "rationale") ok = false;
    }
    if (ok) rows.push(row);
  }
  return rows.length >= 2 ? rows : null;
}

export function mergeNarrative(doc, raw, opts = {}) {
  const text = narrativeText(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { doc, applied: false, wrote: [], error: "The model reply was not structured, so the local draft was kept." };
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { doc, applied: false, wrote: [], error: "The model reply was not structured, so the local draft was kept." };
  }
  const source = `${doc.pain}\n${doc.requirements}\n${doc.references.map((item) => `${item.title}\n${item.excerpt}`).join("\n")}`;
  const headline = clipField(parsed.headline, 160);
  const executiveSummary = clipField(parsed.executiveSummary, 1800);
  const rationale = clipField(parsed.recommendationRationale, 800);
  const notes = Array.isArray(parsed.constraintNotes) ? parsed.constraintNotes.map((item) => clipField(item, 240)).filter(Boolean).slice(0, 4) : [];
  const joined = [headline, executiveSummary, rationale, ...notes].join("\n");
  if (!headline || !executiveSummary || introducesUnknownCustomer(joined, source) || inventedPercent(joined, source)) {
    return { doc, applied: false, wrote: [], error: "The model reply left the draft format, so the local draft was kept." };
  }
  const nextSummary = flat(executiveSummary);
  const localSummary = flat(doc.executiveSummary);
  const priorSolution = flat(doc.solution.summary);
  const copied = nextSummary === localSummary
    || nextSummary === priorSolution
    || (priorSolution.length > 80 && nextSummary.includes(priorSolution))
    || (localSummary.length > 80 && localSummary.includes(nextSummary));
  if (copied && !opts.fillGaps) {
    return { doc, applied: false, copied: true, wrote: [], error: "The model repeated the local draft, so the local draft was kept." };
  }
  const wrote = ["headline", "summary"];
  doc.headline = headline;
  doc.executiveSummary = executiveSummary;
  if (rationale) {
    doc.solution.rationale = rationale;
    wrote.push("rationale");
  }
  const solutionName = clipField(parsed.solutionName, 160);
  const solutionSummary = clipField(parsed.solutionSummary, 1200);
  if (solutionName && !introducesUnknownCustomer(solutionName, source)) {
    doc.solution.name = solutionName;
    wrote.push("solution");
  }
  if (solutionSummary && flat(solutionSummary) !== priorSolution && !introducesUnknownCustomer(solutionSummary, source) && !inventedPercent(solutionSummary, source)) {
    doc.solution.summary = solutionSummary;
    wrote.push("solution summary");
  }
  if (Array.isArray(parsed.components)) {
    const components = parsed.components.slice(0, 6).map((item) => ({
      name: clipField(item?.name, 80),
      detail: clipField(item?.detail, 400),
    })).filter((item) => item.name && item.detail);
    if (components.length >= 2 && !introducesUnknownCustomer(JSON.stringify(components), source)) {
      doc.solution.components = components;
      wrote.push("components");
    }
  }
  for (const note of notes) {
    if (!doc.solution.fit.includes(note)) doc.solution.fit.push(note);
  }
  doc.solution.fit = doc.solution.fit.slice(0, 6);
  const stakeholders = takeStakeholders(parsed.stakeholders, source);
  if (stakeholders) {
    doc.stakeholders = stakeholders;
    wrote.push("stakeholders");
  }
  const sourceActivities = new Set(doc.raci.map((item) => flat(item.activity)));
  const raci = takeRaci(parsed.raci);
  if (raci && raci.some((item) => !sourceActivities.has(flat(item.activity)))) {
    doc.raci = raci;
    wrote.push("RACI");
  }
  const resources = takeResources(parsed.resources);
  if (resources && !introducesUnknownCustomer(JSON.stringify(resources), source)) {
    doc.resources = resources;
    wrote.push("resources");
  }
  const risks = takeNamed(parsed.risks, ["title", "mitigation", "owner"]);
  if (risks) {
    doc.risks = risks.map((item, index) => ({ code: `R${index + 1}`, score: null, response: "mitigate", ...item }));
    wrote.push("risks");
  }
  const decisions = takeNamed(parsed.decisions, ["title", "choice", "owner"]);
  if (decisions) {
    doc.decisions = decisions.map((item, index) => ({ code: `D${index + 1}`, ...item }));
    wrote.push("decisions");
  }
  const goals = takeNamed(parsed.goals, ["statement", "owner"]);
  if (goals) {
    doc.goals = goals.map((item, index) => ({ code: `G${index + 1}`, ...item }));
    wrote.push("goals");
  }
  return { doc, applied: true, wrote, error: null };
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
      if (merged.applied && !(merged.wrote || []).includes("RACI")) {
        const again = await completeNarrative({
          apiKey,
          model: specialist.authoringModelId,
          document: doc,
          fetchImpl,
          rewrite: true,
        });
        const filled = mergeNarrative(doc, again, { fillGaps: true });
        if (filled.wrote?.includes("RACI")) {
          merged = { ...merged, wrote: [...new Set([...(merged.wrote || []), ...filled.wrote])] };
        }
      }
      doc.specialist.called = true;
      if (merged.applied) {
        doc.specialist.narrativeSource = "nvidia";
        doc.specialist.wrote = merged.wrote;
        const list = merged.wrote.join(", ");
        doc.specialist.reason = language === "ko"
          ? `${doc.specialist.reason} 검색된 사례를 읽고 모델이 작성한 항목: ${list}.`
          : `${doc.specialist.reason} The model read the retrieved cases and wrote: ${list}.`;
      } else doc.specialist.error = merged.error;
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
