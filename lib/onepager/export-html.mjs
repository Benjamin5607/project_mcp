import { assertExportable } from "./review.mjs";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatKualaLumpur(iso) {
  const value = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${value} (말레이시아)`;
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

export function renderReport(doc) {
  const approved = `${doc.approval.reviewer} · ${formatKualaLumpur(doc.approval.at)}`;
  const references = doc.references
    .map((item) => {
      const video = item.videoUrl ? ` <a href="${escapeHtml(item.videoUrl)}">공개 영상</a>` : "";
      return `<article><h3>${escapeHtml(item.caseCode)} ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.fidelityLabel)} · ${escapeHtml(item.why)}</p><p>${escapeHtml(item.excerpt)}</p>${video}</article>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="ko">
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
      <div class="meta">
        <span class="pill">PM 승인 · ${escapeHtml(approved)}</span>
        <span class="pill">${escapeHtml(doc.specialist.persona)} · ${escapeHtml(doc.specialist.authoringModelLabel)}</span>
        <span class="pill">${escapeHtml(doc.solution.primaryCaseCode)}</span>
      </div>
    </div>
  </header>
  <div class="page">
    <div class="grid">
      <article>
        <h2>고객 맥락</h2>
        <h3>페인포인트</h3>
        <p>${escapeHtml(doc.pain)}</p>
        <h3>특별 요구사항</h3>
        <p>${escapeHtml(doc.requirements)}</p>
        ${paragraphs(doc.executiveSummary)}
      </article>
      <aside class="solution">
        <h2>${escapeHtml(doc.solution.name)}</h2>
        <p>${escapeHtml(doc.solution.summary)}</p>
        <h3>왜 이 구성인가</h3>
        ${list(doc.solution.fit)}
        ${doc.solution.conflicts.length ? `<h3>빼 둔 것</h3>${list(doc.solution.conflicts)}` : ""}
        <p>리드타임 ${escapeHtml(doc.lead)} · 수행 ${escapeHtml(doc.schedule.label)}</p>
        <p>${escapeHtml(doc.schedule.note)}</p>
      </aside>
    </div>
    <div class="stack">
      <section class="block">
        <h2>구성</h2>
        ${table(["이름", "내용"], doc.solution.components.map((item) => [item.name, item.detail]))}
      </section>
      <section class="block">
        <h2>이해관계자</h2>
        ${table(
          ["역할", "관심", "참여", "리듬"],
          doc.stakeholders.map((item) => [item.roleName, item.interest, item.engagement, item.cadence]),
        )}
      </section>
      <section class="block">
        <h2>RACI</h2>
        <p>Accountable은 활동마다 한 역할입니다.</p>
        ${table(
          ["활동", "단계", "A", "R", "C", "I"],
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
        <h2>자원과 일정</h2>
        ${table(["구분", "항목", "수량", "메모"], doc.resources.map((item) => [item.kind, item.name, item.amount, item.notes]))}
        <h3>마일스톤</h3>
        ${table(["이름", "시점", "기준"], doc.milestones.map((item) => [item.name, item.when, item.criteria]))}
      </section>
      <section class="block">
        <h2>범위</h2>
        <div class="grid">
          <div><h3>포함</h3>${list(doc.scopeIn)}</div>
          <div><h3>제외</h3>${list(doc.scopeOut)}</div>
        </div>
      </section>
      <section class="block">
        <h2>리스크와 결정</h2>
        ${table(
          ["코드", "리스크", "점수", "완화", "소유"],
          doc.risks.map((item) => [item.code, item.title, item.score ?? "—", item.mitigation, item.owner]),
        )}
        <h3>결정할 것</h3>
        ${table(["코드", "결정", "선택", "소유"], doc.decisions.map((item) => [item.code, item.title, item.choice, item.owner]))}
      </section>
      <section class="block">
        <h2>성공 기준과 원가 밴드</h2>
        ${table(["지표", "기준", "목표", "측정"], doc.kpis.map((item) => [item.name, item.baseline, item.target, item.method]))}
        <h3>이 파일럿의 원가 표기</h3>
        ${table(["항목", "밴드", "메모"], doc.costs.map((item) => [item.name, item.band, item.notes]))}
        <h3>참고 사례의 계획 밴드</h3>
        ${table(["사례", "밴드", "메모"], doc.referenceBands.map((item) => [`${item.caseCode} ${item.title}`, item.band, item.note]))}
      </section>
      <section class="block">
        <h2>품질 게이트와 의사소통</h2>
        ${table(["단계", "게이트", "기준", "소유"], doc.qualityGates.map((item) => [item.phase, item.name, item.criteria, item.owner]))}
        ${table(["대상", "메시지", "리듬", "소유"], doc.communications.map((item) => [item.audience, item.message, item.cadence, item.owner]))}
      </section>
      <section class="block">
        <h2>참고한 사례</h2>
        <div class="stack">${references}</div>
        ${doc.rejected.length ? `<h3>본안에서 뺀 사례</h3>${list(doc.rejected.map((item) => `${item.caseCode} ${item.title}: ${item.reason}`))}` : ""}
      </section>
      <section class="block">
        <h2>모델 선정</h2>
        <p>${escapeHtml(doc.specialist.reason)}</p>
        ${table(["모델", "점수", "메모"], doc.specialist.considered.map((item) => [item.label, String(item.score), item.note]))}
      </section>
      <section class="block">
        <h2>가정과 검토 기록</h2>
        ${list(doc.assumptions)}
        ${table(
          ["시각", "동작", "사람", "내용"],
          doc.reviews.map((item) => [formatKualaLumpur(item.at), item.action, item.author, item.text]),
        )}
      </section>
      <p class="note">${escapeHtml(doc.disclaimer)}</p>
      <p><button type="button" onclick="print()">인쇄 / PDF</button></p>
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

export function renderSlides(doc) {
  const foot = `${doc.customerLabel} · ${doc.solution.primaryCaseCode} · 계획 밴드 · PM 승인 ${doc.approval.reviewer}`;
  const slides = [
    slide("01  표지", doc.headline, `<p>${escapeHtml(doc.solution.name)}</p><p>${escapeHtml(doc.specialist.persona)} · ${escapeHtml(doc.specialist.authoringModelLabel)}</p>`, foot),
    slide(
      "02  페인포인트",
      "무엇을 풀려는가",
      `<h2>페인포인트</h2><p>${escapeHtml(doc.pain)}</p><h2>특별 요구</h2><p>${escapeHtml(doc.requirements)}</p>`,
      foot,
    ),
    slide(
      "03  스페셜리스트",
      doc.specialist.authoringModelLabel,
      `<ul>${doc.specialist.considered.slice(0, 4).map((item) => `<li>${escapeHtml(item.label)} · ${escapeHtml(String(item.score))} · ${escapeHtml(item.note)}</li>`).join("")}</ul><p>${escapeHtml(doc.specialist.reason)}</p>`,
      foot,
    ),
    slide(
      "04  기술 솔루션",
      doc.solution.name,
      `<ul>${doc.solution.components.slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.detail)}</li>`).join("")}</ul>`,
      foot,
    ),
    slide(
      "05  참고 사례",
      "케이스 뱅크에서 고른 사례",
      `<ul>${doc.references.map((item) => `<li>${escapeHtml(item.caseCode)} ${escapeHtml(item.title)} — ${escapeHtml(item.why)}</li>`).join("")}</ul>`,
      foot,
    ),
    slide(
      "06  RACI",
      "역할은 한 명의 Accountable",
      `<ul>${doc.stakeholders.slice(0, 4).map((item) => `<li>${escapeHtml(item.roleName)} · ${escapeHtml(item.engagement)}</li>`).join("")}</ul><ul>${doc.raci.slice(0, 5).map((item) => `<li>${escapeHtml(item.activity)} — A ${escapeHtml(item.accountable)}</li>`).join("")}</ul>`,
      foot,
    ),
    slide(
      "07  자원",
      `${doc.schedule.label} 계획 밴드`,
      `<ul>${doc.resources.slice(0, 6).map((item) => `<li>${escapeHtml(item.name)} · ${escapeHtml(item.amount)}</li>`).join("")}</ul><p>${escapeHtml(doc.schedule.note)}</p>`,
      foot,
    ),
    slide(
      "08  승인",
      "리스크, 결정, 다음 승인",
      `<ul>${doc.risks.slice(0, 3).map((item) => `<li>${escapeHtml(item.title)} — ${escapeHtml(item.mitigation)}</li>`).join("")}</ul><ul>${doc.decisions.slice(0, 3).map((item) => `<li>${escapeHtml(item.title)}: ${escapeHtml(item.choice)}</li>`).join("")}</ul><p>승인 ${escapeHtml(doc.approval.reviewer)} · ${escapeHtml(formatKualaLumpur(doc.approval.at))}</p>`,
      foot,
    ),
  ];
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(doc.headline)} 슬라이드</title>
  <style>${SLIDE_CSS}</style>
</head>
<body>
  <main class="deck" id="deck">${slides.join("")}</main>
  <div class="controls">
    <button type="button" id="prev">이전</button>
    <span id="count"></span>
    <button type="button" id="next">다음</button>
    <button type="button" onclick="print()">인쇄 / PDF</button>
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
  const error = new Error("report 또는 slides만 내보낼 수 있습니다.");
  error.status = 400;
  throw error;
}
