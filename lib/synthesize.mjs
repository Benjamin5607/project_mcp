import { dayBand, usdBand, weekBand } from "./format.mjs";
import { knowledgeLabel, phaseLabel } from "./taxonomy.mjs";

const ARTIFACTS = new Set(["auto", "executive_brief", "proposal_email", "wbs", "raci", "risk_plan"]);

export function detectArtifact(query, explicit = "auto") {
  if (explicit && explicit !== "auto") {
    if (!ARTIFACTS.has(explicit)) return "executive_brief";
    return explicit;
  }
  const folded = String(query || "").toLowerCase();
  if (folded.includes("raci") || folded.includes("역할") || folded.includes("책임")) return "raci";
  if (folded.includes("wbs") || folded.includes("작업") || folded.includes("일정표")) return "wbs";
  if (folded.includes("위험") || folded.includes("리스크") || folded.includes("risk")) return "risk_plan";
  if (folded.includes("메일") || folded.includes("이메일") || folded.includes("제안서")) return "proposal_email";
  return "executive_brief";
}

function cell(value) {
  return String(value ?? "—").replace(/\|/g, "/").replace(/\n/g, " ");
}

function rankCases(matches) {
  const totals = new Map();
  for (const match of matches) totals.set(match.caseCode, (totals.get(match.caseCode) || 0) + match.score);
  return [...totals.entries()].sort((left, right) => right[1] - left[1]).map(([code]) => code);
}

function renderMarkdown(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "heading") return `## ${block.text}`;
      if (block.type === "paragraph" || block.type === "note") return block.text;
      if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
      if (block.type === "table") {
        const head = `| ${block.headers.map(cell).join(" | ")} |`;
        const rule = `| ${block.headers.map(() => "---").join(" | ")} |`;
        const rows = block.rows.map((row) => `| ${row.map(cell).join(" | ")} |`);
        return [head, rule, ...rows].join("\n");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function fidelityLine(caseRecord) {
  return `${caseRecord.caseCode}는 ${caseRecord.fidelity === "primary_source" ? "공개 출처를 요약한 기록" : "공개 자료로 짠 계획 시나리오"}입니다. ${caseRecord.fidelityNote}`;
}

export function synthesize({ query, artifact = "auto", matches, cases }) {
  const kind = detectArtifact(query, artifact);
  const byCode = new Map(cases.map((item) => [item.caseCode, item]));
  const codes = rankCases(matches);
  const primary = byCode.get(codes[0]) || cases[0];
  const supporting = codes
    .slice(1)
    .map((code) => byCode.get(code))
    .filter(Boolean)
    .slice(0, 4);

  const titles = {
    executive_brief: `${primary.title} — 경영진 브리프`,
    proposal_email: `${primary.title} — 제안 이메일 초안`,
    wbs: `${primary.title} — WBS 초안`,
    raci: `${primary.title} — RACI 초안`,
    risk_plan: `${primary.title} — 위험 관리 계획 초안`,
  };

  const blocks = [];
  blocks.push({ type: "heading", text: titles[kind] });
  blocks.push({
    type: "note",
    text: `질의 “${query.trim()}”에 대해 검색된 상위 사례 ${matches.length}건 중 ${primary.caseCode}를 본안으로 사용했습니다. ${fidelityLine(primary)}`,
  });

  if (kind === "proposal_email") blocks.push(...emailBlocks(primary, supporting));
  else if (kind === "wbs") blocks.push(...wbsBlocks(primary));
  else if (kind === "raci") blocks.push(...raciBlocks(primary));
  else if (kind === "risk_plan") blocks.push(...riskBlocks(primary));
  else blocks.push(...briefBlocks(primary));

  if (supporting.length) {
    blocks.push({
      type: "heading",
      text: "함께 참고한 사례",
    });
    blocks.push({
      type: "list",
      items: supporting.map(
        (item) =>
          `${item.caseCode} ${item.title} — ${item.industryLabel}, ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, ${item.fidelity === "primary_source" ? "공개 출처" : "계획 시나리오"}`,
      ),
    });
  }

  blocks.push({ type: "heading", text: "검색 근거" });
  blocks.push({
    type: "list",
    items: matches.slice(0, 5).map((match) => `${match.caseCode} · ${match.heading} · 점수 ${match.score.toFixed(3)}`),
  });
  blocks.push({
    type: "note",
    text: "금액·기간·KPI 목표 중 ‘계획 밴드’ 또는 ‘계획 목표’로 적힌 값은 고시 가격이나 특정 고객의 실적이 아닙니다. 제안 전에 최신 공개 문서와 고객 환경으로 다시 확인하세요. 민감한 구성도나 정책 값은 이 공개 뱅크에 넣지 않았습니다.",
  });

  return {
    kind,
    title: titles[kind],
    primaryCaseCode: primary.caseCode,
    disclaimer: blocks.at(-1).text,
    blocks,
    markdown: renderMarkdown(blocks),
    citations: matches.slice(0, 5).map((match) => ({
      caseCode: match.caseCode,
      slug: match.slug,
      title: match.title,
      heading: match.heading,
      section: match.section,
      score: Number(match.score.toFixed(4)),
    })),
  };
}

function briefBlocks(item) {
  return [
    { type: "paragraph", text: item.executiveSummary },
    { type: "paragraph", text: item.problemStatement },
    {
      type: "list",
      items: [
        `산업·세그먼트: ${item.industryLabel} / ${item.customerSegmentLabel} / ${item.region}`,
        `솔루션: ${item.ciscoSolutions.join(", ")}`,
        `배치: ${item.deploymentModelLabel}. ${item.architecturePattern}`,
        `리드타임 ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}, 수행 ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, 1차년도 현금 계획 밴드 ${usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)}`,
        `규제 맥락: ${item.regulatoryContext.join(", ")}`,
      ],
    },
    { type: "heading", text: "성공 기준" },
    { type: "list", items: item.successCriteria },
    { type: "heading", text: "지금 결정할 것" },
    {
      type: "list",
      items: item.decisions.map((decision) => `${decision.decisionCode} ${decision.title}: ${decision.choice}`),
    },
  ];
}

function emailBlocks(item, supporting) {
  const subject = `[제안] ${item.industryLabel} ${item.ciscoSolutions.slice(0, 2).join(" + ")} 파일럿`;
  return [
    { type: "paragraph", text: `제목: ${subject}` },
    { type: "paragraph", text: "수신: CISO / AI 프로그램 스폰서    참조: 네트워크 아키텍처, 준법, 조달" },
    {
      type: "paragraph",
      text: `${item.problemStatement} ${item.opportunity}`,
    },
    {
      type: "paragraph",
      text: `본안은 ${item.caseCode}입니다. ${item.businessValue} 수행 기간은 ${weekBand(item.durationWeeksLow, item.durationWeeksHigh)}, 하드웨어·라이선스 리드타임은 ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}로 계획합니다. 1차년도 외부 지출 밴드는 ${usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd)}이며 내부 인건비는 별도입니다.`,
    },
    { type: "heading", text: "파일럿에서 하려는 일" },
    { type: "list", items: item.scopeIn.slice(0, 5) },
    { type: "heading", text: "이번 제안에서 빼는 일" },
    { type: "list", items: item.scopeOut },
    {
      type: "paragraph",
      text: `요청: 2주 안에 스폰서 차터 리뷰를 잡고, 파일럿 워크로드 후보 두 건과 금지 데이터 목록을 확정해 주십시오. 검색상 인접 사례 ${supporting.map((entry) => entry.caseCode).join(", ") || "없음"}은 범위가 겹치는 부분만 별첨으로 둡니다.`,
    },
  ];
}

function wbsBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `${item.caseCode}의 WBS입니다. 기간은 작업일 밴드이고, 리드타임 ${weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh)}은 조달 트랙에 더합니다. 아키텍처 요약: ${item.architecturePattern}`,
    },
    {
      type: "table",
      headers: ["코드", "단계", "작업", "소유", "기간", "산출물"],
      rows: item.wbs.map((task) => [
        task.wbsCode,
        phaseLabel(task.phase),
        task.name,
        task.ownerRole,
        dayBand(task.durationDaysLow, task.durationDaysHigh),
        task.deliverable,
      ]),
    },
    { type: "heading", text: "마일스톤" },
    {
      type: "list",
      items: item.milestones.map(
        (milestone) =>
          `${milestone.name} (착수 후 ${weekBand(milestone.weekOffsetLow, milestone.weekOffsetHigh)}): ${milestone.criteria}`,
      ),
    },
  ];
}

function raciBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `${item.industryLabel} 맥락의 RACI 초안입니다. Accountable은 한 역할만 둡니다. 보안 통제를 자동으로 강제하기 전에 관측 모드와 사람 승인을 일정에 넣으십시오. 규제 맥락: ${item.regulatoryContext.join(", ")}.`,
    },
    {
      type: "table",
      headers: ["단계", "활동", "영역", "R", "A", "C", "I"],
      rows: item.raci.map((row) => [
        phaseLabel(row.phase),
        row.activity,
        knowledgeLabel(row.knowledgeArea),
        row.responsible.join(", "),
        row.accountable,
        (row.consulted || []).join(", "),
        (row.informed || []).join(", "),
      ]),
    },
    { type: "heading", text: "이해관계자" },
    {
      type: "list",
      items: item.stakeholders.map(
        (person) =>
          `${person.roleName} (${person.organization}, 영향 ${person.influence}): ${person.interest} 참여: ${person.engagement}. 리듬 ${person.cadence}.`,
      ),
    },
  ];
}

function riskBlocks(item) {
  return [
    {
      type: "paragraph",
      text: `${item.caseCode} 위험 등록부입니다. 점수는 확률(1–5) × 영향(1–5)입니다. 대응은 회피·완화·전가·수용 중 하나입니다.`,
    },
    {
      type: "table",
      headers: ["코드", "위험", "분류", "P", "I", "점수", "대응", "소유"],
      rows: item.risks
        .map((risk) => ({ ...risk, score: risk.probability * risk.impact }))
        .sort((left, right) => right.score - left.score)
        .map((risk) => [
          risk.riskCode,
          risk.title,
          risk.category,
          String(risk.probability),
          String(risk.impact),
          String(risk.score),
          risk.response,
          risk.ownerRole,
        ]),
    },
    { type: "heading", text: "완화와 유발 요인" },
    {
      type: "list",
      items: item.risks.map((risk) => `${risk.riskCode} ${risk.mitigation} 유발: ${risk.trigger} 비상: ${risk.contingency}`),
    },
    { type: "heading", text: "열어 둔 이슈" },
    {
      type: "list",
      items: item.issues.map((issue) => `${issue.issueCode} [${issue.status}] ${issue.title} — 다음: ${issue.nextAction} (${issue.ownerRole})`),
    },
  ];
}
