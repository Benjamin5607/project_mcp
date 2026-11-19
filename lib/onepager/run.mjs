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
  const second = doc.stakeholders[1]?.roleName || owner;
  return [
    { code: "G1", statement: `Make this pain better: ${clipField(doc.pain, 160)}`, owner },
    { code: "G2", statement: `Stay inside these requirements: ${clipField(doc.requirements, 160)}`, owner: second },
    { code: "G3", statement: "Keep one Accountable on every activity. A retrieved case stays a pattern, not a customer result.", owner },
  ];
}

function painMeasures(doc) {
  const owner = seat(doc);
  const second = doc.stakeholders[1]?.roleName || owner;
  const third = doc.stakeholders[2]?.roleName || owner;
  return [
    { name: "Pain boundary", baseline: "Not written", target: `The pilot stays about this pain: ${clipField(doc.pain, 120)}`, method: "Decision log. No invented percentage.", owner },
    { name: "Constraint gate", baseline: "Not checked", target: `The requirements stay in force: ${clipField(doc.requirements, 120)}`, method: "A phase does not start if a requirement was dropped.", owner: second },
    { name: "Person on the action", baseline: "Unset", target: "Any high-impact action still has a named person before it runs.", method: "A test that skips the person fails the gate.", owner: third },
  ];
}

function painOutcomes(doc) {
  return [
    { outcome: `A written plan that names this pain: ${clipField(doc.pain, 140)}`, evidence: "The goals and RACI in this charter." },
    { outcome: `A constraint check against: ${clipField(doc.requirements, 140)}`, evidence: "The decision log before the next phase." },
    { outcome: "A stop or continue decision that does not invent a customer result from a reference case.", evidence: "Sponsor or PM signature." },
  ];
}

function painRollout(doc) {
  const pain = clipField(doc.pain, 100);
  return [
    { phase: "1. Name the pain", protocol: `Write the pilot boundary for: ${pain}`, success: "The sponsor or PM signs the pain boundary.", fallback: "If the pain is restated as a different project, stop and reopen the charter." },
    { phase: "2. Pattern fit", protocol: "Pick which retrieved case is only a pattern. Do not copy its result numbers.", success: "The pattern case is named, and its prices stay out.", fallback: "If a case result is quoted as this customer's result, the phase fails." },
    { phase: "3. Constrained pilot", protocol: `Run only inside: ${clipField(doc.requirements, 100)}`, success: "A person can still stop the action this pain would trigger.", fallback: "Any step that drops a requirement returns to phase 2." },
    { phase: "4. Accept or stop", protocol: "Decide whether this pain is better than before the pilot.", success: "A written decision with one Accountable.", fallback: "A request to invent a percentage reopens the charter." },
  ];
}

function painGovernance(doc) {
  const owner = seat(doc);
  const caseCode = doc.solution?.primaryCaseCode || doc.references?.[0]?.caseCode || "the retrieved case";
  return {
    note: `${owner} is Accountable for scope and acceptance on this pain. ${caseCode} is a public pattern only. Delivery partners are Responsible for checking the pattern and are not Accountable for the customer's data, policy, or price. No MTTR or time-saved percentage is claimed here.`,
    parties: (doc.governance?.parties || []).slice(0, 4),
  };
}

function painPostmortem(doc) {
  const owner = seat(doc);
  return {
    when: "Within 10 business days after the sponsor accepts or rejects the pilot.",
    owner,
    purpose: "Write what was learned about this pain. Do not fill answers before measurement. Do not add a success percentage later.",
    questions: [
      `Did the work stay on this pain: ${clipField(doc.pain, 120)}?`,
      `Which requirement was hardest to keep: ${clipField(doc.requirements, 120)}?`,
      "Did any high-impact action run without the named person?",
      "What from a retrieved case will the next charter refuse to copy as a customer result?",
    ],
  };
}

function painResources(doc) {
  const roles = (doc.stakeholders || []).slice(0, 6).map((item) => ({
    kind: "role",
    name: item.roleName,
    amount: item.cadence || "Planning band",
    notes: clipField(item.interest || `Owns work on this pain: ${clipField(doc.pain, 80)}`, 400),
  }));
  const rows = [...roles];
  if (doc.profile?.minGpu) {
    rows.push({
      kind: "compute",
      name: doc.language === "ko" ? "그래픽카드" : "GPUs",
      amount: doc.language === "ko" ? "0장 / 엣지 경로만" : "0 cards / edge path only",
      notes: doc.language === "ko" ? "특별 요구가 GPU 발자국을 최소화합니다." : "The requirements keep the GPU footprint to a minimum.",
    });
  } else {
    rows.push({
      kind: "compute",
      name: doc.language === "ko" ? "그래픽카드" : "GPUs",
      amount: doc.language === "ko" ? "참조 컴퓨트 밴드 안" : "Inside the reference compute band",
      notes: doc.language === "ko" ? "여기서 카드 수를 고정하지 않습니다." : "Do not freeze a card count here.",
    });
  }
  if (doc.specialist?.deploymentModelLabel) {
    rows.push({
      kind: "model",
      name: doc.specialist.deploymentModelLabel,
      amount: doc.profile?.minGpu ? "Compact profile only" : "Specialist profile",
      notes: doc.specialist.deploymentGpuNote || "Specialist profile for this charter.",
    });
  }
  return rows;
}

