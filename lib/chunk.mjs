import { phaseLabel, knowledgeLabel } from "./taxonomy.mjs";

const TARGET = 900;

function splitBody(text) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > TARGET && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [String(text || "").trim()].filter(Boolean);
}

function header(caseRecord) {
  return [
    `case: ${caseRecord.caseCode}`,
    `title: ${caseRecord.title}`,
    `industry: ${caseRecord.industryLabel} (${caseRecord.industry})`,
    `segment: ${caseRecord.customerSegmentLabel}`,
    `solutions: ${(caseRecord.ciscoSolutions || []).join(", ")}`,
    `partners: ${(caseRecord.partnerTechnologies || []).join(", ")}`,
    `aliases: ${(caseRecord.aliases || []).join(", ")}`,
    `fidelity: ${caseRecord.fidelity}`,
    "",
  ].join("\n");
}

function push(bucket, caseRecord, section, heading, body) {
  for (const [index, part] of splitBody(body).entries()) {
    if (!part.trim()) continue;
    bucket.push({
      section,
      heading: splitBody(body).length > 1 ? `${heading} (${index + 1})` : heading,
      content: `${header(caseRecord)}${part.trim()}`,
    });
  }
}

function list(items) {
  return (items || []).map((item) => `- ${item}`).join("\n");
}

export function chunkCase(caseRecord) {
  const chunks = [];
  push(
    chunks,
    caseRecord,
    "business_case",
    "비즈니스 케이스",
    [
      caseRecord.executiveSummary,
      "",
      `문제: ${caseRecord.problemStatement}`,
      "",
      `기회: ${caseRecord.opportunity}`,
      "",
      `전략 정합: ${caseRecord.strategicAlignment}`,
      "",
      `비즈니스 가치: ${caseRecord.businessValue}`,
    ].join("\n"),
  );

  for (const section of caseRecord.narrative || []) {
    push(chunks, caseRecord, section.section, section.heading, section.body);
  }

  push(
    chunks,
    caseRecord,
    "scope",
    "범위·가정·제약",
    [
      "포함",
      list(caseRecord.scopeIn),
      "",
      "제외",
      list(caseRecord.scopeOut),
      "",
      "가정",
      ...(caseRecord.assumptions || []).map((item) => `- ${item.statement} (소유: ${item.ownerRole}, 상태: ${item.status})`),
      "",
      "제약",
      ...(caseRecord.constraints || []).map((item) => `- [${item.type}] ${item.statement}`),
      "",
      "성공 기준",
      list(caseRecord.successCriteria),
    ].join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "requirements",
    "요구사항",
    (caseRecord.requirements || [])
      .map(
        (item) =>
          `${item.reqCode} [${knowledgeLabel(item.knowledgeArea)}/${item.priority}] ${item.statement} 수용: ${item.acceptance}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "raci",
    "RACI",
    (caseRecord.raci || [])
      .map(
        (item) =>
          `${phaseLabel(item.phase)} | ${item.activity} | R ${item.responsible.join(", ")} | A ${item.accountable} | C ${(item.consulted || []).join(", ")} | I ${(item.informed || []).join(", ")}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "wbs",
    "WBS",
    (caseRecord.wbs || [])
      .map(
        (item) =>
          `${item.wbsCode} ${item.name} [${phaseLabel(item.phase)}/${knowledgeLabel(item.knowledgeArea)}] 소유 ${item.ownerRole}, ${item.durationDaysLow}–${item.durationDaysHigh}일, 산출물: ${item.deliverable}. ${item.description}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "risks",
    "리스크",
    (caseRecord.risks || [])
      .map(
        (item) =>
          `${item.riskCode} ${item.title} [${item.category}] P${item.probability} I${item.impact} ${item.response}. 완화: ${item.mitigation} 유발: ${item.trigger} 소유: ${item.ownerRole}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "controls",
    "KPI·원가·의사결정",
    [
      "성과",
      ...(caseRecord.outcomes || []).map((item) => `- ${item}`),
      "",
      "KPI",
      ...(caseRecord.kpis || []).map((item) => `- ${item.name}: 기준 ${item.baseline} → 목표 ${item.target} ${item.unit}. ${item.method}`),
      "",
      "원가 계획 밴드",
      caseRecord.planningBandNote,
      ...(caseRecord.costs || []).map((item) => `- ${item.name} (${item.costType}): ${item.lowUsd}–${item.highUsd} USD. ${item.notes}`),
      "",
      "의사결정",
      ...(caseRecord.decisions || []).map((item) => `- ${item.decisionCode} ${item.title}: ${item.choice}. ${item.rationale}`),
    ].join("\n"),
  );

  return chunks.map((chunk, chunkIndex) => ({
    ...chunk,
    chunkIndex,
    id: `${caseRecord.caseCode}#${chunkIndex}`,
    caseCode: caseRecord.caseCode,
    slug: caseRecord.slug,
    title: caseRecord.title,
    industry: caseRecord.industry,
    industryLabel: caseRecord.industryLabel,
    solutions: caseRecord.ciscoSolutions,
    fidelity: caseRecord.fidelity,
    recordType: caseRecord.recordType,
    status: caseRecord.status,
  }));
}
