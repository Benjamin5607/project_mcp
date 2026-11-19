import { loadCases, loadIndex } from "../store.mjs";
import { retrieve } from "../retrieve.mjs";
import { INDUSTRIES } from "../taxonomy.mjs";
import { parseConstraints } from "./constraints.mjs";
import { composeDocument } from "./compose.mjs";
import { rankCases } from "./select.mjs";
import { completeNarrative, completeRaci, selectSpecialist } from "./models.mjs";
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

function seat(doc) {
  return doc.stakeholders[0]?.roleName || "Customer PM";
}

function painRisks(doc) {
  const owner = seat(doc);
  return [
    { code: "R1", title: `The work drifts away from this pain: ${clipField(doc.pain, 140)}`, score: null, response: "mitigate", mitigation: "Every activity has to name this pain. A retrieved case stays a pattern.", owner },
    { code: "R2", title: "A retrieved case is treated as this customer's result", score: null, response: "mitigate", mitigation: "No result, price, or percentage is copied from a case.", owner },
  ];
}

function painDecisions(doc) {
  const owner = seat(doc);
  return [
    { code: "D1", title: "What this charter is about", choice: clipField(doc.pain, 180), rationale: "The charter follows the pain that was entered.", owner },
    { code: "D2", title: "Constraints that stay in force", choice: clipField(doc.requirements, 180), rationale: "Special requirements are the boundary of the pilot.", owner },
  ];
}

function painGoals(doc) {
  const owner = seat(doc);
  return [
    { code: "G1", statement: `Make this pain better: ${clipField(doc.pain, 160)}`, owner },
    { code: "G2", statement: `Stay inside these requirements: ${clipField(doc.requirements, 160)}`, owner },
  ];
}

function freshNamed(rows, prior, key) {
  if (!rows) return null;
  const banned = new Set((prior || []).map((item) => flat(item[key]).toLowerCase()));
  const fresh = rows.filter((item) => !banned.has(flat(item[key]).toLowerCase()));
  return fresh.length >= 2 ? fresh : null;
}

function painRaci(doc) {
  const seats = doc.stakeholders.map((item) => item.roleName).filter(Boolean);
  const lead = seats[0] || "Customer PM";
  const second = seats[1] || lead;
  const third = seats[2] || lead;
  const pain = clipField(doc.pain, 160);
  return [
    { activity: `Confirm the charter is about this pain: ${pain}`, phase: "Initiate", accountable: lead, responsible: [lead], consulted: [second], informed: [third] },
    { activity: "Choose which retrieved case is only a pattern for this pain", phase: "Plan", accountable: second, responsible: [second], consulted: [lead], informed: [third] },
    { activity: "Keep a person on the action this pain would trigger", phase: "Execute", accountable: third, responsible: [third], consulted: [lead], informed: [second] },
    { activity: "Stop or continue only if this pain is better than before the pilot", phase: "Close", accountable: lead, responsible: [lead], consulted: [second], informed: [third] },
  ];
}

function syncPlanFromRaci(doc) {
  doc.wbs = doc.raci.slice(0, 6).map((row, index) => ({
    code: String(index + 1),
    name: row.activity,
    owner: row.accountable,
    duration: "Planning band",
    deliverable: `Accountable: ${row.accountable}`,
  }));
  doc.milestones = doc.raci.filter((_, index) => index % 2 === 0).slice(0, 4).map((row) => ({
    name: row.activity,
    when: row.phase,
    criteria: `Accountable: ${row.accountable}`,
  }));
  doc.qualityGates = doc.raci.slice(0, 3).map((row) => ({
    phase: row.phase,
    name: row.activity,
    criteria: `Accountable: ${row.accountable}`,
    owner: row.accountable,
  }));
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
    syncPlanFromRaci(doc);
    wrote.push("RACI");
  }
  const resources = takeResources(parsed.resources);
  if (resources && !introducesUnknownCustomer(JSON.stringify(resources), source)) {
    doc.resources = resources;
    wrote.push("resources");
  }
  const risks = freshNamed(takeNamed(parsed.risks, ["title", "mitigation", "owner"]), doc.risks, "title");
  if (risks) {
    doc.risks = risks.map((item, index) => ({ code: `R${index + 1}`, score: null, response: "mitigate", ...item }));
    wrote.push("risks");
  }
  const decisions = freshNamed(takeNamed(parsed.decisions, ["title", "choice", "owner"]), doc.decisions, "title");
  if (decisions) {
    doc.decisions = decisions.map((item, index) => ({ code: `D${index + 1}`, ...item }));
    wrote.push("decisions");
  }
  const goals = freshNamed(takeNamed(parsed.goals, ["statement", "owner"]), doc.goals, "statement");
  if (goals) {
    doc.goals = goals.map((item, index) => ({ code: `G${index + 1}`, ...item }));
    wrote.push("goals");
  }
  return { doc, applied: true, wrote, error: null };
}

