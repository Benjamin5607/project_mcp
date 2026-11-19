"use client";

import { useState } from "react";
import { ArtifactView } from "./ArtifactView";

const PROMPTS = [
  ["Finance RACI", "Draft a RACI for Hypershield and AI visibility in financial services"],
  ["Factory WBS", "Draft the WBS and milestones for the first NVIDIA AI Factory pod"],
  ["XDR risk", "Draft a risk plan for Cisco XDR security operations"],
  ["Webex brief", "Write an executive brief on Webex noise removal and security LLM governance"],
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
        setError(payload.error || "Search failed.");
      } else {
        setResult(payload);
      }
    } catch {
      setError("The search request did not go through.");
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
          Question
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} maxLength={2000} />
        </label>
        <div className="toolbar">
          <select value={artifact} onChange={(event) => setArtifact(event.target.value)} aria-label="Artifact">
            <option value="auto">Choose artifact</option>
            <option value="raci">RACI</option>
            <option value="wbs">WBS</option>
            <option value="risk_plan">Risk plan</option>
            <option value="proposal_email">Proposal email</option>
            <option value="executive_brief">Executive brief</option>
          </select>
          <select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="Industry filter">
            <option value="">Any industry</option>
            {industries.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <button className="primary" type="submit" disabled={pending}>{pending ? "Searching" : "Draft"}</button>
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
              <span className="badge">{result.matches.length} nearest cases</span>
              <button type="button" className="ghost" onClick={copyMarkdown}>{copied ? "Copied" : "Copy markdown"}</button>
            </div>
            <ArtifactView artifact={result.artifact} />
            <h3>Evidence</h3>
            <div className="evidence">
              {result.matches.map((match) => (
                <article key={match.id}>
                  <a href={`/cases/${match.slug}`}>{match.caseCode} · {match.heading}</a>
                  <p className="meta">Score {match.score}</p>
                  <p>{match.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="panel">
            <p>A question retrieves the top five chunks and drafts from the nearest case's RACI, WBS, and risks. For a pain point and constraints, open the one-pager.</p>
          </div>
        )}
      </div>
    </div>
  );
}