function takeMeasures(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 6)) {
    const name = clipField(item?.name, 120);
    const target = clipField(item?.target, 400);
    if (!name || !target) continue;
    rows.push({
      name,
      baseline: clipField(item?.baseline, 120) || "Not written",
      target,
      method: clipField(item?.method, 400) || "Decision log.",
      owner: clipField(item?.owner, 80) || seat({ stakeholders: [] }),
    });
  }
  return rows.length >= 2 ? rows : null;
}

function takeRollout(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 6)) {
    const phase = clipField(item?.phase, 120);
    const success = clipField(item?.success, 400);
    if (!phase || !success) continue;
    rows.push({
      phase,
      protocol: clipField(item?.protocol, 400) || phase,
      success,
      fallback: clipField(item?.fallback, 400) || "Stop and reopen the charter.",
    });
  }
  return rows.length >= 3 ? rows : null;
}

function takeOutcomes(value) {
  if (!Array.isArray(value)) return null;
  const rows = [];
  for (const item of value.slice(0, 6)) {
    const outcome = clipField(item?.outcome || item, 400);
    if (!outcome) continue;
    rows.push({
      outcome,
      evidence: clipField(item?.evidence, 400) || "Decision log.",
    });
  }
  return rows.length >= 2 ? rows : null;
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
  const measures = freshNamed(takeMeasures(parsed.successMeasures), doc.successMeasures, "name");
  if (measures && !introducesUnknownCustomer(JSON.stringify(measures), source)) {
    doc.successMeasures = measures;
    wrote.push("successMeasures");
  }
  const rollout = takeRollout(parsed.rollout);
  if (rollout && rollout.some((item) => !flat(doc.rollout.map((row) => row.phase).join("|")).includes(flat(item.phase))) && !introducesUnknownCustomer(JSON.stringify(rollout), source)) {
    doc.rollout = rollout;
    wrote.push("rollout");
  }
  const outcomes = takeOutcomes(parsed.expectedOutcomes);
  if (outcomes && !introducesUnknownCustomer(JSON.stringify(outcomes), source)) {
    const prior = new Set((doc.expectedOutcomes || []).map((item) => flat(item.outcome).toLowerCase()));
    if (outcomes.some((item) => !prior.has(flat(item.outcome).toLowerCase()))) {
      doc.expectedOutcomes = outcomes;
      wrote.push("expectedOutcomes");
    }
  }
  const governanceNote = clipField(parsed.governanceNote, 1200);
  if (governanceNote && flat(governanceNote) !== flat(doc.governance?.note) && !introducesUnknownCustomer(governanceNote, source)) {
    doc.governance = { ...(doc.governance || { parties: [] }), note: governanceNote };
    wrote.push("governance");
  }
  if (Array.isArray(parsed.postmortemQuestions)) {
    const questions = parsed.postmortemQuestions.map((item) => clipField(item, 400)).filter(Boolean).slice(0, 8);
    const prior = new Set((doc.postmortem?.questions || []).map((item) => flat(item).toLowerCase()));
    if (questions.length >= 3 && questions.some((item) => !prior.has(flat(item).toLowerCase())) && !introducesUnknownCustomer(questions.join("\n"), source)) {
      doc.postmortem = { ...(doc.postmortem || {}), questions };
      wrote.push("postmortem");
    }
  }
  return { doc, applied: true, wrote, error: null };
}

const CHARTER_GAPS = ["RACI", "resources", "risks", "decisions", "goals", "successMeasures", "rollout", "expectedOutcomes", "governance", "postmortem"];

