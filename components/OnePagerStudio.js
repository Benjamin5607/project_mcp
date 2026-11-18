"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const EXAMPLE = {
  customerLabel: "내부 지식검색",
  pain: "AI가 데이터베이스에서 정보를 찾아오는데 너무 느림",
  requirements: "클라우드와 연결되지 않은 인트라넷에서만 작동 요망 그리고 그래픽카드 최소화",
};

const ACTION = {
  edit: "수정",
  start_review: "검토 시작",
  comment: "의견",
  request_changes: "수정 요청",
  approve: "승인",
  reopen: "철회",
};

const STATUS = {
  draft: "초안",
  in_review: "검토 중",
  changes_requested: "수정 요청",
  approved: "승인됨",
};

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
  };
}

function Recent({ items }) {
  if (!items.length) return <p className="meta">아직 초안이 없습니다.</p>;
  return (
    <ul className="clean">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/onepager/${item.id}`}>{item.headline || item.customerLabel}</Link>
          <span className="meta"> · {STATUS[item.status] || item.status}</span>
        </li>
      ))}
    </ul>
  );
}

export function OnePagerStudio({ initial, recent }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [form, setForm] = useState(initial ? toForm(initial) : EXAMPLE);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("");
  const steps = useMemo(() => {
    if (!doc) return ["입력", "모델", "사례", "솔루션", "PM 검토", "HTML"];
    return ["입력", "모델", "사례", "솔루션", "PM 검토", doc.status === "approved" ? "HTML" : "승인 대기"];
  }, [doc]);

  async function createDraft(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/onepager", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerLabel: form.customerLabel,
          pain: form.pain,
          requirements: form.requirements,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "초안을 만들지 못했습니다.");
        return;
      }
      router.push(`/onepager/${payload.id}`);
      router.refresh();
    } catch {
      setError("요청이 전달되지 않았습니다.");
    } finally {
      setPending(false);
    }
  }

  async function send(action, extra = {}) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/onepager/${doc.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "검토를 저장하지 못했습니다.");
        return;
      }
      setDoc(payload);
      setForm(toForm(payload));
      if (action === "comment" || action === "request_changes") setComment("");
    } catch {
      setError("요청이 전달되지 않았습니다.");
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
          <h1>페인포인트에서 프로젝트 원페이저로</h1>
          <p className="lede">
            케이스 뱅크에서 참고 사례를 고르고, 제약에 맞는 기술 솔루션과 RACI·자원을 채웁니다.
            PM이 승인하기 전에는 보고서와 슬라이드를 내려받지 않습니다.
          </p>
          <label className="field">
            고객 표시 이름
            <input value={form.customerLabel} onChange={(event) => setForm({ ...form, customerLabel: event.target.value })} maxLength={80} />
          </label>
          <label className="field">
            페인포인트
            <textarea data-testid="onepager-pain" value={form.pain} onChange={(event) => setForm({ ...form, pain: event.target.value })} maxLength={2000} />
          </label>
          <label className="field">
            특별 요구사항
            <textarea data-testid="onepager-requirements" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} maxLength={2000} />
          </label>
          <div className="row">
            <button className="primary" type="submit" disabled={pending} data-testid="onepager-submit">{pending ? "작성 중" : "초안 만들기"}</button>
            <button className="ghost" type="button" onClick={() => setForm(EXAMPLE)}>예시 채우기</button>
          </div>
          {error ? <p className="warn">{error}</p> : null}
        </form>
        <aside className="panel">
          <h2>최근 초안</h2>
          <Recent items={recent} />
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
        <span className={`badge ${approved ? "teal" : "gold"}`}>{STATUS[doc.status]}</span>
      </div>
      <div className="op-layout">
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            send("edit", { document: form, author: reviewer || "PM" });
          }}
        >
          <label className="field">제목<input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
          <label className="field">요약<textarea value={form.executiveSummary} onChange={(event) => setForm({ ...form, executiveSummary: event.target.value })} /></label>
          <label className="field">솔루션<textarea value={form.solutionSummary} onChange={(event) => setForm({ ...form, solutionSummary: event.target.value })} /></label>
          <h2>구성</h2>
          {form.components.map((item, index) => (
            <div className="op-component" key={`${item.name}-${index}`}>
              <input aria-label={`구성 이름 ${index + 1}`} value={item.name} onChange={(event) => updateRow("components", index, "name", event.target.value)} />
              <textarea aria-label={`구성 설명 ${index + 1}`} rows={2} value={item.detail} onChange={(event) => updateRow("components", index, "detail", event.target.value)} />
            </div>
          ))}
          <div className="split">
            <label className="field">포함<textarea value={form.scopeIn} onChange={(event) => setForm({ ...form, scopeIn: event.target.value })} /></label>
            <label className="field">제외<textarea value={form.scopeOut} onChange={(event) => setForm({ ...form, scopeOut: event.target.value })} /></label>
          </div>
          <h2>이해관계자</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>역할</th><th>관심</th><th>참여</th><th>리듬</th></tr></thead>
              <tbody>
                {form.stakeholders.map((item, index) => (
                  <tr key={`${item.roleName}-${index}`}>
                    <td><input aria-label={`역할 ${index + 1}`} value={item.roleName} onChange={(event) => updateRow("stakeholders", index, "roleName", event.target.value)} /></td>
                    <td><input aria-label={`관심 ${index + 1}`} value={item.interest} onChange={(event) => updateRow("stakeholders", index, "interest", event.target.value)} /></td>
                    <td><input aria-label={`참여 ${index + 1}`} value={item.engagement} onChange={(event) => updateRow("stakeholders", index, "engagement", event.target.value)} /></td>
                    <td><input aria-label={`리듬 ${index + 1}`} value={item.cadence} onChange={(event) => updateRow("stakeholders", index, "cadence", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>RACI</h2>
          <p className="meta">Accountable은 한 역할만 적습니다.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>활동</th><th>A</th><th>R</th><th>C</th><th>I</th></tr></thead>
              <tbody>
                {form.raci.map((item, index) => (
                  <tr key={`${item.activity}-${index}`}>
                    <td><input aria-label={`활동 ${index + 1}`} value={item.activity} onChange={(event) => updateRow("raci", index, "activity", event.target.value)} /></td>
                    <td><input aria-label={`Accountable ${index + 1}`} value={item.accountable} onChange={(event) => updateRow("raci", index, "accountable", event.target.value)} /></td>
                    <td><input aria-label={`Responsible ${index + 1}`} value={item.responsible} onChange={(event) => updateRow("raci", index, "responsible", event.target.value)} /></td>
                    <td><input aria-label={`Consulted ${index + 1}`} value={item.consulted} onChange={(event) => updateRow("raci", index, "consulted", event.target.value)} /></td>
                    <td><input aria-label={`Informed ${index + 1}`} value={item.informed} onChange={(event) => updateRow("raci", index, "informed", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>자원</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>항목</th><th>수량</th><th>메모</th></tr></thead>
              <tbody>
                {form.resources.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td><input aria-label={`자원 ${index + 1}`} value={item.name} onChange={(event) => updateRow("resources", index, "name", event.target.value)} /></td>
                    <td><input aria-label={`수량 ${index + 1}`} value={item.amount} onChange={(event) => updateRow("resources", index, "amount", event.target.value)} /></td>
                    <td><input aria-label={`자원 메모 ${index + 1}`} value={item.notes} onChange={(event) => updateRow("resources", index, "notes", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>리스크와 결정</h2>
          {form.risks.map((item, index) => (
            <div className="split" key={`${item.code}-${index}`}>
              <input aria-label={`리스크 ${index + 1}`} value={item.title} onChange={(event) => updateRow("risks", index, "title", event.target.value)} />
              <input aria-label={`완화 ${index + 1}`} value={item.mitigation} onChange={(event) => updateRow("risks", index, "mitigation", event.target.value)} />
            </div>
          ))}
          {form.decisions.map((item, index) => (
            <div className="split" key={`${item.code}-${index}`}>
              <input aria-label={`결정 ${index + 1}`} value={item.title} onChange={(event) => updateRow("decisions", index, "title", event.target.value)} />
              <input aria-label={`선택 ${index + 1}`} value={item.choice} onChange={(event) => updateRow("decisions", index, "choice", event.target.value)} />
            </div>
          ))}
          <label className="field">가정<textarea value={form.assumptions} onChange={(event) => setForm({ ...form, assumptions: event.target.value })} /></label>
          <button className="primary" type="submit" disabled={pending}>수정 저장</button>
          {error ? <p className="warn">{error}</p> : null}
        </form>
        <aside className="op-side">
          <section className="panel">
            <h2>PM 검토</h2>
            <label className="field">
              검토자
              <input data-testid="onepager-reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="이름" />
            </label>
            <label className="field">
              의견
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <div className="row">
              <button type="button" className="ghost" disabled={pending} onClick={() => send("request_changes", { text: comment, author: reviewer || "PM" })}>수정 요청</button>
              <button type="button" className="primary" data-testid="onepager-approve" disabled={pending || reviewer.trim().length < 2} onClick={() => send("approve", { reviewer })}>승인</button>
              {approved ? <button type="button" className="ghost" disabled={pending} onClick={() => send("reopen", { author: reviewer || "PM" })}>승인 철회</button> : null}
            </div>
            <div className="row">
              {approved ? (
                <>
                  <a className="primary" data-testid="onepager-download-report" href={`/api/onepager/${doc.id}/export?kind=report`}>보고서 HTML</a>
                  <a className="primary" data-testid="onepager-download-slides" href={`/api/onepager/${doc.id}/export?kind=slides`}>슬라이드 HTML</a>
                </>
              ) : (
                <p className="note">PM이 승인하면 보고서와 슬라이드 HTML을 내려받을 수 있습니다.</p>
              )}
            </div>
            <h3>기록</h3>
            <ul className="clean">
              {doc.reviews.length ? doc.reviews.map((item) => (
                <li key={`${item.at}-${item.action}`}>{ACTION[item.action] || item.action} · {item.author}: {item.text}</li>
              )) : <li>아직 검토 기록이 없습니다.</li>}
            </ul>
          </section>
          <section className="panel">
            <h2>모델</h2>
            <p><strong>{doc.specialist.authoringModelLabel}</strong></p>
            <p className="meta">{doc.specialist.connection === "nvidia-api" ? "NVIDIA API에 연결됨" : "로컬 페르소나로 연결됨"}</p>
            <p>{doc.specialist.reason}</p>
            {doc.specialist.error ? <p className="warn">{doc.specialist.error}</p> : null}
            <ul className="clean">
              {doc.specialist.considered.slice(0, 4).map((item) => (
                <li key={item.id}>{item.label} · {item.score}</li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>참고 사례</h2>
            <ul className="clean">
              {doc.references.map((item) => (
                <li key={item.caseCode}>
                  <Link href={`/cases/${item.slug}`}>{item.caseCode}</Link>
                  <p className="meta">{item.why}</p>
                </li>
              ))}
            </ul>
            {doc.rejected.length ? (
              <p className="meta">{doc.rejected.map((item) => item.caseCode).join(", ")} 은 제약 때문에 본안에서 뺐습니다.</p>
            ) : null}
          </section>
          <section className="panel">
            <h2>최근 초안</h2>
            <Recent items={recent} />
          </section>
        </aside>
      </div>
    </div>
  );
}
