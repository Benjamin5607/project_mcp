import { assertExportable } from "./review-core.mjs";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatKualaLumpur(iso) {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${value} (Malaysia, UTC+8)`;
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("");
}

function table(headers, rows) {
  const head = headers.map((item) => `<th>${escapeHtml(item)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function raciMark(row, party) {
  const marks = [];
  if ((row.responsible || []).includes(party)) marks.push("R");
  if (row.accountable === party) marks.push("A");
  if ((row.consulted || []).includes(party)) marks.push("C");
  if ((row.informed || []).includes(party)) marks.push("I");
  return marks.join(" / ") || "—";
}

function raciMatrix(doc) {
  const parties = (doc.governance?.parties || []).map((item) => item.party).filter(Boolean).slice(0, 4);
  if (!parties.length || !Array.isArray(doc.raci)) return "";
  return table(
    ["Deliverable", ...parties],
    doc.raci.map((row) => [row.activity, ...parties.map((party) => raciMark(row, party))]),
  );
}

const REPORT_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c1914; background: #f3efe4; font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; line-height: 1.5; }
  .page { max-width: 980px; margin: 0 auto; padding: 28px 22px 64px; }
  header.mast { background: #0e2438; color: #f6f1e6; padding: 28px 22px 22px; }
  header.mast .inner { max-width: 980px; margin: 0 auto; }
  .kicker { letter-spacing: 0.16em; text-transform: uppercase; font-size: 12px; color: #8fd0c8; margin: 0 0 8px; }
  h1, h2, h3 { font-family: Palatino, "Iowan Old Style", "Apple SD Gothic Neo", serif; font-weight: 600; letter-spacing: -0.03em; line-height: 1.25; word-break: keep-all; }
  h1 { font-size: 40px; margin: 0 0 10px; }
  h2 { font-size: 26px; margin: 0 0 8px; }
  h3 { font-size: 18px; margin: 0 0 6px; }
  .meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .pill { border: 1px solid rgba(246,241,230,0.3); border-radius: 999px; padding: 4px 10px; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 14px; margin-top: 16px; }
  article, aside, section.block { background: #fffdf8; border: 1px solid #d9d0c0; border-radius: 16px; padding: 16px 18px; }
  .solution { background: #16324f; color: #f6f1e6; }
  .solution h2, .solution h3 { color: #f2d48a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 8px; border-bottom: 1px solid #e5dccb; word-break: keep-all; }
  th { background: #f6f1e6; }
  ul { margin: 0; padding-left: 18px; }
  .stack { display: grid; gap: 14px; margin-top: 14px; }
  .note { background: #f8f1e2; border-left: 3px solid #8a6424; padding: 10px 12px; }
  button { border: 0; background: #16324f; color: white; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
  @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  @media print {
    body { background: white; }
    header.mast { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; }
    button { display: none; }
    article, aside, section.block { break-inside: avoid; }
  }
`;

function labels(doc) {
  if (doc.language === "ko") {
    return {
      approved: "PM 승인", context: "고객 맥락", pain: "페인포인트", requirements: "특별 요구사항", why: "왜 이 구성인가",
      dropped: "빼 둔 것", lead: "리드타임", run: "수행", components: "구성", colName: "이름", colDetail: "내용",
      stakeholders: "이해관계자", role: "역할", interest: "관심", influence: "영향", engagement: "참여", cadence: "리듬",
      raci: "RACI", raciNote: "Accountable은 활동마다 한 역할입니다.", activity: "활동", phase: "단계",
      resources: "필요 자원", kind: "구분", item: "항목", amount: "수량", notes: "메모", milestones: "마일스톤",
      when: "시점", criteria: "기준", scope: "범위", inn: "포함", out: "제외", risks: "리스크와 결정",
      code: "코드", risk: "리스크", score: "점수", mitigation: "완화", owner: "소유", decide: "결정할 것",
      decision: "결정", choice: "선택", success: "성공 기준과 원가 밴드", metric: "지표", baseline: "기준선",
      target: "목표", method: "측정", cost: "이 파일럿의 원가 표기", band: "밴드", refBands: "참고 사례의 계획 밴드",
      case: "사례", gates: "품질 게이트와 의사소통", gate: "게이트", audience: "대상", message: "메시지",
      refs: "참고한 사례", removed: "본안에서 뺀 사례", model: "모델 선정", assumptions: "가정과 검토 기록",
      time: "시각", action: "동작", person: "사람", text: "내용", print: "인쇄 / PDF", video: "공개 영상",
      prev: "이전", next: "다음", foot: "계획 밴드", approval: "PM 승인", slides: "슬라이드",
      ask: "스폰서에게 묻는 결정", painTitle: "무엇을 풀려는가", solution: "기술 솔루션", schedule: "일정",
      close: "리스크와 결정",
      goals: "프로젝트 목표", pass: "통과 기준", rollout: "단계별 롤아웃과 폴백", protocol: "수행", fallback: "폴백",
      governance: "RACI와 벤더 거버넌스", party: "당사자", side: "소속", seat: "자리",
      outcomes: "기대 결과", evidence: "근거", postmortem: "포스트모텀", learning: "종료 때 적을 러닝 포인트", purpose: "목적", lead: "리드",
      measurement: "성공 측정",
    };
  }
  return {
    approved: "PM approval", context: "Charter context", pain: "Pain", requirements: "Constraints", why: "Why this shape",
    dropped: "Left out", lead: "Lead time", run: "Duration", components: "Components", colName: "Name", colDetail: "Detail",
    stakeholders: "Stakeholders", role: "Role", interest: "Interest", influence: "Influence", engagement: "Engagement", cadence: "Cadence",
    raci: "RACI", raciNote: "Accountable is exactly one role.", activity: "Activity", phase: "Phase",
    resources: "Resources required", kind: "Type", item: "Item", amount: "Quantity", notes: "Notes", milestones: "Milestones",
    when: "When", criteria: "Criteria", scope: "Scope", inn: "In", out: "Out", risks: "Risks and decisions",
    code: "Code", risk: "Risk", score: "Score", mitigation: "Response", owner: "Owner", decide: "Decisions",
    decision: "Decision", choice: "Choice", success: "Success measures and cost bands", metric: "Measure", baseline: "Baseline",
    target: "Target", method: "Method", cost: "Cost language for this pilot", band: "Band", refBands: "Reference-case planning bands",
    case: "Case", gates: "Quality gates and communication", gate: "Gate", audience: "Audience", message: "Message",
    refs: "Reference cases", removed: "Dropped from the proposal", model: "Model selection", assumptions: "Assumptions and review log",
    time: "Time", action: "Action", person: "Person", text: "Note", print: "Print / PDF", video: "Public video",
    prev: "Previous", next: "Next", foot: "Planning band, not a quote", approval: "PM approval", slides: "slides",
    ask: "Decision asked of the sponsor", painTitle: "Pain and constraints", solution: "Recommendation", schedule: "Schedule",
    close: "Risks and decisions",
    goals: "Project goals", pass: "Pass rule", rollout: "Phased rollout and fallback", protocol: "Protocol", fallback: "Fallback",
    governance: "RACI and vendor governance", party: "Party", side: "Side", seat: "Seat",
    outcomes: "Expected outcomes", evidence: "Evidence", postmortem: "Postmortem", learning: "Learning points to write at close", purpose: "Purpose", lead: "Lead",
    measurement: "Success measurement",
  };
}

export function renderReport(doc) {
  const t = labels(doc);
  const approved = `${doc.approval.reviewer} · ${formatKualaLumpur(doc.approval.at)}`;
  const references = doc.references
    .map((item) => {
      const video = item.videoUrl ? ` <a href="${escapeHtml(item.videoUrl)}">${escapeHtml(t.video)}</a>` : "";
      return `<article><h3>${escapeHtml(item.caseCode)} ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.fidelityLabel)} · ${escapeHtml(item.why)}</p><p>${escapeHtml(item.excerpt)}</p>${video}</article>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="${doc.language === "ko" ? "ko" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(doc.headline)}</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <header class="mast">
    <div class="inner">
      <p class="kicker">AI project one-pager</p>
      <h1>${escapeHtml(doc.headline)}</h1>
      ${doc.header ? `<p>${escapeHtml(doc.header.customerProfile)} · ${escapeHtml(doc.header.classification)}</p><p>${escapeHtml(t.lead)}: ${escapeHtml(doc.header.leadRole)}</p>` : ""}
      <div class="meta">
        <span class="pill">${escapeHtml(t.approved)} · ${escapeHtml(approved)}</span>
        <span class="pill">${escapeHtml(doc.specialist.persona)} · ${escapeHtml(doc.specialist.authoringModelLabel)}</span>
        <span class="pill">${escapeHtml(doc.solution.primaryCaseCode)}</span>
      </div>
    </div>
  </header>
  <div class="page">
    <div class="grid">
      <article>
        <h2>${escapeHtml(t.context)}</h2>
        <h3>${escapeHtml(t.pain)}</h3>
        <p>${escapeHtml(doc.pain)}</p>
        <h3>${escapeHtml(t.requirements)}</h3>
        <p>${escapeHtml(doc.requirements)}</p>
        ${paragraphs(doc.executiveSummary)}
      </article>
      <aside class="solution">
        <h2>${escapeHtml(doc.solution.name)}</h2>
        <p>${escapeHtml(doc.solution.summary)}</p>
        <h3>${escapeHtml(t.why)}</h3>
        ${list(doc.solution.fit)}
        ${doc.solution.conflicts.length ? `<h3>${escapeHtml(t.dropped)}</h3>${list(doc.solution.conflicts)}` : ""}
        <p>${escapeHtml(t.lead)} ${escapeHtml(doc.lead)} · ${escapeHtml(t.run)} ${escapeHtml(doc.schedule.label)}</p>
        <p>${escapeHtml(doc.schedule.note)}</p>
      </aside>
    </div>
    <div class="stack">
      <section class="block">
        <h2>${escapeHtml(t.stakeholders)}</h2>
        ${table(
          [t.role, t.interest, t.influence, t.engagement, t.cadence],
          doc.stakeholders.map((item) => [item.roleName, item.interest, item.influence, item.engagement, item.cadence]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.raci)}</h2>
        <p>${escapeHtml(t.raciNote)}</p>
        ${table(
          [t.activity, t.phase, "A", "R", "C", "I"],
          doc.raci.map((item) => [
            item.activity,
            item.phase,
            item.accountable,
            item.responsible.join(", "),
            item.consulted.join(", "),
            item.informed.join(", "),
          ]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.governance)}</h2>
        <p>${escapeHtml(doc.governance?.note || "")}</p>
        ${table(
          [t.party, t.side, t.seat],
          (doc.governance?.parties || []).map((item) => [item.party, item.side, item.seat]),
        )}
        ${raciMatrix(doc)}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.goals)}</h2>
        ${table(
          [t.code, t.goals, t.owner],
          (doc.goals || []).map((item) => [item.code, item.statement, item.owner]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.rollout)}</h2>
        ${table(
          [t.phase, t.protocol, t.pass, t.fallback],
          (doc.rollout || []).map((item) => [item.phase, item.protocol, item.success, item.fallback]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.measurement)}</h2>
        ${table(
          [t.metric, t.baseline, t.pass, t.method, t.owner],
          (doc.successMeasures || []).map((item) => [item.name, item.baseline, item.target, item.method, item.owner]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.outcomes)}</h2>
        <p>${escapeHtml(doc.language === "ko" ? "기대 결과이며, 이미 달성한 실적이 아닙니다." : "Expected. Not a result already achieved.")}</p>
        ${table(
          [t.outcomes, t.evidence],
          (doc.expectedOutcomes || []).map((item) => [item.outcome, item.evidence]),
        )}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.postmortem)}</h2>
        <p>${escapeHtml(doc.postmortem?.when || "")} · ${escapeHtml(doc.postmortem?.owner || "")}</p>
        <p>${escapeHtml(doc.postmortem?.purpose || "")}</p>
        <h3>${escapeHtml(t.learning)}</h3>
        ${list(doc.postmortem?.questions || [])}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.components)}</h2>
        ${table([t.colName, t.colDetail], doc.solution.components.map((item) => [item.name, item.detail]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.resources)}</h2>
        ${table([t.kind, t.item, t.amount, t.notes], doc.resources.map((item) => [item.kind, item.name, item.amount, item.notes]))}
        <h3>${escapeHtml(t.milestones)}</h3>
        ${table([t.colName, t.when, t.criteria], doc.milestones.map((item) => [item.name, item.when, item.criteria]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.scope)}</h2>
        <div class="grid">
          <div><h3>${escapeHtml(t.inn)}</h3>${list(doc.scopeIn)}</div>
          <div><h3>${escapeHtml(t.out)}</h3>${list(doc.scopeOut)}</div>
        </div>
      </section>
      <section class="block">
        <h2>${escapeHtml(t.risks)}</h2>
        ${table(
          [t.code, t.risk, t.score, t.mitigation, t.owner],
          doc.risks.map((item) => [item.code, item.title, item.score ?? "—", item.mitigation, item.owner]),
        )}
        <h3>${escapeHtml(t.decide)}</h3>
        ${table([t.code, t.decision, t.choice, t.owner], doc.decisions.map((item) => [item.code, item.title, item.choice, item.owner]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.success)}</h2>
        ${table([t.metric, t.baseline, t.target, t.method], doc.kpis.map((item) => [item.name, item.baseline, item.target, item.method]))}
        <h3>${escapeHtml(t.cost)}</h3>
        ${table([t.item, t.band, t.notes], doc.costs.map((item) => [item.name, item.band, item.notes]))}
        <h3>${escapeHtml(t.refBands)}</h3>
        ${table([t.case, t.band, t.notes], doc.referenceBands.map((item) => [`${item.caseCode} ${item.title}`, item.band, item.note]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.gates)}</h2>
        ${table([t.phase, t.gate, t.criteria, t.owner], doc.qualityGates.map((item) => [item.phase, item.name, item.criteria, item.owner]))}
        ${table([t.audience, t.message, t.cadence, t.owner], doc.communications.map((item) => [item.audience, item.message, item.cadence, item.owner]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.refs)}</h2>
        <div class="stack">${references}</div>
        ${doc.rejected.length ? `<h3>${escapeHtml(t.removed)}</h3>${list(doc.rejected.map((item) => `${item.caseCode} ${item.title}: ${item.reason}`))}` : ""}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.model)}</h2>
        <p>${escapeHtml(doc.specialist.reason)}</p>
        ${table([t.model, t.score, t.notes], doc.specialist.considered.map((item) => [item.label, String(item.score), item.note]))}
      </section>
      <section class="block">
        <h2>${escapeHtml(t.assumptions)}</h2>
        ${list(doc.assumptions)}
        ${table(
          [t.time, t.action, t.person, t.text],
          doc.reviews.map((item) => [formatKualaLumpur(item.at), item.action, item.author, item.text]),
        )}
      </section>
      <p class="note">${escapeHtml(doc.disclaimer)}</p>
      <p><button type="button" onclick="print()">${escapeHtml(t.print)}</button></p>
    </div>
  </div>
</body>
</html>`;
}

const SLIDE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: #0e2438; color: #f6f1e6; font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
  .deck { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px 84px; }
  .slide { display: none; width: min(1100px, 96vw); min-height: min(640px, 82vh); background: linear-gradient(160deg, #16324f, #0e2438 70%); border-radius: 22px; padding: 42px 48px; box-shadow: 0 24px 60px rgba(0,0,0,0.28); }
  .slide.active { display: flex; flex-direction: column; gap: 12px; }
  .kicker { letter-spacing: 0.16em; text-transform: uppercase; color: #8fd0c8; font-size: 12px; margin: 0; }
  h1 { font-family: Palatino, "Iowan Old Style", serif; font-size: clamp(32px, 4vw, 52px); line-height: 1.15; margin: 0; word-break: keep-all; }
  h2 { font-family: Palatino, "Iowan Old Style", serif; font-size: 28px; margin: 0; }
  ul { margin: 0; padding-left: 18px; font-size: 18px; }
  li { margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid rgba(246,241,230,0.22); }
  th { color: #8fd0c8; font-weight: 600; }
  .foot { margin-top: auto; color: #c9d5d2; font-size: 13px; }
  .controls { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: 10px; padding: 14px; background: rgba(14,36,56,0.92); }
  button { background: #f6f1e6; color: #16324f; border: 0; border-radius: 999px; padding: 8px 14px; cursor: pointer; font: inherit; }
  @media print {
    body { background: white; color: #1c1914; }
    .deck { display: block; padding: 0; }
    .slide, .slide.active { display: flex; break-after: page; width: auto; min-height: 100vh; border-radius: 0; background: white; color: #1c1914; box-shadow: none; }
    .controls { display: none; }
    .kicker { color: #0f6f6a; }
  }
`;

function slide(kicker, title, body, foot) {
  return `<section class="slide"><p class="kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1>${body}<p class="foot">${escapeHtml(foot)}</p></section>`;
}

function slideTable(headers, rows) {
  const head = headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function chunk(rows, size) {
  const pages = [];
  for (let index = 0; index < rows.length; index += size) pages.push(rows.slice(index, index + size));
  return pages.length ? pages : [[]];
}

export function renderSlides(doc) {
  const t = labels(doc);
  const foot = `${doc.customerLabel} · ${doc.solution.primaryCaseCode} · ${t.foot} · ${t.approval} ${doc.approval.reviewer}`;
  const asked = doc.decisions[0] ? `${doc.decisions[0].title}: ${doc.decisions[0].choice}` : t.ask;
  const slides = [
    slide("01", doc.headline, `<p>${escapeHtml(doc.solution.name)}</p><h2>${escapeHtml(t.ask)}</h2><p>${escapeHtml(asked)}</p><p>${escapeHtml(doc.specialist.persona)} · ${escapeHtml(doc.specialist.authoringModelLabel)}</p>`, foot),
    slide("02", t.painTitle, `<h2>${escapeHtml(t.pain)}</h2><p>${escapeHtml(doc.pain)}</p><h2>${escapeHtml(t.requirements)}</h2><p>${escapeHtml(doc.requirements)}</p>`, foot),
    slide("03", t.solution, `<h2>${escapeHtml(doc.solution.name)}</h2><ul>${doc.solution.components.map((item) => `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.detail)}</li>`).join("")}</ul>`, foot),
    slide("03b", t.goals, slideTable([t.code, t.goals, t.owner], (doc.goals || []).map((item) => [item.code, item.statement, item.owner])), foot),
    slide("03c", t.governance, `<p>${escapeHtml(doc.governance?.note || "")}</p>${raciMatrix(doc)}`, foot),
    slide("03d", t.rollout, slideTable([t.phase, t.protocol, t.pass, t.fallback], (doc.rollout || []).map((item) => [item.phase, item.protocol, item.success, item.fallback])), foot),
    slide("03e", t.outcomes, `${slideTable([t.outcomes, t.evidence], (doc.expectedOutcomes || []).map((item) => [item.outcome, item.evidence]))}<h2>${escapeHtml(t.postmortem)}</h2><p>${escapeHtml(doc.postmortem?.purpose || "")}</p>${list(doc.postmortem?.questions || [])}`, foot),
  ];
  chunk(doc.stakeholders, 7).forEach((rows, index) => {
    slides.push(slide(
      `04.${index + 1}`,
      t.stakeholders,
      slideTable(
        [t.role, t.interest, t.influence, t.engagement, t.cadence],
        rows.map((item) => [item.roleName, item.interest, item.influence, item.engagement, item.cadence]),
      ),
      foot,
    ));
  });
  chunk(doc.raci, 6).forEach((rows, index) => {
    slides.push(slide(
      `05.${index + 1}`,
      t.raci,
      `<p>${escapeHtml(t.raciNote)}</p>${slideTable(
        [t.activity, t.phase, "Accountable", "R", "C", "I"],
        rows.map((item) => [item.activity, item.phase, item.accountable, item.responsible.join(", "), item.consulted.join(", "), item.informed.join(", ")]),
      )}`,
      foot,
    ));
  });
  chunk(doc.resources, 8).forEach((rows, index) => {
    slides.push(slide(
      `06.${index + 1}`,
      t.resources,
      slideTable([t.kind, t.item, t.amount, t.notes], rows.map((item) => [item.kind, item.name, item.amount, item.notes])),
      foot,
    ));
  });
  slides.push(slide(
    "07",
    t.schedule,
    `${slideTable([t.colName, t.when, t.criteria], doc.milestones.map((item) => [item.name, item.when, item.criteria]))}<p>${escapeHtml(doc.schedule.label)}. ${escapeHtml(doc.schedule.note)}</p>`,
    foot,
  ));
  slides.push(slide(
    "08",
    t.close,
    `${slideTable([t.code, t.risk, t.owner], doc.risks.map((item) => [item.code, item.title, item.owner]))}${slideTable([t.code, t.choice, t.owner], doc.decisions.map((item) => [item.code, item.choice, item.owner]))}<p>${escapeHtml(t.approval)} ${escapeHtml(doc.approval.reviewer)} · ${escapeHtml(formatKualaLumpur(doc.approval.at))}</p>`,
    foot,
  ));
  slides.push(slide(
    "09",
    t.refs,
    `<ul>${doc.references.map((item) => `<li>${escapeHtml(item.caseCode)} ${escapeHtml(item.title)} — ${escapeHtml(item.why)}</li>`).join("")}</ul>${doc.rejected.length ? `<ul>${doc.rejected.map((item) => `<li>${escapeHtml(item.caseCode)} ${escapeHtml(item.reason)}</li>`).join("")}</ul>` : ""}`,
    foot,
  ));
  return `<!DOCTYPE html>
<html lang="${doc.language === "ko" ? "ko" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(doc.headline)} ${escapeHtml(t.slides)}</title>
  <style>${SLIDE_CSS}</style>
</head>
<body>
  <main class="deck" id="deck">${slides.join("")}</main>
  <div class="controls">
    <button type="button" id="prev">${escapeHtml(t.prev)}</button>
    <span id="count"></span>
    <button type="button" id="next">${escapeHtml(t.next)}</button>
    <button type="button" onclick="print()">${escapeHtml(t.print)}</button>
  </div>
  <script>
    const slides = [...document.querySelectorAll(".slide")];
    let index = 0;
    const count = document.getElementById("count");
    function show(next) {
      index = Math.max(0, Math.min(slides.length - 1, next));
      slides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === index));
      count.textContent = (index + 1) + " / " + slides.length;
    }
    document.getElementById("prev").addEventListener("click", () => show(index - 1));
    document.getElementById("next").addEventListener("click", () => show(index + 1));
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "ArrowLeft") show(index - 1);
    });
    show(0);
  </script>
</body>
</html>`;
}

export function renderExport(doc, kind) {
  assertExportable(doc);
  if (kind === "report") return renderReport(doc);
  if (kind === "slides") return renderSlides(doc);
  const error = new Error("Only report or slides can be exported.");
  error.status = 400;
  throw error;
}
