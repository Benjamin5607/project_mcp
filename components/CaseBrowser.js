"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function CaseBrowser({ cases }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [solution, setSolution] = useState("");
  const industries = [...new Map(cases.map((item) => [item.industry, item.industryLabel])).entries()];
  const solutions = [...new Set(cases.flatMap((item) => item.ciscoSolutions))].sort();
  const visible = useMemo(() => {
    const folded = query.trim().toLowerCase();
    return cases.filter((item) => {
      if (industry && item.industry !== industry) return false;
      if (solution && !item.ciscoSolutions.includes(solution)) return false;
      if (!folded) return true;
      const haystack = `${item.title} ${item.titleEn} ${item.executiveSummary} ${item.caseCode} ${item.ciscoSolutions.join(" ")}`.toLowerCase();
      return haystack.includes(folded);
    });
  }, [cases, query, industry, solution]);

  return (
    <div>
      <div className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, product, case code" aria-label="Search cases" />
        <select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="Industry">
          <option value="">All industries</option>
          {industries.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={solution} onChange={(event) => setSolution(event.target.value)} aria-label="Solution">
          <option value="">All solutions</option>
          {solutions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <p className="meta">{visible.length} cases</p>
      <div className="cards">
        {visible.map((item) => (
          <Link key={item.slug} href={`/cases/${item.slug}`} className="card">
            <div className="row">
              <span className="badge">{item.caseCode}</span>
              <span className={item.fidelity === "primary_source" ? "badge teal" : "badge gold"}>{item.fidelityLabel}</span>
              <span className="badge">{item.industryLabel}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.executiveSummary}</p>
            <p className="meta">
              {item.ciscoSolutions.join(" · ")} · Duration {item.durationLabel} · Lead {item.leadLabel} · Planning band {item.dealLabel}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
