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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 제품, 사례 코드" aria-label="사례 검색" />
        <select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="산업">
          <option value="">모든 산업</option>
          {industries.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={solution} onChange={(event) => setSolution(event.target.value)} aria-label="솔루션">
          <option value="">모든 솔루션</option>
          {solutions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <p className="meta">{visible.length}건</p>
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
              {item.ciscoSolutions.join(" · ")} · 수행 {item.durationLabel} · 리드 {item.leadLabel} · 계획 밴드 {item.dealLabel}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
