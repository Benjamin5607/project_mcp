"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { renderExport } from "../lib/onepager/export-html.mjs";
import { listLocalOnePagers, readLocalOnePager, saveLocalOnePager } from "../lib/onepager/local-docs.mjs";
import { reviewDocument } from "../lib/onepager/review-core.mjs";
import { requestDraft } from "../lib/onepager/remote-draft.mjs";

const EXAMPLES = {
  en: {
    language: "en",
    customerLabel: "Internal knowledge search",
    pain: "AI is too slow when it retrieves information from the database",
    requirements: "A public cloud connection is allowed. Use the specialist model to draft the retrieval pilot.",
  },
  ko: {
    language: "ko",
    customerLabel: "내부 지식검색",
    pain: "AI가 데이터베이스에서 정보를 찾아오는데 너무 느림",
    requirements: "퍼블릭 클라우드 연결은 허용한다. 스페셜리스트 모델로 검색 파일럿 초안을 작성한다.",
  },
};

function copy(language) {
  if (language === "ko") {
    return {
      title: "페인포인트에서 프로젝트 원페이저로",
      lede: "케이스 뱅크에서 참고 사례를 고르고, 서버가 NVIDIA_API_KEY로 스페셜리스트 모델을 호출해 요약을 다시 씁니다. 인트라넷·폐쇄망·클라우드 금지라고 적으면 원문은 이 브라우저에 남고 모델로 보내지 않습니다. PM이 승인하기 전에는 보고서와 슬라이드를 내려받지 않습니다.",
      language: "언어",
      customer: "고객 표시 이름",
      pain: "페인포인트",
      requirements: "특별 요구사항",
      drafting: "작성 중",
      draft: "초안 만들기",
      fill: "예시 채우기",
      recent: "최근 초안",
      empty: "아직 초안이 없습니다.",
      steps: ["입력", "모델", "사례", "솔루션", "PM 검토", "HTML"],
      waiting: "승인 대기",
      headline: "제목",
      summary: "요약",
      solution: "솔루션",
      components: "구성",
      in: "포함",
      out: "제외",
      stakeholders: "이해관계자",
      raci: "RACI",
      raciNote: "Accountable은 한 역할만 적습니다.",
      resources: "필요 자원",
      goals: "프로젝트 목표",
      measurement: "성공 측정",
      outcomes: "기대 결과",
      rollout: "단계별 롤아웃과 폴백",
      governance: "벤더 거버넌스",
      postmortem: "포스트모텀",
      learning: "러닝 포인트",
      risks: "리스크와 결정",
      assumptions: "가정",
      save: "수정 저장",
      review: "PM 검토",
      reviewer: "검토자",
      comment: "의견",
      request: "수정 요청",
      approve: "승인",
      reopen: "승인 철회",
      report: "보고서 HTML",
      slides: "슬라이드 HTML",
      locked: "PM이 승인하면 보고서와 슬라이드 HTML을 내려받을 수 있습니다.",
      log: "기록",
      noLog: "아직 검토 기록이 없습니다.",
      model: "모델",
      nvidia: "NVIDIA API에 연결됨",
      local: "로컬 페르소나로 연결됨",
      refs: "참고 사례",
      dropped: "은 제약 때문에 본안에서 뺐습니다.",
      role: "역할",
      interest: "관심",
      engagement: "참여",
      cadence: "리듬",
      activity: "활동",
      item: "항목",
      amount: "수량",
      notes: "메모",
      status: { draft: "초안", in_review: "검토 중", changes_requested: "수정 요청", approved: "승인됨" },
      action: { edit: "수정", start_review: "검토 시작", comment: "의견", request_changes: "수정 요청", approve: "승인", reopen: "철회" },
    };
  }
  return {
    title: "From a pain point to a project one-pager",
    lede: "The case bank supplies the reference pattern. This page asks the server to call the specialist model with NVIDIA_API_KEY and rewrite the summary. Intranet, air-gap, or no-cloud wording stays in this browser and is not sent. HTML stays locked until a PM approves.",
    language: "Language",
    customer: "Customer label",
    pain: "Pain point",
    requirements: "Special requirements",
    drafting: "Drafting",
    draft: "Draft one-pager",
    fill: "Use the example",
    recent: "Recent drafts",
    empty: "No drafts yet.",
    steps: ["Intake", "Model", "Cases", "Solution", "PM review", "HTML"],
    waiting: "Waiting for approval",
    headline: "Title",
    summary: "Summary",
    solution: "Solution",
    components: "Components",
    in: "In scope",
    out: "Out of scope",
    stakeholders: "Stakeholders",
    raci: "RACI",
    raciNote: "Accountable is exactly one role.",
    resources: "Resources required",
    goals: "Project goals",
    measurement: "Success measurement",
    outcomes: "Expected outcomes",
    rollout: "Phased rollout and fallback",
    governance: "Vendor governance",
    postmortem: "Postmortem",
    learning: "Learning points",
    risks: "Risks and decisions",
    assumptions: "Assumptions",
    save: "Save edits",
    review: "PM review",
    reviewer: "Reviewer",
    comment: "Comment",
    request: "Request changes",
    approve: "Approve",
    reopen: "Withdraw approval",
    report: "Report HTML",
    slides: "Slides HTML",
    locked: "The report and the slides download after a PM approves.",
    log: "Log",
    noLog: "No review log yet.",
    model: "Model",
    nvidia: "Connected to the NVIDIA API",
    local: "Connected as a local persona",
    refs: "Reference cases",
    dropped: " dropped because of the constraints.",
    role: "Role",
    interest: "Interest",
    engagement: "Engagement",
    cadence: "Cadence",
    activity: "Activity",
    item: "Item",
    amount: "Quantity",
    notes: "Notes",
    status: { draft: "Draft", in_review: "In review", changes_requested: "Changes requested", approved: "Approved" },
    action: { edit: "Edit", start_review: "Start review", comment: "Comment", request_changes: "Request changes", approve: "Approve", reopen: "Reopen" },
  };
}

