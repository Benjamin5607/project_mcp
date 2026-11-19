import { saveOnePager, readOnePager } from "./store.mjs";
import { asBlock, asOptionalText, asStringList, asText, httpError, linesToList, reviewerName } from "./text.mjs";

function log(doc, at, action, author, text) {
  doc.reviews.push({ at, action, author, text });
}

function editableStakeholders(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    throw httpError("Provide 1–12 stakeholders.", 400);
  }
  return value.map((item) => ({
    roleName: asText(item?.roleName, 80, "Role"),
    organization: asOptionalText(item?.organization, 80) || "Customer",
    interest: asText(item?.interest, 400, "Interest"),
    influence: asOptionalText(item?.influence, 40) || "medium",
    engagement: asOptionalText(item?.engagement, 400) || "Review",
    cadence: asOptionalText(item?.cadence, 80) || "Weekly",
  }));
}

function editableRaci(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw httpError("Provide 1–20 RACI rows.", 400);
  }
  return value.map((item) => {
    const accountable = asText(item?.accountable, 80, "Accountable");
    if (/[,;]/.test(accountable)) throw httpError("Accountable is exactly one role.", 400);
    return {
      activity: asText(item?.activity, 200, "Activity"),
      phase: asOptionalText(item?.phase, 40) || "Planning",
      accountable,
      responsible: asStringList(item?.responsible, 6, 80),
      consulted: asStringList(item?.consulted, 6, 80),
      informed: asStringList(item?.informed, 6, 80),
    };
  });
}

function editableResources(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw httpError("Provide 1–16 resource rows.", 400);
  }
  return value.map((item) => ({
    kind: asOptionalText(item?.kind, 40) || "role",
    name: asText(item?.name, 80, "Resource"),
    amount: asText(item?.amount, 120, "Amount"),
    notes: asOptionalText(item?.notes, 400),
  }));
}

function editableRisks(value, previous) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw httpError("Provide 1–10 risks.", 400);
  }
  const prior = new Map((previous || []).map((item) => [item.code, item]));
  return value.map((item, index) => {
    const code = asOptionalText(item?.code, 20) || `R${index + 1}`;
    const known = prior.get(code);
    return {
      code,
      title: asText(item?.title, 160, "Risk"),
      score: known ? known.score : null,
      response: known?.response || "mitigate",
      mitigation: asText(item?.mitigation, 400, "Mitigation"),
      owner: asText(item?.owner, 80, "Risk owner"),
    };
  });
}

function editableDecisions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw httpError("Provide 1–8 decisions.", 400);
  }
  return value.map((item, index) => ({
    code: asOptionalText(item?.code, 20) || `D${index + 1}`,
    title: asText(item?.title, 120, "Decision"),
    choice: asText(item?.choice, 400, "Choice"),
    rationale: asOptionalText(item?.rationale, 400),
    owner: asText(item?.owner, 80, "Decision owner"),
  }));
}

function editableComponents(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw httpError("Provide 1–8 solution components.", 400);
  }
  return value.map((item) => ({
    name: asText(item?.name, 80, "Component name"),
    detail: asText(item?.detail, 400, "Component detail"),
  }));
}

