"use client";

import { useMemo, useState } from "react";

export function CompareStudio({ cases }) {
  const [selected, setSelected] = useState(cases.slice(0, 2).map((item) => item.slug));
  const chosen = useMemo(
    () => selected.map((slug) => cases.find((item) => item.slug === slug)).filter(Boolean).slice(0, 3),
    [cases, selected],
  );

  function toggle(slug) {
    setSelected((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 3) return current;
      return [...current, slug];
    });
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        {cases.map((item) => (
          <label key={item.slug} className="chip">
            <input
              type="checkbox"
              checked={selected.includes(item.slug)}
              onChange={() => toggle(item.slug)}
            />{" "}
            {item.caseCode}
          </label>
        ))}
      </div>
      <div className="compare">
        {chosen.map((item) => (
          <article key={item.slug} className="panel">
            <p className="kicker">{item.fidelityLabel}</p>
            <h2 style={{ fontSize: 28 }}>{item.title}</h2>
            <p className="meta">{item.caseCode} · {item.industryLabel} · {item.customerSegmentLabel}</p>
            <p>{item.architecturePattern}</p>
            <p>수행 {item.durationLabel} · 리드 {item.leadLabel} · {item.dealLabel}</p>
            <h3>성공 기준</h3>
            <ul className="clean">{item.successCriteria.map((line) => <li key={line}>{line}</li>)}</ul>
            <h3>상위 리스크</h3>
            <ul className="clean">
              {item.risks
                .slice()
                .sort((left, right) => right.score - left.score)
                .slice(0, 3)
                .map((risk) => (
                  <li key={risk.code}>{risk.code} {risk.title} ({risk.score}, {risk.response})</li>
                ))}
            </ul>
            <p className="note">{item.fidelityNote}</p>
            <p><a href={`/cases/${item.slug}`}>사례 열기</a></p>
          </article>
        ))}
      </div>
    </div>
  );
}
