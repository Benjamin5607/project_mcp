import { dayBand, usdBand, weekBand } from "./format.mjs";
import { DEPLOYMENTS, INDUSTRIES, SEGMENTS, knowledgeLabel, phaseLabel } from "./taxonomy.mjs";

const ARTIFACTS = new Set(["auto", "executive_brief", "proposal_email", "wbs", "raci", "risk_plan"]);

export function detectArtifact(query, explicit = "auto") {
  if (explicit && explicit !== "auto") {
    if (!ARTIFACTS.has(explicit)) return "executive_brief";
    return explicit;
  }
  const folded = String(query || "").toLowerCase();
  if (folded.includes("raci") || folded.includes("역할") || folded.includes("책임")) return "raci";
  if (folded.includes("wbs") || folded.includes("작업") || folded.includes("일정표")) return "wbs";
  if (folded.includes("위험") || folded.includes("리스크") || folded.includes("risk")) return "risk_plan";
  if (folded.includes("메일") || folded.includes("이메일") || folded.includes("제안서")) return "proposal_email";
  return "executive_brief";
}

function cell(value) {
  return String(value ?? "—").replace(/\|/g, "/").replace(/\n/g, " ");
}

function rankCases(matches) {
  const totals = new Map();
  for (const match of matches) totals.set(match.caseCode, (totals.get(match.caseCode) || 0) + match.score);
  return [...totals.entries()].sort((left, right) => right[1] - left[1]).map(([code]) => code);
}

function renderMarkdown(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "heading") return `## ${block.text}`;
      if (block.type === "paragraph" || block.type === "note") return block.text;
      if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
      if (block.type === "table") {
        const head = `| ${block.headers.map(cell).join(" | ")} |`;
        const rule = `| ${block.headers.map(() => "---").join(" | ")} |`;
        const rows = block.rows.map((row) => `| ${row.map(cell).join(" | ")} |`);
        return [head, rule, ...rows].join("\n");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function displayTitle(caseRecord) {
  return caseRecord.titleEn || caseRecord.title;
}

function fidelityLine(caseRecord) {
  const kind = caseRecord.fidelity === "primary_source" ? "a summary of a public source" : "a planning scenario built from public material";
  return `${caseRecord.caseCode} is ${kind}. ${caseRecord.fidelityNote}`;
}

export function synthesize({ query, artifact = "auto", matches, cases }) {
  const kind = detectArtifact(query, artifact);
  const byCode = new Map(cases.map((item) => [item.caseCode, item]));
  const codes = rankCases(matches);
  const primary = byCode.get(codes[0]) || cases[0];
  const supporting = codes
    .slice(1)
    .map((code) => byCode.get(code))
    .filter(Boolean)
    .slice(0, 4);

  const name = displayTitle(primary);
  const titles = {
    executive_brief: `${name} — executive brief`,
    proposal_email: `${name} — proposal email draft`,
    wbs: `${name} — WBS draft`,
    raci: `${name} — RACI draft`,
    risk_plan: `${name} — risk plan draft`,
  };

  const blocks = [];
  blocks.push({ type: "heading", text: titles[kind] });
  blocks.push({
    type: "note",
    text: `For “${query.trim()}”, ${primary.caseCode} is the primary case among ${matches.length} retrieved cases. ${fidelityLine(primary)}`,
  });

  if (kind === "proposal_email") blocks.push(...emailBlocks(primary, supporting));
  else if (kind === "wbs") blocks.push(...wbsBlocks(primary));
  else if (kind === "raci") blocks.push(...raciBlocks(primary));
  else if (kind === "risk_plan") blocks.push(...riskBlocks(primary));
  else blocks.push(...briefBlocks(primary));

  if (supporting.length) {
    blocks.push({
      type: "heading",
      text: "Also considered",
    });
    blocks.push({
      type: "list",
      items: supporting.map(
        (item) =>
          `${item.caseCode} ${displayTitle(item)} — ${INDUSTRIES[item.industry] || item.industry}, ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, ${item.fidelity === "primary_source" ? "public source" : "planning scenario"}`,
      ),
    });
  }

  blocks.push({ type: "heading", text: "Retrieval evidence" });
  blocks.push({
    type: "list",
    items: matches.slice(0, 5).map((match) => `${match.caseCode} · ${match.heading} · score ${match.score.toFixed(3)}`),
  });
  blocks.push({
    type: "note",
    text: "A figure marked as a planning band or a planning target is not a list price and not a customer result. Confirm it against the current public document and the customer environment before anyone approves. Sensitive diagrams and policy values are not in this public bank.",
  });

  return {
    kind,
    title: titles[kind],
    primaryCaseCode: primary.caseCode,
    disclaimer: blocks.at(-1).text,
    blocks,
    markdown: renderMarkdown(blocks),
    citations: matches.slice(0, 5).map((match) => ({
      caseCode: match.caseCode,
      slug: match.slug,
      title: match.title,
      heading: match.heading,
      section: match.section,
      score: Number(match.score.toFixed(4)),
    })),
  };
}

function briefBlocks(item) {
  return [
    { type: "paragraph", text: item.executiveSummary },
    { type: "paragraph", text: item.problemStatement },
    {
      type: "list",
      items: [
        `Industry and segment: ${INDUSTRIES[item.industry] || item.industry} / ${SEGMENTS[item.customerSegment] || item.customerSegment} / ${item.region}`,
        `Solutions: ${item.ciscoSolutions.join(", ")}`,
        `Deployment: ${DEPLOYMENTS[item.deploymentModel] || item.deploymentModel}. ${item.architecturePattern}`,
        `Lead time ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}, duration ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, year-1 cash planning band ${usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)}`,
        `Regulatory context: ${item.regulatoryContext.join(", ")}`,
      ],
    },
    { type: "heading", text: "Success criteria" },
    { type: "list", items: item.successCriteria },
    { type: "heading", text: "Decide now" },
    {
      type: "list",
      items: item.decisions.map((decision) => `${decision.decisionCode} ${decision.title}: ${decision.choice}`),
    },
  ];
}

function emailBlocks(item, supporting) {
  const subject = `[Proposal] ${INDUSTRIES[item.industry] || item.industry} ${item.ciscoSolutions.slice(0, 2).join(" + ")} pilot`;
  return [
    { type: "paragraph", text: `Subject: ${subject}` },
    { type: "paragraph", text: "To: CISO / AI program sponsor    Cc: network architecture, compliance, procurement" },
    {
      type: "paragraph",
      text: `${item.problemStatement} ${item.opportunity}`,
    },
    {
      type: "paragraph",
      text: `The primary case is ${item.caseCode}. ${item.businessValue} Duration is planned at ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, and hardware or license lead time at ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}. The year-1 external spend band is ${usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)}. Internal labor is separate.`,
    },
    { type: "heading", text: "In this pilot" },
    { type: "list", items: item.scopeIn.slice(0, 5) },
    { type: "heading", text: "Out of this proposal" },
    { type: "list", items: item.scopeOut },
    {
      type: "paragraph",
      text: `Ask: schedule a sponsor charter review within two weeks, and name two candidate workloads plus the prohibited-data list. Neighboring cases ${supporting.map((entry) => entry.caseCode).join(", ") || "none"} stay in an appendix where the scope overlaps.`,
    },
  ];
}

function wbsBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `WBS for ${item.caseCode}. Durations are working-day bands. Lead time ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)} is added on the procurement track. Architecture: ${item.architecturePattern}`,
    },
    {
      type: "table",
      headers: ["Code", "Phase", "Task", "Owner", "Duration", "Deliverable"],
      rows: item.wbs.map((task) => [
        task.wbsCode,
        phaseLabel(task.phase),
        task.name,
        task.ownerRole,
        dayBand(task.durationDaysLow, task.durationDaysHigh),
        task.deliverable,
      ]),
    },
    { type: "heading", text: "Milestones" },
    {
      type: "list",
      items: item.milestones.map(
        (milestone) =>
          `${milestone.name} (${weekBand(milestone.weekOffsetLow, milestone.weekOffsetHigh)} after kickoff): ${milestone.criteria}`,
      ),
    },
  ];
}

function raciBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `RACI draft for ${INDUSTRIES[item.industry] || item.industry}. Accountable is exactly one role. Put observe mode and a human approval on the schedule before any automatic enforcement. Regulatory context: ${item.regulatoryContext.join(", ")}.`,
    },
    {
      type: "table",
      headers: ["Phase", "Activity", "Area", "R", "A", "C", "I"],
      rows: item.raci.map((row) => [
        phaseLabel(row.phase),
        row.activity,
        knowledgeLabel(row.knowledgeArea),
        row.responsible.join(", "),
        row.accountable,
        (row.consulted || []).join(", "),
        (row.informed || []).join(", "),
      ]),
    },
    { type: "heading", text: "Stakeholders" },
    {
      type: "list",
      items: item.stakeholders.map(
        (person) =>
          `${person.roleName} (${person.organization}, influence ${person.influence}): ${person.interest} Engagement: ${person.engagement}. Cadence ${person.cadence}.`,
      ),
    },
  ];
}

function riskBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `Risk register for ${item.caseCode}. Score is probability (1–5) times impact (1–5). The response is avoid, mitigate, transfer, or accept.`,
    },
    {
      type: "table",
      headers: ["Code", "Risk", "Category", "P", "I", "Score", "Response", "Owner"],
      rows: item.risks
        .map((risk) => ({ ...risk, score: risk.probability * risk.impact }))
        .sort((left, right) => right.score - left.score)
        .map((risk) => [
          risk.riskCode,
          risk.title,
          risk.category,
          String(risk.probability),
          String(risk.impact),
          String(risk.score),
          risk.response,
          risk.ownerRole,
        ]),
    },
    { type: "heading", text: "Mitigation and triggers" },
    {
      type: "list",
      items: item.risks.map((risk) => `${risk.riskCode} ${risk.mitigation} Trigger: ${risk.trigger} Contingency: ${risk.contingency}`),
    },
    { type: "heading", text: "Open issues" },
    {
      type: "list",
      items: item.issues.map((issue) => `${issue.issueCode} [${issue.status}] ${issue.title} — Next: ${issue.nextAction} (${issue.ownerRole})`),
    },
  ];
}
