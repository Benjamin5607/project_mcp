import Link from "next/link";
import { usdBand, weekBand, dayBand, safeHttpsUrl } from "../lib/format.mjs";
import { DEPLOYMENTS, INDUSTRIES, SEGMENTS, knowledgeLabel, phaseLabel } from "../lib/taxonomy.mjs";

function Table({ headers, rows, rowClass }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={rowClass ? rowClass(row, index) : undefined}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CaseView({ item }) {
  const title = item.titleEn || item.title;
  const ask = `/ask?q=${encodeURIComponent(`Draft a RACI and a WBS from case ${item.caseCode}`)}`;
  return (
    <article className="case-hero">
      <p className="kicker">{item.caseCode}</p>
      <div className="row">
        <span className={item.fidelity === "primary_source" ? "badge teal" : "badge gold"}>
          {item.fidelity === "primary_source" ? "Public source" : "Planning scenario"}
        </span>
        <span className="badge">{INDUSTRIES[item.industry] || item.industry}</span>
        <span className="badge">{SEGMENTS[item.customerSegment] || item.customerSegment}</span>
        <span className="badge">{item.region}</span>
      </div>
      <h1>{title}</h1>
      <p className="lede">{[item.vendor, item.industryLabel, item.customerSegmentLabel].filter(Boolean).join(" · ")}</p>
      <div className="anchor-nav no-print">
        {["overview", "scope", "raci", "wbs", "risks", "cost", "sources"].map((id) => (
          <a key={id} href={`#${id}`}>{id}</a>
        ))}
        <Link href={ask}>Draft from this case</Link>
      </div>
      <div className="band" id="overview">
        <strong>How to read this. </strong>
        {item.fidelityNote} {item.planningBandNote}
      </div>
      <div className="facts">
        <div className="fact"><span>Duration</span>{weekBand(item.durationWeeksLow, item.durationWeeksHigh)}</div>
        <div className="fact"><span>Lead time</span>{weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}</div>
        <div className="fact"><span>Year-1 planning band</span>{usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)} ({item.dealSizeBand})</div>
        <div className="fact"><span>Complexity</span>{item.complexity}</div>
      </div>
      <p>{item.executiveSummary}</p>
      <p>{item.problemStatement}</p>
      <p>{item.opportunity}</p>
      <p>{item.businessValue}</p>
      <p className="meta">Deployment: {DEPLOYMENTS[item.deploymentModel] || item.deploymentModel}. {item.architecturePattern}</p>
      <p className="meta">Solutions: {item.ciscoSolutions.join(", ")}</p>
      {item.partnerTechnologies.length ? <p className="meta">Partners: {item.partnerTechnologies.join(", ")}</p> : null}
      <p className="meta">Regulatory context: {item.regulatoryContext.join(", ")}</p>

      {(item.narrative || []).map((section) => (
        <section className="section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.split(/\n{2,}/).map((paragraph, index) => <p key={`${section.heading}-${index}`}>{paragraph}</p>)}
        </section>
      ))}

      <section className="section" id="scope">
        <h2>Scope</h2>
        <div className="split">
          <div className="panel"><h3>In</h3><ul className="clean">{item.scopeIn.map((line) => <li key={line}>{line}</li>)}</ul></div>
          <div className="panel"><h3>Out</h3><ul className="clean">{item.scopeOut.map((line) => <li key={line}>{line}</li>)}</ul></div>
        </div>
        <h3>Assumptions</h3>
        <ul className="clean">{item.assumptions.map((row) => <li key={row.statement}>{row.statement} — {row.ownerRole} ({row.status})</li>)}</ul>
        <h3>Constraints</h3>
        <ul className="clean">{item.constraints.map((row) => <li key={row.statement}>[{row.type}] {row.statement}</li>)}</ul>
        <h3>Success criteria</h3>
        <ul className="clean">{item.successCriteria.map((line) => <li key={line}>{line}</li>)}</ul>
        <h3>Requirements</h3>
        <Table
          headers={["Code", "Area", "Priority", "Requirement", "Acceptance"]}
          rows={item.requirements.map((row) => [row.reqCode, knowledgeLabel(row.knowledgeArea), row.priority, row.statement, row.acceptance])}
        />
      </section>

      <section className="section">
        <h2>Stakeholders</h2>
        <Table
          headers={["Role", "Organization", "Influence", "Interest", "Engagement", "Cadence"]}
          rows={item.stakeholders.map((row) => [row.roleName, row.organization, row.influence, row.interest, row.engagement, row.cadence])}
        />
      </section>

      <section className="section" id="raci">
        <h2>RACI</h2>
        <Table
          headers={["Phase", "Activity", "Area", "R", "A", "C", "I"]}
          rows={item.raci.map((row) => [
            phaseLabel(row.phase),
            row.activity,
            knowledgeLabel(row.knowledgeArea),
            row.responsible.join(", "),
            row.accountable,
            (row.consulted || []).join(", "),
            (row.informed || []).join(", "),
          ])}
        />
      </section>

      <section className="section" id="wbs">
        <h2>WBS</h2>
        <Table
          headers={["Code", "Phase", "Task", "Owner", "Duration", "Deliverable", "Acceptance"]}
          rows={item.wbs.map((row) => [
            row.wbsCode,
            phaseLabel(row.phase),
            row.name,
            row.ownerRole,
            dayBand(row.durationDaysLow, row.durationDaysHigh),
            row.deliverable,
            row.acceptance,
          ])}
        />
        <h3>Milestones</h3>
        <ul className="clean">
          {item.milestones.map((row) => (
            <li key={row.name}>{row.name} · After kickoff {weekBand(row.weekOffsetLow, row.weekOffsetHigh)} · {row.criteria}</li>
          ))}
        </ul>
      </section>

      <section className="section" id="risks">
        <h2>Risks and issues</h2>
        <Table
          headers={["Code", "Risk", "Category", "P", "I", "Score", "Response", "Mitigation", "Owner"]}
          rows={item.risks.map((row) => [
            row.riskCode,
            row.title,
            row.category,
            String(row.probability),
            String(row.impact),
            String(row.probability * row.impact),
            row.response,
            row.mitigation,
            row.ownerRole,
          ])}
          rowClass={(row) => Number(row[5]) >= 15 ? "high" : ""}
        />
        <h3>Issues</h3>
        <ul className="clean">{item.issues.map((row) => <li key={row.issueCode}>{row.issueCode} [{row.status}] {row.title} — {row.nextAction}</li>)}</ul>
        <h3>KPI</h3>
        <Table
          headers={["Name", "Baseline", "Target", "Method", "Owner"]}
          rows={item.kpis.map((row) => [row.name, row.baseline, `${row.target} ${row.unit}`, row.method, row.ownerRole])}
        />
      </section>

      <section className="section" id="cost">
        <h2>Cost, procurement, and quality</h2>
        <Table
          headers={["Item", "Type", "Band", "Notes"]}
          rows={item.costs.map((row) => [row.name, row.costType, usdBand(row.lowUsd, row.highUsd), row.notes])}
        />
        <h3>Quality gates</h3>
        <ul className="clean">{item.qualityGates.map((row) => <li key={row.name}>{phaseLabel(row.phase)} · {row.name}: {row.criteria} ({row.ownerRole})</li>)}</ul>
        <h3>Communications</h3>
        <ul className="clean">{item.communications.map((row) => <li key={row.audience}>{row.audience} / {row.channel} / {row.cadence}: {row.message}</li>)}</ul>
        <h3>Procurement</h3>
        <ul className="clean">{item.procurement.map((row) => <li key={row.item}>{row.item} · {row.vendorType} · {row.strategy} · Lead {row.leadWeeks} weeks. {row.notes}</li>)}</ul>
        <h3>Decisions</h3>
        <ul className="clean">{item.decisions.map((row) => <li key={row.decisionCode}>{row.decisionCode} {row.title}: {row.choice} {row.rationale}</li>)}</ul>
        <h3>Lessons and benefits</h3>
        <ul className="clean">
          {item.lessons.map((row) => <li key={row.statement}>{row.theme}: {row.statement}</li>)}
          {item.benefits.map((row) => <li key={row.name}>{row.name} — {row.measure} ({row.beneficiary}, {row.timing})</li>)}
        </ul>
      </section>

      <section className="section" id="sources">
        <h2>Sources</h2>
        <ul className="clean">
          {item.sourceUrls.map((source) => {
            const href = safeHttpsUrl(source.url);
            return (
              <li key={source.url}>
                {href ? <a href={href}>{source.title}</a> : source.title}
                {" "}· {source.publisher} {source.publishedOn || ""}
              </li>
            );
          })}
        </ul>
        {safeHttpsUrl(item.videoUrl) ? (
          <p>Demo video: <a href={safeHttpsUrl(item.videoUrl)}>{item.videoTitle || item.videoUrl}</a></p>
        ) : null}
      </section>
    </article>
  );
}
