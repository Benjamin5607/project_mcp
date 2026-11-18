import Link from "next/link";
import { usdBand, weekBand, dayBand, safeHttpsUrl } from "../lib/format.mjs";
import { knowledgeLabel, phaseLabel } from "../lib/taxonomy.mjs";

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
  const ask = `/ask?q=${encodeURIComponent(`${item.title} 사례로 RACI와 WBS 초안을 작성해 줘`)}`;
  return (
    <article className="case-hero">
      <p className="kicker">{item.caseCode}</p>
      <div className="row">
        <span className={item.fidelity === "primary_source" ? "badge teal" : "badge gold"}>
          {item.fidelity === "primary_source" ? "공개 출처" : "계획 시나리오"}
        </span>
        <span className="badge">{item.industryLabel}</span>
        <span className="badge">{item.customerSegmentLabel}</span>
        <span className="badge">{item.region}</span>
      </div>
      <h1>{item.title}</h1>
      <p className="lede">{item.titleEn}</p>
      <div className="anchor-nav no-print">
        {["overview", "scope", "raci", "wbs", "risks", "cost", "sources"].map((id) => (
          <a key={id} href={`#${id}`}>{id}</a>
        ))}
        <Link href={ask}>이 사례로 초안</Link>
      </div>
      <div className="band" id="overview">
        <strong>읽는 법. </strong>
        {item.fidelityNote} {item.planningBandNote}
      </div>
      <div className="facts">
        <div className="fact"><span>수행</span>{weekBand(item.durationWeeksLow, item.durationWeeksHigh)}</div>
        <div className="fact"><span>리드타임</span>{weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}</div>
        <div className="fact"><span>1차년도 계획 밴드</span>{usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)} ({item.dealSizeBand})</div>
        <div className="fact"><span>복잡도</span>{item.complexity}</div>
      </div>
      <p>{item.executiveSummary}</p>
      <p>{item.problemStatement}</p>
      <p>{item.opportunity}</p>
      <p>{item.businessValue}</p>
      <p className="meta">배치: {item.deploymentModelLabel}. {item.architecturePattern}</p>
      <p className="meta">솔루션: {item.ciscoSolutions.join(", ")}</p>
      {item.partnerTechnologies.length ? <p className="meta">파트너: {item.partnerTechnologies.join(", ")}</p> : null}
      <p className="meta">규제·기준: {item.regulatoryContext.join(", ")}</p>

      {(item.narrative || []).map((section) => (
        <section className="section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.split(/\n{2,}/).map((paragraph, index) => <p key={`${section.heading}-${index}`}>{paragraph}</p>)}
        </section>
      ))}

      <section className="section" id="scope">
        <h2>범위</h2>
        <div className="split">
          <div className="panel"><h3>포함</h3><ul className="clean">{item.scopeIn.map((line) => <li key={line}>{line}</li>)}</ul></div>
          <div className="panel"><h3>제외</h3><ul className="clean">{item.scopeOut.map((line) => <li key={line}>{line}</li>)}</ul></div>
        </div>
        <h3>가정</h3>
        <ul className="clean">{item.assumptions.map((row) => <li key={row.statement}>{row.statement} — {row.ownerRole} ({row.status})</li>)}</ul>
        <h3>제약</h3>
        <ul className="clean">{item.constraints.map((row) => <li key={row.statement}>[{row.type}] {row.statement}</li>)}</ul>
        <h3>성공 기준</h3>
        <ul className="clean">{item.successCriteria.map((line) => <li key={line}>{line}</li>)}</ul>
        <h3>요구사항</h3>
        <Table
          headers={["코드", "영역", "우선", "요구", "수용"]}
          rows={item.requirements.map((row) => [row.reqCode, knowledgeLabel(row.knowledgeArea), row.priority, row.statement, row.acceptance])}
        />
      </section>

      <section className="section">
        <h2>이해관계자</h2>
        <Table
          headers={["역할", "조직", "영향", "관심", "참여", "리듬"]}
          rows={item.stakeholders.map((row) => [row.roleName, row.organization, row.influence, row.interest, row.engagement, row.cadence])}
        />
      </section>

      <section className="section" id="raci">
        <h2>RACI</h2>
        <Table
          headers={["단계", "활동", "영역", "R", "A", "C", "I"]}
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
          headers={["코드", "단계", "작업", "소유", "기간", "산출물", "수용"]}
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
        <h3>마일스톤</h3>
        <ul className="clean">
          {item.milestones.map((row) => (
            <li key={row.name}>{row.name} · 착수 후 {weekBand(row.weekOffsetLow, row.weekOffsetHigh)} · {row.criteria}</li>
          ))}
        </ul>
      </section>

      <section className="section" id="risks">
        <h2>리스크와 이슈</h2>
        <Table
          headers={["코드", "위험", "분류", "P", "I", "점수", "대응", "완화", "소유"]}
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
        <h3>이슈</h3>
        <ul className="clean">{item.issues.map((row) => <li key={row.issueCode}>{row.issueCode} [{row.status}] {row.title} — {row.nextAction}</li>)}</ul>
        <h3>KPI</h3>
        <Table
          headers={["이름", "기준", "목표", "방법", "소유"]}
          rows={item.kpis.map((row) => [row.name, row.baseline, `${row.target} ${row.unit}`, row.method, row.ownerRole])}
        />
      </section>

      <section className="section" id="cost">
        <h2>원가, 조달, 품질</h2>
        <Table
          headers={["항목", "유형", "밴드", "메모"]}
          rows={item.costs.map((row) => [row.name, row.costType, usdBand(row.lowUsd, row.highUsd), row.notes])}
        />
        <h3>품질 게이트</h3>
        <ul className="clean">{item.qualityGates.map((row) => <li key={row.name}>{phaseLabel(row.phase)} · {row.name}: {row.criteria} ({row.ownerRole})</li>)}</ul>
        <h3>의사소통</h3>
        <ul className="clean">{item.communications.map((row) => <li key={row.audience}>{row.audience} / {row.channel} / {row.cadence}: {row.message}</li>)}</ul>
        <h3>조달</h3>
        <ul className="clean">{item.procurement.map((row) => <li key={row.item}>{row.item} · {row.vendorType} · {row.strategy} · 리드 {row.leadWeeks}주. {row.notes}</li>)}</ul>
        <h3>의사결정</h3>
        <ul className="clean">{item.decisions.map((row) => <li key={row.decisionCode}>{row.decisionCode} {row.title}: {row.choice} {row.rationale}</li>)}</ul>
        <h3>교훈과 편익</h3>
        <ul className="clean">
          {item.lessons.map((row) => <li key={row.statement}>{row.theme}: {row.statement}</li>)}
          {item.benefits.map((row) => <li key={row.name}>{row.name} — {row.measure} ({row.beneficiary}, {row.timing})</li>)}
        </ul>
      </section>

      <section className="section" id="sources">
        <h2>출처</h2>
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
          <p>데모 영상: <a href={safeHttpsUrl(item.videoUrl)}>{item.videoTitle || item.videoUrl}</a></p>
        ) : null}
      </section>
    </article>
  );
}
