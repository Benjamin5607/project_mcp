import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { cases } from "../data/authoring/index.mjs";
import { chunkCase } from "../lib/chunk.mjs";
import { embed } from "../lib/embed.mjs";

function uuid(seed) {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function text(value) {
  if (value == null || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function num(value) {
  return value == null ? "null" : String(Number(value));
}

function bool(value) {
  return value ? "true" : "false";
}

function textArray(values) {
  const items = values || [];
  if (!items.length) return "array[]::text[]";
  return `array[${items.map((item) => text(item)).join(", ")}]`;
}

function vector(values) {
  const body = values.map((value) => Number(value).toFixed(6)).join(",");
  return `'[${body}]'::vector(384)`;
}

const lines = [];
lines.push("-- Generated from data/authoring. Do not edit by hand.");
lines.push("-- Load after supabase/migrations/001_pm_case_bank.sql");
lines.push("begin;");

for (const item of cases) {
  const id = uuid(item.caseCode);
  lines.push(`
insert into solution_cases (
  id, case_code, slug, title, title_en, record_type, fidelity, fidelity_note, status, confidentiality,
  executive_summary, problem_statement, opportunity, strategic_alignment, business_value,
  industry, industry_label, customer_segment, customer_segment_label, region, regulatory_context,
  company_size_band, deployment_model, deployment_model_label, architecture_pattern, complexity,
  planning_band_note, deal_size_low_usd, deal_size_high_usd, deal_size_band,
  lead_time_weeks_low, lead_time_weeks_high, duration_weeks_low, duration_weeks_high,
  cisco_solutions, partner_technologies, ai_capabilities, security_capabilities, aliases,
  scope_in, scope_out, success_criteria, outcome_type, outcomes, video_url, video_title, published_on
) values (
  '${id}', ${text(item.caseCode)}, ${text(item.slug)}, ${text(item.title)}, ${text(item.titleEn)},
  ${text(item.recordType)}, ${text(item.fidelity)}, ${text(item.fidelityNote)}, ${text(item.status)}, ${text(item.confidentiality)},
  ${text(item.executiveSummary)}, ${text(item.problemStatement)}, ${text(item.opportunity)}, ${text(item.strategicAlignment)}, ${text(item.businessValue)},
  ${text(item.industry)}, ${text(item.industryLabel)}, ${text(item.customerSegment)}, ${text(item.customerSegmentLabel)}, ${text(item.region)}, ${textArray(item.regulatoryContext)},
  ${text(item.companySizeBand)}, ${text(item.deploymentModel)}, ${text(item.deploymentModelLabel)}, ${text(item.architecturePattern)}, ${text(item.complexity)},
  ${text(item.planningBandNote)}, ${num(item.dealSizeLowUsd)}, ${num(item.dealSizeHighUsd)}, ${text(item.dealSizeBand)},
  ${num(item.leadTimeWeeksLow)}, ${num(item.leadTimeWeeksHigh)}, ${num(item.durationWeeksLow)}, ${num(item.durationWeeksHigh)},
  ${textArray(item.ciscoSolutions)}, ${textArray(item.partnerTechnologies)}, ${textArray(item.aiCapabilities)}, ${textArray(item.securityCapabilities)}, ${textArray(item.aliases)},
  ${textArray(item.scopeIn)}, ${textArray(item.scopeOut)}, ${textArray(item.successCriteria)}, ${text(item.outcomeType)}, ${textArray(item.outcomes)},
  ${text(item.videoUrl)}, ${text(item.videoTitle)}, ${text(item.publishedOn)}
);`);

  const child = (table, columns, rows) => {
    for (const row of rows) {
      lines.push(`insert into ${table} (case_id, ${columns.join(", ")}) values ('${id}', ${row.join(", ")});`);
    }
  };

  child("assumptions", ["statement", "owner_role", "status"], item.assumptions.map((row) => [text(row.statement), text(row.ownerRole), text(row.status)]));
  child("constraints_log", ["constraint_type", "statement"], item.constraints.map((row) => [text(row.type), text(row.statement)]));
  child(
    "stakeholders",
    ["role_code", "role_name", "organization", "interest", "influence", "engagement", "cadence"],
    item.stakeholders.map((row) => [text(row.roleCode), text(row.roleName), text(row.organization), text(row.interest), text(row.influence), text(row.engagement), text(row.cadence)]),
  );
  child(
    "requirements",
    ["req_code", "knowledge_area", "priority", "statement", "acceptance", "source"],
    item.requirements.map((row) => [text(row.reqCode), text(row.knowledgeArea), text(row.priority), text(row.statement), text(row.acceptance), text(row.source)]),
  );
  child(
    "raci_items",
    ["activity", "phase", "knowledge_area", "responsible", "accountable", "consulted", "informed"],
    item.raci.map((row) => [text(row.activity), text(row.phase), text(row.knowledgeArea), textArray(row.responsible), text(row.accountable), textArray(row.consulted), textArray(row.informed)]),
  );
  child(
    "wbs_items",
    ["wbs_code", "parent_code", "phase", "knowledge_area", "name", "description", "deliverable", "owner_role", "duration_days_low", "duration_days_high", "predecessors", "acceptance", "is_milestone", "sort_order"],
    item.wbs.map((row) => [
      text(row.wbsCode),
      text(row.parentCode),
      text(row.phase),
      text(row.knowledgeArea),
      text(row.name),
      text(row.description),
      text(row.deliverable),
      text(row.ownerRole),
      num(row.durationDaysLow),
      num(row.durationDaysHigh),
      textArray(row.predecessors),
      text(row.acceptance),
      bool(row.milestone),
      num(row.sort),
    ]),
  );
  child(
    "milestones",
    ["name", "phase", "week_offset_low", "week_offset_high", "criteria"],
    item.milestones.map((row) => [text(row.name), text(row.phase), num(row.weekOffsetLow), num(row.weekOffsetHigh), text(row.criteria)]),
  );
  child(
    "risks",
    ["risk_code", "title", "description", "category", "probability", "impact", "response_strategy", "mitigation", "contingency", "owner_role", "trigger_condition"],
    item.risks.map((row) => [
      text(row.riskCode),
      text(row.title),
      text(row.description),
      text(row.category),
      num(row.probability),
      num(row.impact),
      text(row.response),
      text(row.mitigation),
      text(row.contingency),
      text(row.ownerRole),
      text(row.trigger),
    ]),
  );
  child(
    "issues",
    ["issue_code", "title", "status", "owner_role", "next_action"],
    item.issues.map((row) => [text(row.issueCode), text(row.title), text(row.status), text(row.ownerRole), text(row.nextAction)]),
  );
  child(
    "kpis",
    ["name", "baseline", "target", "unit", "method", "owner_role", "cadence"],
    item.kpis.map((row) => [text(row.name), text(row.baseline), text(row.target), text(row.unit), text(row.method), text(row.ownerRole), text(row.cadence)]),
  );
  child(
    "cost_lines",
    ["category", "name", "cost_type", "low_usd", "high_usd", "notes"],
    item.costs.map((row) => [text(row.category), text(row.name), text(row.costType), num(row.lowUsd), num(row.highUsd), text(row.notes)]),
  );
  child(
    "quality_gates",
    ["phase", "name", "criteria", "owner_role"],
    item.qualityGates.map((row) => [text(row.phase), text(row.name), text(row.criteria), text(row.ownerRole)]),
  );
  child(
    "communications",
    ["audience", "message", "channel", "cadence", "owner_role"],
    item.communications.map((row) => [text(row.audience), text(row.message), text(row.channel), text(row.cadence), text(row.ownerRole)]),
  );
  child(
    "procurement_items",
    ["item", "vendor_type", "strategy", "lead_weeks", "notes"],
    item.procurement.map((row) => [text(row.item), text(row.vendorType), text(row.strategy), num(row.leadWeeks), text(row.notes)]),
  );
  child(
    "decisions",
    ["decision_code", "title", "choice", "rationale", "decided_on", "owner_role"],
    item.decisions.map((row) => [text(row.decisionCode), text(row.title), text(row.choice), text(row.rationale), text(row.date), text(row.ownerRole)]),
  );
  child("lessons", ["theme", "statement", "applicability"], item.lessons.map((row) => [text(row.theme), text(row.statement), text(row.applicability)]));
  child("benefits", ["name", "measure", "beneficiary", "timing"], item.benefits.map((row) => [text(row.name), text(row.measure), text(row.beneficiary), text(row.timing)]));
  for (const source of item.sourceUrls) {
    lines.push(`insert into source_documents (case_id, title, url, publisher, published_on) values ('${id}', ${text(source.title)}, ${text(source.url)}, ${text(source.publisher)}, ${text(source.publishedOn)});`);
  }

  chunkCase(item).forEach((chunk) => {
    const values = embed(chunk.content);
    lines.push(
      `insert into case_chunks (id, case_id, chunk_index, section, heading, content, token_estimate, embedding) values ('${uuid(chunk.id)}', '${id}', ${chunk.chunkIndex}, ${text(chunk.section)}, ${text(chunk.heading)}, ${text(chunk.content)}, ${Math.ceil(chunk.content.length / 2)}, ${vector(values)});`,
    );
  });
}

lines.push("commit;");
const target = path.join(process.cwd(), "supabase", "seed.sql");
writeFileSync(target, `${lines.join("\n")}\n`);
console.log(`wrote ${target}`);