function join(list) {
  return (list || []).join(", ");
}

function toForm(doc) {
  return {
    headline: doc.headline,
    executiveSummary: doc.executiveSummary,
    solutionSummary: doc.solution.summary,
    components: doc.solution.components,
    scopeIn: doc.scopeIn.join("\n"),
    scopeOut: doc.scopeOut.join("\n"),
    assumptions: doc.assumptions.join("\n"),
    stakeholders: doc.stakeholders,
    raci: doc.raci.map((row) => ({
      ...row,
      responsible: join(row.responsible),
      consulted: join(row.consulted),
      informed: join(row.informed),
    })),
    resources: doc.resources,
    risks: doc.risks,
    decisions: doc.decisions,
    goals: (doc.goals || []).map((item) => item.statement).join("\n"),
    successMeasures: doc.successMeasures || [],
    expectedOutcomes: (doc.expectedOutcomes || []).map((item) => item.outcome).join("\n"),
    rollout: doc.rollout || [],
    governanceNote: doc.governance?.note || "",
    postmortemQuestions: (doc.postmortem?.questions || []).join("\n"),
  };
}

function downloadHtml(doc, kind) {
  const html = renderExport(doc, kind);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "slides" ? `${doc.id}-slides.html` : `${doc.id}-report.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function Recent({ items, text }) {
  if (!items.length) return <p className="meta">{text.empty}</p>;
  return (
    <ul className="clean">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/onepager?id=${item.id}`}>{item.headline || item.customerLabel}</Link>
          <span className="meta"> · {text.status[item.status] || item.status}</span>
        </li>
      ))}
    </ul>
  );
}