function applyEdits(doc, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw httpError("An edit body is required.", 400);
  doc.headline = asText(patch.headline, 160, "Headline");
  doc.executiveSummary = asBlock(patch.executiveSummary, 2500, "Summary");
  doc.solution.summary = asBlock(patch.solutionSummary, 1200, "Solution summary");
  doc.solution.components = editableComponents(patch.components);
  doc.scopeIn = linesToList(patch.scopeIn, 12, 240);
  doc.scopeOut = linesToList(patch.scopeOut, 12, 240);
  doc.assumptions = linesToList(patch.assumptions, 10, 240);
  if (!doc.scopeIn.length || !doc.scopeOut.length) throw httpError("In scope and out of scope are both required.", 400);
  doc.stakeholders = editableStakeholders(patch.stakeholders);
  doc.raci = editableRaci(patch.raci);
  doc.resources = editableResources(patch.resources);
  doc.risks = editableRisks(patch.risks, doc.risks);
  doc.decisions = editableDecisions(patch.decisions);
  if (patch.goals != null) {
    const lines = linesToList(patch.goals, 8, 400);
    doc.goals = lines.map((statement, index) => ({
      code: doc.goals?.[index]?.code || `G${index + 1}`,
      statement,
      owner: doc.goals?.[index]?.owner || "",
    }));
  }
  if (Array.isArray(patch.successMeasures)) {
    doc.successMeasures = patch.successMeasures.slice(0, 8).map((item, index) => ({
      name: asText(item?.name, 160, "measure"),
      baseline: asOptionalText(item?.baseline, 200) || "Not measured",
      target: asText(item?.target, 400, "pass rule"),
      method: asOptionalText(item?.method, 500) || doc.successMeasures?.[index]?.method || "",
      owner: asOptionalText(item?.owner, 80) || doc.successMeasures?.[index]?.owner || "",
    }));
  }
  if (patch.expectedOutcomes != null) {
    const lines = linesToList(patch.expectedOutcomes, 8, 400);
    doc.expectedOutcomes = lines.map((outcome, index) => ({
      outcome,
      evidence: doc.expectedOutcomes?.[index]?.evidence || "",
    }));
  }
  if (Array.isArray(patch.rollout)) {
    doc.rollout = patch.rollout.slice(0, 6).map((item) => ({
      phase: asText(item?.phase, 80, "phase"),
      protocol: asText(item?.protocol, 500, "protocol"),
      success: asText(item?.success, 500, "pass rule"),
      fallback: asText(item?.fallback, 500, "fallback"),
    }));
  }
  if (patch.governanceNote != null) {
    doc.governance = {
      ...(doc.governance || { parties: [] }),
      note: asText(patch.governanceNote, 1200, "governance"),
    };
  }
  if (patch.postmortemQuestions != null) {
    doc.postmortem = {
      ...(doc.postmortem || {}),
      questions: linesToList(patch.postmortemQuestions, 8, 400),
    };
  }
}

export function applyReview(id, body, opts = {}) {
  const doc = readOnePager(id, opts.dir);
  if (!doc) throw httpError("That one-pager was not found.", 404);
  if (!body || typeof body !== "object") throw httpError("A JSON object is required.", 400);
  const now = (opts.now || (() => new Date()))().toISOString();
  const author = asOptionalText(body.author, 40) || "PM";
  const action = body.action;
  const ko = doc.language === "ko";
  if (action === "edit") {
    applyEdits(doc, body.document || {});
    if (doc.status === "approved") {
      doc.status = "in_review";
      doc.approval = null;
      log(doc, now, "edit", author, ko ? "승인 이후 내용이 바뀌어 검토로 되돌렸습니다." : "Edits after approval reopened the review.");
    } else {
      if (doc.status === "draft" || doc.status === "changes_requested") doc.status = "in_review";
      log(doc, now, "edit", author, ko ? "초안을 고쳤습니다." : "Edited the draft.");
    }
  } else if (action === "start_review") {
    if (doc.status === "approved") throw httpError(ko ? "승인된 문서는 철회 후 검토를 다시 엽니다." : "Reopen an approved one-pager before reviewing it again.", 400);
    doc.status = "in_review";
    log(doc, now, "start_review", author, ko ? "검토를 시작했습니다." : "Review started.");
  } else if (action === "comment" || action === "request_changes") {
    const text = asText(body.text, 2000, ko ? "검토 의견" : "review comment");
    if (action === "request_changes") {
      if (doc.status === "approved") {
        doc.approval = null;
      }
      doc.status = "changes_requested";
      log(doc, now, "request_changes", author, text);
    } else {
      if (doc.status === "draft") doc.status = "in_review";
      log(doc, now, "comment", author, text);
    }
  } else if (action === "approve") {
    const reviewer = reviewerName(body.reviewer);
    doc.status = "approved";
    doc.approval = { reviewer, at: now };
    log(doc, now, "approve", reviewer, ko ? "PM 검토를 마치고 승인했습니다." : "The PM approved this one-pager.");
  } else if (action === "reopen") {
    if (doc.status !== "approved") throw httpError(ko ? "승인된 문서만 철회할 수 있습니다." : "Only an approved one-pager can be reopened.", 400);
    doc.status = "in_review";
    doc.approval = null;
    log(doc, now, "reopen", author, ko ? "승인을 철회하고 검토로 되돌렸습니다." : "Approval was withdrawn and the review reopened.");
  } else {
    throw httpError(ko ? "지원하지 않는 검토 동작입니다." : "That review action is not supported.", 400);
  }
  doc.updatedAt = now;
  return saveOnePager(doc, opts.dir);
}

export function assertExportable(doc) {
  if (doc.status !== "approved" || !doc.approval?.reviewer) {
    throw httpError(
      doc.language === "ko"
        ? "PM 승인이 끝나기 전에는 HTML을 내려받을 수 없습니다."
        : "A PM has to approve this one-pager before HTML can be downloaded.",
      409,
    );
  }
}
