import { saveOnePager, readOnePager } from "./store.mjs";
import { asBlock, asOptionalText, asStringList, asText, httpError, linesToList, reviewerName } from "./text.mjs";

function log(doc, at, action, author, text) {
  doc.reviews.push({ at, action, author, text });
}

function editableStakeholders(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    throw httpError("이해관계자는 1–12명으로 적어 주세요.", 400);
  }
  return value.map((item) => ({
    roleName: asText(item?.roleName, 80, "역할"),
    organization: asOptionalText(item?.organization, 80) || "고객",
    interest: asText(item?.interest, 240, "관심"),
    influence: asOptionalText(item?.influence, 40) || "medium",
    engagement: asOptionalText(item?.engagement, 160) || "검토",
    cadence: asOptionalText(item?.cadence, 40) || "주간",
  }));
}

function editableRaci(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw httpError("RACI는 1–20행으로 적어 주세요.", 400);
  }
  return value.map((item) => {
    const accountable = asText(item?.accountable, 80, "Accountable");
    if (/[,;]/.test(accountable)) throw httpError("Accountable은 한 역할만 적습니다.", 400);
    return {
      activity: asText(item?.activity, 160, "활동"),
      phase: asOptionalText(item?.phase, 40) || "계획",
      accountable,
      responsible: asStringList(item?.responsible, 6, 80),
      consulted: asStringList(item?.consulted, 6, 80),
      informed: asStringList(item?.informed, 6, 80),
    };
  });
}

function editableResources(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw httpError("자원은 1–16행으로 적어 주세요.", 400);
  }
  return value.map((item) => ({
    kind: asOptionalText(item?.kind, 40) || "role",
    name: asText(item?.name, 80, "자원"),
    amount: asText(item?.amount, 80, "수량"),
    notes: asOptionalText(item?.notes, 240),
  }));
}

function editableRisks(value, previous) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw httpError("리스크는 1–10행으로 적어 주세요.", 400);
  }
  const prior = new Map((previous || []).map((item) => [item.code, item]));
  return value.map((item, index) => {
    const code = asOptionalText(item?.code, 20) || `R${index + 1}`;
    const known = prior.get(code);
    return {
      code,
      title: asText(item?.title, 160, "리스크"),
      score: known ? known.score : null,
      response: known?.response || "mitigate",
      mitigation: asText(item?.mitigation, 400, "완화"),
      owner: asText(item?.owner, 80, "리스크 소유자"),
    };
  });
}

function editableDecisions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw httpError("의사결정은 1–8행으로 적어 주세요.", 400);
  }
  return value.map((item, index) => ({
    code: asOptionalText(item?.code, 20) || `D${index + 1}`,
    title: asText(item?.title, 120, "의사결정"),
    choice: asText(item?.choice, 400, "선택"),
    rationale: asOptionalText(item?.rationale, 400),
    owner: asText(item?.owner, 80, "결정 소유자"),
  }));
}

function editableComponents(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw httpError("솔루션 구성은 1–8개로 적어 주세요.", 400);
  }
  return value.map((item) => ({
    name: asText(item?.name, 80, "구성 이름"),
    detail: asText(item?.detail, 400, "구성 설명"),
  }));
}

function applyEdits(doc, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw httpError("수정 본문이 필요합니다.", 400);
  doc.headline = asText(patch.headline, 160, "제목");
  doc.executiveSummary = asBlock(patch.executiveSummary, 2500, "요약");
  doc.solution.summary = asBlock(patch.solutionSummary, 1200, "솔루션 요약");
  doc.solution.components = editableComponents(patch.components);
  doc.scopeIn = linesToList(patch.scopeIn, 12, 240);
  doc.scopeOut = linesToList(patch.scopeOut, 12, 240);
  doc.assumptions = linesToList(patch.assumptions, 10, 240);
  if (!doc.scopeIn.length || !doc.scopeOut.length) throw httpError("포함 범위와 제외 범위를 적어 주세요.", 400);
  doc.stakeholders = editableStakeholders(patch.stakeholders);
  doc.raci = editableRaci(patch.raci);
  doc.resources = editableResources(patch.resources);
  doc.risks = editableRisks(patch.risks, doc.risks);
  doc.decisions = editableDecisions(patch.decisions);
}

export function applyReview(id, body, opts = {}) {
  const doc = readOnePager(id, opts.dir);
  if (!doc) throw httpError("원페이저를 찾지 못했습니다.", 404);
  if (!body || typeof body !== "object") throw httpError("JSON 객체가 필요합니다.", 400);
  const now = (opts.now || (() => new Date()))().toISOString();
  const author = asOptionalText(body.author, 40) || "PM";
  const action = body.action;
  if (action === "edit") {
    applyEdits(doc, body.document || {});
    if (doc.status === "approved") {
      doc.status = "in_review";
      doc.approval = null;
      log(doc, now, "edit", author, "승인 이후 내용이 바뀌어 검토로 되돌렸습니다.");
    } else {
      if (doc.status === "draft" || doc.status === "changes_requested") doc.status = "in_review";
      log(doc, now, "edit", author, "초안을 고쳤습니다.");
    }
  } else if (action === "start_review") {
    if (doc.status === "approved") throw httpError("승인된 문서는 철회 후 검토를 다시 엽니다.", 400);
    doc.status = "in_review";
    log(doc, now, "start_review", author, "검토를 시작했습니다.");
  } else if (action === "comment" || action === "request_changes") {
    const text = asText(body.text, 2000, "검토 의견");
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
    log(doc, now, "approve", reviewer, "PM 검토를 마치고 승인했습니다.");
  } else if (action === "reopen") {
    if (doc.status !== "approved") throw httpError("승인된 문서만 철회할 수 있습니다.", 400);
    doc.status = "in_review";
    doc.approval = null;
    log(doc, now, "reopen", author, "승인을 철회하고 검토로 되돌렸습니다.");
  } else {
    throw httpError("지원하지 않는 검토 동작입니다.", 400);
  }
  doc.updatedAt = now;
  return saveOnePager(doc, opts.dir);
}

export function assertExportable(doc) {
  if (doc.status !== "approved" || !doc.approval?.reviewer) {
    throw httpError("PM 승인이 끝나기 전에는 HTML을 내려받을 수 없습니다.", 409);
  }
}