export function OnePagerStudio({ initial, recent }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [stored, setStored] = useState(recent || []);
  const [form, setForm] = useState(initial ? toForm(initial) : EXAMPLES.en);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("");

  useEffect(() => {
    const items = listLocalOnePagers();
    setStored(items);
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    const found = readLocalOnePager(id);
    if (!found) return;
    setDoc(found);
    setForm(toForm(found));
  }, []);

  function remember(next) {
    saveLocalOnePager(next);
    setDoc(next);
    setForm(toForm(next));
    setStored(listLocalOnePagers());
    router.replace(`/onepager?id=${next.id}`);
  }
  const text = copy(doc?.language || form.language || "en");
  const steps = useMemo(() => {
    const labels = copy(doc?.language || "en");
    if (!doc) return labels.steps;
    return [...labels.steps.slice(0, 5), doc.status === "approved" ? "HTML" : labels.waiting];
  }, [doc]);

  async function createDraft(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const payload = await requestDraft({
        customerLabel: form.customerLabel,
        pain: form.pain,
        requirements: form.requirements,
        language: form.language === "ko" ? "ko" : "en",
      });
      remember(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : (form.language === "ko" ? "초안을 만들지 못했습니다." : "The draft could not be created."));
    } finally {
      setPending(false);
    }
  }

  async function send(action, extra = {}) {
    setPending(true);
    setError("");
    try {
      const payload = reviewDocument(structuredClone(doc), { action, ...extra });
      remember(payload);
      if (action === "comment" || action === "request_changes") setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : (doc.language === "ko" ? "검토를 저장하지 못했습니다." : "The review could not be saved."));
    } finally {
      setPending(false);
    }
  }

  function updateRow(key, index, field, value) {
    setForm((current) => {
      const rows = current[key].map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row));
      return { ...current, [key]: rows };
    });
  }

  if (!doc) {
    return (
      <div className="op-layout">
        <form className="panel" onSubmit={createDraft}>
          <p className="kicker">One-pager</p>
          <h1>{text.title}</h1>
          <p className="lede">{text.lede}</p>
          <label className="field">
            {text.language}
            <select
              data-testid="onepager-language"
              value={form.language === "ko" ? "ko" : "en"}
              onChange={(event) => {
                const next = event.target.value === "ko" ? "ko" : "en";
                const previous = form.language === "ko" ? EXAMPLES.ko : EXAMPLES.en;
                const untouched = form.pain === previous.pain && form.requirements === previous.requirements && form.customerLabel === previous.customerLabel;
                setForm(untouched ? EXAMPLES[next] : { ...form, language: next });
              }}
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
            </select>
          </label>
          <label className="field">
            {text.customer}
            <input value={form.customerLabel} onChange={(event) => setForm({ ...form, customerLabel: event.target.value })} maxLength={80} />
          </label>
          <label className="field">
            {text.pain}
            <textarea data-testid="onepager-pain" value={form.pain} onChange={(event) => setForm({ ...form, pain: event.target.value })} maxLength={2000} />
          </label>
          <label className="field">
            {text.requirements}
            <textarea data-testid="onepager-requirements" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} maxLength={2000} />
          </label>
          <div className="row">
            <button className="primary" type="submit" disabled={pending} data-testid="onepager-submit">{pending ? text.drafting : text.draft}</button>
            <button className="ghost" type="button" onClick={() => setForm(EXAMPLES[form.language === "ko" ? "ko" : "en"])}>{text.fill}</button>
          </div>
          {error ? <p className="warn">{error}</p> : null}
        </form>
        <aside className="panel">
          <h2>{text.recent}</h2>
          <Recent items={stored} text={text} />
        </aside>
      </div>
    );
  }

  const approved = doc.status === "approved";
  return (
    <div>
      <p className="kicker">One-pager · {doc.id}</p>
      <div className="steps" data-testid="onepager-status" data-status={doc.status}>
        {steps.map((step, index) => (
          <span key={step} data-on={index < 5 || approved ? "true" : "false"}>{index + 1}. {step}</span>
        ))}
        <span className={`badge ${approved ? "teal" : "gold"}`}>{text.status[doc.status]}</span>
      </div>
      <div className="op-layout">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            send("edit", { document: form, author: reviewer || "PM" });
          }}
        >
          <h2>{text.stakeholders}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{text.role}</th><th>{text.interest}</th><th>{text.engagement}</th><th>{text.cadence}</th></tr></thead>
              <tbody>
                {form.stakeholders.map((item, index) => (
                  <tr key={`${item.roleName}-${index}`}>
                    <td><input aria-label={`${text.role} ${index + 1}`} value={item.roleName} onChange={(event) => updateRow("stakeholders", index, "roleName", event.target.value)} /></td>
                    <td><input aria-label={`${text.interest} ${index + 1}`} value={item.interest} onChange={(event) => updateRow("stakeholders", index, "interest", event.target.value)} /></td>
                    <td><input aria-label={`${text.engagement} ${index + 1}`} value={item.engagement} onChange={(event) => updateRow("stakeholders", index, "engagement", event.target.value)} /></td>
                    <td><input aria-label={`${text.cadence} ${index + 1}`} value={item.cadence} onChange={(event) => updateRow("stakeholders", index, "cadence", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>{text.raci}</h2>
          <p className="meta">{text.raciNote}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{text.activity}</th><th>Accountable</th><th>Responsible</th><th>Consulted</th><th>Informed</th></tr></thead>
              <tbody>
                {form.raci.map((item, index) => (
                  <tr key={`${item.activity}-${index}`}>
                    <td><input aria-label={`${text.activity} ${index + 1}`} value={item.activity} onChange={(event) => updateRow("raci", index, "activity", event.target.value)} /></td>
                    <td><input aria-label={`Accountable ${index + 1}`} value={item.accountable} onChange={(event) => updateRow("raci", index, "accountable", event.target.value)} /></td>
                    <td><input aria-label={`Responsible ${index + 1}`} value={item.responsible} onChange={(event) => updateRow("raci", index, "responsible", event.target.value)} /></td>
                    <td><input aria-label={`Consulted ${index + 1}`} value={item.consulted} onChange={(event) => updateRow("raci", index, "consulted", event.target.value)} /></td>
                    <td><input aria-label={`Informed ${index + 1}`} value={item.informed} onChange={(event) => updateRow("raci", index, "informed", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>{text.resources}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{text.item}</th><th>{text.amount}</th><th>{text.notes}</th></tr></thead>
              <tbody>
                {form.resources.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td><input aria-label={`${text.item} ${index + 1}`} value={item.name} onChange={(event) => updateRow("resources", index, "name", event.target.value)} /></td>
                    <td><input aria-label={`${text.amount} ${index + 1}`} value={item.amount} onChange={(event) => updateRow("resources", index, "amount", event.target.value)} /></td>
                    <td><input aria-label={`${text.notes} ${index + 1}`} value={item.notes} onChange={(event) => updateRow("resources", index, "notes", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>{text.goals}</h2>
          <label className="field">
            {text.goals}
            <textarea data-testid="onepager-goals" value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} />
          </label>
          <h2>{text.measurement}</h2>
          {(form.successMeasures || []).map((item, index) => (
            <div className="split" key={`${item.name}-${index}`}>
              <input aria-label={`${text.measurement} ${index + 1}`} value={item.name} onChange={(event) => updateRow("successMeasures", index, "name", event.target.value)} />
              <input aria-label={`${text.measurement} rule ${index + 1}`} value={item.target} onChange={(event) => updateRow("successMeasures", index, "target", event.target.value)} />
            </div>
          ))}
          <h2>{text.rollout}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{text.rollout}</th><th>Pass rule</th><th>Fallback</th></tr></thead>
              <tbody>
                {(form.rollout || []).map((item, index) => (
                  <tr key={`${item.phase}-${index}`}>
                    <td><input aria-label={`Phase ${index + 1}`} value={item.phase} onChange={(event) => updateRow("rollout", index, "phase", event.target.value)} /></td>
                    <td><textarea aria-label={`Phase success ${index + 1}`} rows={2} value={item.success} onChange={(event) => updateRow("rollout", index, "success", event.target.value)} /></td>
                    <td><textarea aria-label={`Phase fallback ${index + 1}`} rows={2} value={item.fallback} onChange={(event) => updateRow("rollout", index, "fallback", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>{text.outcomes}</h2>
          <label className="field">
            {text.outcomes}
            <textarea data-testid="onepager-outcomes" value={form.expectedOutcomes} onChange={(event) => setForm({ ...form, expectedOutcomes: event.target.value })} />
          </label>
          <h2>{text.governance}</h2>
          <label className="field">
            {text.governance}
            <textarea data-testid="onepager-governance" value={form.governanceNote} onChange={(event) => setForm({ ...form, governanceNote: event.target.value })} />
          </label>
          <h2>{text.postmortem}</h2>
          <label className="field">
            {text.learning}
            <textarea data-testid="onepager-postmortem" value={form.postmortemQuestions} onChange={(event) => setForm({ ...form, postmortemQuestions: event.target.value })} />
          </label>
          <label className="field">{text.headline}<input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
          <label className="field">{text.summary}<textarea value={form.executiveSummary} onChange={(event) => setForm({ ...form, executiveSummary: event.target.value })} /></label>
          <label className="field">{text.solution}<textarea value={form.solutionSummary} onChange={(event) => setForm({ ...form, solutionSummary: event.target.value })} /></label>
          <h2>{text.components}</h2>
          {form.components.map((item, index) => (
            <div className="op-component" key={`${item.name}-${index}`}>
              <input aria-label={`${text.components} ${index + 1}`} value={item.name} onChange={(event) => updateRow("components", index, "name", event.target.value)} />
              <textarea aria-label={`${text.components} detail ${index + 1}`} rows={2} value={item.detail} onChange={(event) => updateRow("components", index, "detail", event.target.value)} />
            </div>
          ))}
          <div className="split">
            <label className="field">{text.in}<textarea value={form.scopeIn} onChange={(event) => setForm({ ...form, scopeIn: event.target.value })} /></label>
            <label className="field">{text.out}<textarea value={form.scopeOut} onChange={(event) => setForm({ ...form, scopeOut: event.target.value })} /></label>
          </div>
          <h2>{text.risks}</h2>
          {form.risks.map((item, index) => (
            <div className="split" key={`${item.code}-${index}`}>
              <input aria-label={`${text.risks} ${index + 1}`} value={item.title} onChange={(event) => updateRow("risks", index, "title", event.target.value)} />
              <input aria-label={`${text.risks} response ${index + 1}`} value={item.mitigation} onChange={(event) => updateRow("risks", index, "mitigation", event.target.value)} />
            </div>
          ))}
          {form.decisions.map((item, index) => (
            <div className="split" key={`${item.code}-${index}`}>
              <input aria-label={`Decision ${index + 1}`} value={item.title} onChange={(event) => updateRow("decisions", index, "title", event.target.value)} />
              <input aria-label={`Choice ${index + 1}`} value={item.choice} onChange={(event) => updateRow("decisions", index, "choice", event.target.value)} />
            </div>
          ))}
          <label className="field">{text.assumptions}<textarea value={form.assumptions} onChange={(event) => setForm({ ...form, assumptions: event.target.value })} /></label>
          <button className="primary" type="submit" disabled={pending}>{text.save}</button>
          {error ? <p className="warn">{error}</p> : null}
        </form>
        <aside className="op-side">
          <section className="panel">
            <h2>{text.review}</h2>
            <label className="field">
              {text.reviewer}
              <input data-testid="onepager-reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder={text.reviewer} />
            </label>
            <label className="field">
              {text.comment}
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <div className="row">
              <button type="button" className="ghost" disabled={pending} onClick={() => send("request_changes", { text: comment, author: reviewer || "PM" })}>{text.request}</button>
              <button type="button" className="primary" data-testid="onepager-approve" disabled={pending || reviewer.trim().length < 2} onClick={() => send("approve", { reviewer })}>{text.approve}</button>
              {approved ? <button type="button" className="ghost" disabled={pending} onClick={() => send("reopen", { author: reviewer || "PM" })}>{text.reopen}</button> : null}
            </div>
            <div className="row">
              {approved ? (
                <>
                  <button type="button" className="primary" data-testid="onepager-download-report" onClick={() => downloadHtml(doc, "report")}>{text.report}</button>
                  <button type="button" className="primary" data-testid="onepager-download-slides" onClick={() => downloadHtml(doc, "slides")}>{text.slides}</button>
                </>
              ) : (
                <p className="note">{text.locked}</p>
              )}
            </div>
            <h3>{text.log}</h3>
            <ul className="clean">
              {doc.reviews.length ? doc.reviews.map((item) => (
                <li key={`${item.at}-${item.action}`}>{text.action[item.action] || item.action} · {item.author}: {item.text}</li>
              )) : <li>{text.noLog}</li>}
            </ul>
          </section>
          <section className="panel">
            <h2>{text.model}</h2>
            <p><strong>{doc.specialist.authoringModelLabel}</strong></p>
            <p className="meta">{doc.specialist.connection === "nvidia-api" ? text.nvidia : text.local}</p>
            <p>{doc.specialist.reason}</p>
            {doc.specialist.error ? <p className="warn">{doc.specialist.error}</p> : null}
            <ul className="clean">
              {doc.specialist.considered.slice(0, 4).map((item) => (
                <li key={item.id}>{item.label} · {item.score}</li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>{text.refs}</h2>
            <ul className="clean">
              {doc.references.map((item) => (
                <li key={item.caseCode}>
                  <Link href={`/cases/${item.slug}`}>{item.caseCode}</Link>
                  <p className="meta">{item.why}</p>
                </li>
              ))}
            </ul>
            {doc.rejected.length ? (
              <p className="meta">{doc.rejected.map((item) => item.caseCode).join(", ")}{text.dropped}</p>
            ) : null}
          </section>
          <section className="panel">
            <h2>{text.recent}</h2>
            <Recent items={stored} text={text} />
          </section>
        </aside>
      </div>
    </div>
  );
}
