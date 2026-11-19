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
    "Business case",
    [
      caseRecord.executiveSummary,
      "",
      `Problem: ${caseRecord.problemStatement}`,
      "",
      `Opportunity: ${caseRecord.opportunity}`,
      "",
      `Strategic alignment: ${caseRecord.strategicAlignment}`,
      "",
      `Business value: ${caseRecord.businessValue}`,
    ].join("\n"),
  );

  for (const section of caseRecord.narrative || []) {
    push(chunks, caseRecord, section.section, section.heading, section.body);
  }

  push(
    chunks,
    caseRecord,
    "scope",
    "Scope, assumptions, and constraints",
    [
      "In scope",
      list(caseRecord.scopeIn),
      "",
      "Out of scope",
      list(caseRecord.scopeOut),
      "",
      "Assumptions",
      ...(caseRecord.assumptions || []).map((item) => `- ${item.statement} (owner: ${item.ownerRole}, status: ${item.status})`),
      "",
      "Constraints",
      ...(caseRecord.constraints || []).map((item) => `- [${item.type}] ${item.statement}`),
      "",
      "Success criteria",
      list(caseRecord.successCriteria),
    ].join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "requirements",
    "Requirements",
    (caseRecord.requirements || [])
      .map(
        (item) =>
          `${item.reqCode} [${knowledgeLabel(item.knowledgeArea)}/${item.priority}] ${item.statement} Acceptance: ${item.acceptance}`,
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
          `${item.wbsCode} ${item.name} [${phaseLabel(item.phase)}/${knowledgeLabel(item.knowledgeArea)}] owner ${item.ownerRole}, ${item.durationDaysLow}–${item.durationDaysHigh} days, deliverable: ${item.deliverable}. ${item.description}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "risks",
    "Risks",
    (caseRecord.risks || [])
      .map(
        (item) =>
          `${item.riskCode} ${item.title} [${item.category}] P${item.probability} I${item.impact} ${item.response}. Mitigation: ${item.mitigation} Trigger: ${item.trigger} Owner: ${item.ownerRole}`,
      )
      .join("\n"),
  );

  push(
    chunks,
    caseRecord,
    "controls",
    "KPIs, cost, and decisions",
    [
      "Outcomes",
      ...(caseRecord.outcomes || []).map((item) => `- ${item}`),
      "",
      "KPIs",
      ...(caseRecord.kpis || []).map((item) => `- ${item.name}: baseline ${item.baseline} → target ${item.target} ${item.unit}. ${item.method}`),
      "",
      "Cost planning band",
      caseRecord.planningBandNote,
      ...(caseRecord.costs || []).map((item) => `- ${item.name} (${item.costType}): ${item.lowUsd}–${item.highUsd} USD. ${item.notes}`),
      "",
      "Decisions",
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
