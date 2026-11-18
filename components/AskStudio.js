"use client";

import { useState } from "react";
import { ArtifactView } from "./ArtifactView";

const PROMPTS = [
  ["금융 RACI", "금융권 고객의 AI 애플리케이션 보안 가시성 확보를 위한 Hypershield 도입 사례와 RACI 매트릭스 초안을 작성해 줘"],
  ["팩토리 WBS", "NVIDIA AI 팩토리 첫 포드의 WBS와 마일스톤을 정리해 줘"],
  ["XDR 위험", "Cisco XDR 보안 운영의 위험 관리 계획 초안을 작성해 줘"],
  ["Webex 브리프", "Webex 노이즈 제거와 보안 LLM 거버넌스를 경영진 브리프로 써 줘"],
];

export function AskStudio({ defaultQuery, industries }) {
  const [query, setQuery] = useState(defaultQuery || PROMPTS[0][1]);
  const [artifact, setArtifact] = useState("auto");
  const [industry, setIndustry] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, artifact, industry }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(payload.error || "검색에 실패했습니다.");
      } else {
        setResult(payload);
      }
    } catch {
      setError("검색 요청이 전달되지 않았습니다.");
    } finally {
      setPending(false);
    }
  }

  async function copyMarkdown() {
    if (!result) return;
    await navigator.clipboard.writeText(result.artifact.markdown);
    setCopied(true);
  }

  return (
    <div className="ask-layout">
      <form onSubmit={onSubmit} className="panel">
        <label className="field">
          질문
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} maxLength={2000} />
        </label>
        <div className="toolbar">
          <select value={artifact} onChange={(event) => setArtifact(event.target.value)} aria-label="산출물">
            <option value="auto">산출물 자동</option>
            <option value="raci">RACI</option>
            <option value="wbs">WBS</option>
            <option value="risk_plan">위험 관리 계획</option>
            <option value="proposal_email">제안 이메일</option>
            <option value="executive_brief">경영진 브리프</option>
          </select>
          <select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="산업 필터">
            <option value="">산업 제한 없음</option>
            {industries.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <button className="primary" type="submit" disabled={pending}>{pending ? "검색 중" : "초안 만들기"}</button>
        </div>
        <div className="row">
          {PROMPTS.map(([label, prompt]) => (
            <button key={label} type="button" className="ghost" onClick={() => setQuery(prompt)}>
              {label}
            </button>
          ))}
        </div>
        {error ? <p className="warn">{error}</p> : null}
      </form>
      <div>
        {result ? (
          <div className="panel">
            <div className="row no-print">
              <span className="badge teal">{result.artifact.primaryCaseCode}</span>
              <span className="badge">가까운 사례 {result.matches.length}건</span>
              <button type="button" className="ghost" onClick={copyMarkdown}>{copied ? "복사됨" : "마크다운 복사"}</button>
            </div>
            <ArtifactView artifact={result.artifact} />
            <h3>근거 발췌</h3>
            <div className="evidence">
              {result.matches.map((match) => (
                <article key={match.id}>
                  <a href={`/cases/${match.slug}`}>{match.caseCode} · {match.heading}</a>
                  <p className="meta">점수 {match.score}</p>
                  <p>{match.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="panel">
            <p>질문을 보내면 벡터 검색으로 상위 5개 청크를 고르고, 가장 가까운 사례의 RACI·WBS·리스크로 초안을 합성합니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