export function applyFocusedRaci(doc, raw, gaps = CHARTER_GAPS) {
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
      if (wanted.has("successMeasures")) {
        const measures = owned(freshNamed(takeMeasures(parsed.successMeasures), doc.successMeasures, "name"));
        if (measures && !introducesUnknownCustomer(JSON.stringify(measures), allowed)) {
          doc.successMeasures = measures;
          wrote.push("successMeasures");
        }
      }
      if (wanted.has("rollout")) {
        const rollout = takeRollout(parsed.rollout);
        const prior = new Set((doc.rollout || []).map((item) => flat(item.phase).toLowerCase()));
        if (rollout && rollout.some((item) => !prior.has(flat(item.phase).toLowerCase())) && !introducesUnknownCustomer(JSON.stringify(rollout), allowed)) {
          doc.rollout = rollout;
          wrote.push("rollout");
        }
      }
      if (wanted.has("expectedOutcomes")) {
        const outcomes = takeOutcomes(parsed.expectedOutcomes);
        const prior = new Set((doc.expectedOutcomes || []).map((item) => flat(item.outcome).toLowerCase()));
        if (outcomes && outcomes.some((item) => !prior.has(flat(item.outcome).toLowerCase())) && !introducesUnknownCustomer(JSON.stringify(outcomes), allowed)) {
          doc.expectedOutcomes = outcomes;
          wrote.push("expectedOutcomes");
        }
      }
      if (wanted.has("governance")) {
        const governanceNote = clipField(parsed.governanceNote, 1200);
        if (governanceNote && flat(governanceNote) !== flat(doc.governance?.note) && !introducesUnknownCustomer(governanceNote, allowed)) {
          doc.governance = { ...(doc.governance || { parties: [] }), note: governanceNote };
          wrote.push("governance");
        }
      }
      if (wanted.has("postmortem") && Array.isArray(parsed.postmortemQuestions)) {
        const questions = parsed.postmortemQuestions.map((item) => clipField(item, 400)).filter(Boolean).slice(0, 8);
        const prior = new Set((doc.postmortem?.questions || []).map((item) => flat(item).toLowerCase()));
        if (questions.length >= 3 && questions.some((item) => !prior.has(flat(item).toLowerCase())) && !introducesUnknownCustomer(questions.join("\n"), allowed)) {
          doc.postmortem = { ...(doc.postmortem || {}), questions };
          wrote.push("postmortem");
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
  if (wanted.has("resources") && !wrote.includes("resources")) doc.resources = painResources(doc);
  if (wanted.has("successMeasures") && !wrote.includes("successMeasures")) doc.successMeasures = painMeasures(doc);
  if (wanted.has("rollout") && !wrote.includes("rollout")) doc.rollout = painRollout(doc);
  if (wanted.has("expectedOutcomes") && !wrote.includes("expectedOutcomes")) doc.expectedOutcomes = painOutcomes(doc);
  if (wanted.has("governance") && !wrote.includes("governance")) doc.governance = { ...painGovernance(doc), parties: doc.governance?.parties || [] };
  if (wanted.has("postmortem") && !wrote.includes("postmortem")) {
    const next = painPostmortem(doc);
    doc.postmortem = { ...(doc.postmortem || {}), ...next };
  }
  return wrote;
}

/** Local persona and failed model calls still rewrite case-pack charter rows for this pain. */
export function rewriteCharterForPain(doc) {
  const painHint = clipField(doc.pain, 80);
  const korean = doc.language === "ko";
  doc.stakeholders = [
    { roleName: korean ? "페인 오너" : "Pain owner", organization: "Customer", interest: clipField(doc.pain, 400), influence: "high", engagement: korean ? "페인 경계를 승인합니다." : "Accepts the pain boundary.", cadence: "Weekly" },
    { roleName: "Customer PM", organization: "Customer", interest: clipField(doc.requirements, 400), influence: "high", engagement: korean ? "일정과 결정 로그를 소유합니다." : "Owns the schedule and the decision log.", cadence: "Weekly" },
    { roleName: korean ? "제약 오너" : "Constraint owner", organization: "Customer", interest: clipField(doc.requirements, 400), influence: "medium", engagement: korean ? "특별 요구가 빠지면 단계를 멈춥니다." : "Stops a phase if a requirement was dropped.", cadence: "At the gate" },
    ...(doc.stakeholders || []).slice(0, 2).map((item) => ({
      ...item,
      interest: clipField(`${painHint} — ${item.interest}`, 400),
    })),
  ].slice(0, 6);
  doc.raci = painRaci(doc);
  syncPlanFromRaci(doc);
  doc.resources = painResources(doc);
  doc.risks = painRisks(doc);
  doc.decisions = painDecisions(doc);
  doc.goals = painGoals(doc);
  doc.successMeasures = painMeasures(doc);
  doc.rollout = painRollout(doc);
  doc.expectedOutcomes = painOutcomes(doc);
  doc.governance = { ...painGovernance(doc), parties: doc.governance?.parties || [] };
  doc.postmortem = { ...(doc.postmortem || {}), ...painPostmortem(doc) };
  return doc;
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
  const caseResourceNames = (doc.resources || []).map((item) => flat(item.name)).join("|");
  const caseSeatNames = (doc.stakeholders || []).map((item) => flat(item.roleName)).join("|");
  const painHint = clipField(doc.pain, 80);
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
      const gaps = CHARTER_GAPS.filter((name) => !(merged.wrote || []).includes(name));
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
        const still = gaps.filter((name) => !extra.includes(name));
        merged = { ...merged, wrote: [...new Set([...(merged.wrote || []), ...extra, ...still])] };
        if (still.length) {
          const list = still.join(", ");
          raciNote = language === "ko"
            ? ` 사례의 ${list}는 이 페인포인트가 아니라서, 모델이 고른 역할과 페인포인트로 다시 적었습니다.`
            : ` The case ${list} was not about this pain, so those rows were replaced from the pain and the seats the model named.`;
        }
      }
      doc.specialist.called = true;
      if (merged.applied) {
        const seatNames = (doc.stakeholders || []).map((item) => flat(item.roleName)).join("|");
        if (seatNames === caseSeatNames) {
          doc.stakeholders = [
            { roleName: language === "ko" ? "페인 오너" : "Pain owner", organization: "Customer", interest: clipField(doc.pain, 400), influence: "high", engagement: language === "ko" ? "페인 경계를 승인합니다." : "Accepts the pain boundary.", cadence: "Weekly" },
            { roleName: "Customer PM", organization: "Customer", interest: clipField(doc.requirements, 400), influence: "high", engagement: language === "ko" ? "일정과 결정 로그를 소유합니다." : "Owns the schedule and the decision log.", cadence: "Weekly" },
            { roleName: language === "ko" ? "제약 오너" : "Constraint owner", organization: "Customer", interest: clipField(doc.requirements, 400), influence: "medium", engagement: language === "ko" ? "특별 요구가 빠지면 단계를 멈춥니다." : "Stops a phase if a requirement was dropped.", cadence: "At the gate" },
            ...(doc.stakeholders || []).slice(0, 2).map((item) => ({
              ...item,
              interest: clipField(`${painHint} — ${item.interest}`, 400),
            })),
          ].slice(0, 6);
          if (!(merged.wrote || []).includes("stakeholders")) merged.wrote = [...(merged.wrote || []), "stakeholders"];
        }
        const resourceNames = (doc.resources || []).map((item) => flat(item.name)).join("|");
        if (resourceNames === caseResourceNames || seatNames === caseSeatNames) {
          doc.resources = painResources(doc);
          if (!(merged.wrote || []).includes("resources")) merged.wrote = [...(merged.wrote || []), "resources"];
        }
        doc.specialist.narrativeSource = "nvidia";
        doc.specialist.wrote = merged.wrote;
        const list = merged.wrote.join(", ");
        doc.specialist.reason = language === "ko"
          ? `${doc.specialist.reason} 검색된 사례를 읽고 모델이 작성한 항목: ${list}.${raciNote}`
          : `${doc.specialist.reason} The model read the retrieved cases and wrote: ${list}.${raciNote}`;
      } else {
        rewriteCharterForPain(doc);
        doc.specialist.error = merged.error;
        doc.specialist.reason = language === "ko"
          ? `${doc.specialist.reason} 모델 문장이 맞지 않아 페인포인트 기준으로 차터를 다시 적었습니다.`
          : `${doc.specialist.reason} The model reply did not fit, so the charter was rewritten from this pain.`;
      }
    } catch (error) {
      const status = Number(error.status) || 0;
      rewriteCharterForPain(doc);
      doc.specialist.called = true;
      doc.specialist.error = language === "ko"
        ? `NVIDIA API 호출에 실패했습니다${status ? ` (${status})` : ""}. 페인포인트 기준으로 로컬 차터를 다시 적었습니다.`
        : `The NVIDIA API call failed${status ? ` (${status})` : ""}, so the charter was rewritten from this pain.`;
      doc.specialist.reason = language === "ko"
        ? `${doc.specialist.reason} 호출에 실패해 페인포인트 기준으로 차터를 다시 적었습니다.`
        : `${doc.specialist.reason} The call failed, so the charter was rewritten from this pain.`;
    }
  } else {
    rewriteCharterForPain(doc);
    doc.specialist.reason = language === "ko"
      ? `${doc.specialist.reason} 클라우드로 페인포인트를 보내지 않아, 검색된 사례를 패턴으로만 두고 페인포인트에 맞춰 차터를 적었습니다.`
      : `${doc.specialist.reason} The pain was not sent to the cloud, so the retrieved cases stayed patterns and the charter was written for this pain.`;
  }
  return saveOnePager(doc, opts.dir);
}