export function applyFocusedRaci(doc, raw, gaps = ["RACI", "resources", "risks", "decisions", "goals"]) {
  const wanted = new Set(gaps);
  const text = narrativeText(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const wrote = [];
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      const seats = doc.stakeholders.map((item) => item.roleName);
      const allowed = `${doc.pain}\n${doc.requirements}\n${seats.join("\n")}`;
      if (wanted.has("RACI")) {
        const source = new Set(doc.raci.map((item) => flat(item.activity).toLowerCase()));
        const raci = takeRaci(parsed.raci);
        const fresh = raci
          ? raci
            .filter((item) => !source.has(flat(item.activity).toLowerCase()))
            .map((item) => ({ ...item, accountable: seats.includes(item.accountable) ? item.accountable : seats[0] || item.accountable }))
          : null;
        if (fresh && fresh.length >= 3) {
          doc.raci = fresh;
          wrote.push("RACI");
        }
      }
      if (wanted.has("resources")) {
        const resources = takeResources(parsed.resources);
        if (resources && !introducesUnknownCustomer(JSON.stringify(resources), allowed) && !inventedPercent(JSON.stringify(resources), allowed)) {
          doc.resources = resources;
          wrote.push("resources");
        }
      }
      const owned = (rows) => rows?.map((item) => ({ ...item, owner: seats.includes(item.owner) ? item.owner : seats[0] || item.owner }));
      if (wanted.has("risks")) {
        const risks = owned(freshNamed(takeNamed(parsed.risks, ["title", "mitigation", "owner"]), doc.risks, "title"));
        if (risks && !introducesUnknownCustomer(JSON.stringify(risks), allowed)) {
          doc.risks = risks.map((item, index) => ({ code: `R${index + 1}`, score: null, response: "mitigate", ...item }));
          wrote.push("risks");
        }
      }
      if (wanted.has("decisions")) {
        const decisions = owned(freshNamed(takeNamed(parsed.decisions, ["title", "choice", "owner"]), doc.decisions, "title"));
        if (decisions && !introducesUnknownCustomer(JSON.stringify(decisions), allowed)) {
          doc.decisions = decisions.map((item, index) => ({ code: `D${index + 1}`, ...item }));
          wrote.push("decisions");
        }
      }
      if (wanted.has("goals")) {
        const goals = owned(freshNamed(takeNamed(parsed.goals, ["statement", "owner"]), doc.goals, "statement"));
        if (goals && !introducesUnknownCustomer(JSON.stringify(goals), allowed)) {
          doc.goals = goals.map((item, index) => ({ code: `G${index + 1}`, ...item }));
          wrote.push("goals");
        }
      }
    } catch {
      // The focused reply was not JSON. Missing sections are filled from the pain below.
    }
  }
  if (wanted.has("RACI") && !wrote.includes("RACI")) {
    doc.raci = painRaci(doc);
    syncPlanFromRaci(doc);
  } else if (wrote.includes("RACI")) syncPlanFromRaci(doc);
  if (wanted.has("risks") && !wrote.includes("risks")) doc.risks = painRisks(doc);
  if (wanted.has("decisions") && !wrote.includes("decisions")) doc.decisions = painDecisions(doc);
  if (wanted.has("goals") && !wrote.includes("goals")) doc.goals = painGoals(doc);
  return wrote;
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
      let raciNote = "";
      const gaps = ["RACI", "resources", "risks", "decisions", "goals"].filter((name) => !(merged.wrote || []).includes(name));
      if (merged.applied && gaps.length) {
        let extra = [];
        try {
          const focused = await completeRaci({
            apiKey,
            model: specialist.authoringModelId,
            document: doc,
            fetchImpl,
          });
          extra = applyFocusedRaci(doc, focused, gaps);
        } catch {
          extra = applyFocusedRaci(doc, "", gaps);
        }
        const still = gaps.filter((name) => name !== "resources" && !extra.includes(name));
        merged = { ...merged, wrote: [...new Set([...(merged.wrote || []), ...extra])] };
        if (still.length) {
          const list = still.join(", ");
          raciNote = language === "ko"
            ? ` 사례의 ${list}는 이 페인포인트가 아니라서, 모델이 고른 역할과 페인포인트로 다시 적었습니다.`
            : ` The case ${list} was not about this pain, so those rows were replaced from the pain and the seats the model named.`;
        }
      }
      doc.specialist.called = true;
      if (merged.applied) {
        doc.specialist.narrativeSource = "nvidia";
        doc.specialist.wrote = merged.wrote;
        const list = merged.wrote.join(", ");
        doc.specialist.reason = language === "ko"
          ? `${doc.specialist.reason} 검색된 사례를 읽고 모델이 작성한 항목: ${list}.${raciNote}`
          : `${doc.specialist.reason} The model read the retrieved cases and wrote: ${list}.${raciNote}`;
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
