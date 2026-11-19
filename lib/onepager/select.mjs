import { clip } from "../format.mjs";

const THEME_BOOST = {
  retrieval: {},
  visibility: {
    "CSCO-HYP-FIN-001": 0.28,
    "CSCO-AID-ENT-001": 0.24,
  },
  soc: { "CSCO-XDR-SOC-001": 0.32 },
  collab: { "CSCO-WX-AIM-001": 0.32 },
  training: {
    "CSCO-AIF-NVD-001": 0.3,
    "CSCO-WX-AIM-001": 0.06,
  },
  fabric: {
    "CSCO-SIO-DC-001": 0.32,
    "CSCO-AIF-NVD-001": 0.08,
  },
  general: {},
};

const GPU_HEAVY = "CSCO-AIF-NVD-001";

function bestMatch(matches) {
  const byCode = new Map();
  for (const match of matches) {
    const current = byCode.get(match.caseCode);
    if (!current || match.score > current.score) byCode.set(match.caseCode, match);
  }
  return byCode;
}

function whyLine(record, profile, theme, retrievalScore, fitScore, language) {
  if (language === "en") {
    const parts = [`retrieval ${retrievalScore.toFixed(3)}`, `fit ${fitScore.toFixed(3)}`];
    if (THEME_BOOST[theme]?.[record.caseCode]) parts.push("matches the theme");
    if (profile.airgap && record.deploymentModel === "on_prem") parts.push("on-premises pattern");
    return parts.join(" · ");
  }
  const parts = [`검색 ${retrievalScore.toFixed(3)}`, `적합 ${fitScore.toFixed(3)}`];
  if (THEME_BOOST[theme]?.[record.caseCode]) parts.push("주제와 맞음");
    if (profile.airgap && record.deploymentModel === "on_prem") parts.push("온프레미스 배치");
    return parts.join(" · ");
}

export function rankCases(cases, matches, profile, language = "en") {
  const theme = profile.dominantTheme || "general";
  const byCode = new Map(cases.map((item) => [item.caseCode, item]));
  const chosen = bestMatch(matches);
  const ranked = [];
  for (const [caseCode, match] of chosen) {
    const record = byCode.get(caseCode);
    if (!record || record.status !== "published") continue;
    let fitScore = match.score + (THEME_BOOST[theme]?.[caseCode] || 0);
    let rejected = false;
    let rejectReason = "";
    if (profile.minGpu && caseCode === GPU_HEAVY && theme !== "training") {
      fitScore -= 0.45;
      rejected = true;
      rejectReason = language === "ko"
        ? "그래픽카드를 최소화하라는 요구와 맞지 않아 본안 참고에서 내렸습니다. 학습 포드가 목표가 되면 다시 엽니다."
        : "The full factory pod conflicts with a minimize-GPU requirement, so it is dropped unless the goal is a training pod.";
    }
    if (profile.airgap && record.deploymentModel === "on_prem") fitScore += 0.05;
    ranked.push({
      caseCode,
      slug: record.slug,
      title: language === "ko" ? record.title : record.titleEn || record.title,
      fidelity: record.fidelity,
      retrievalScore: Number(match.score.toFixed(4)),
      fitScore: Number(fitScore.toFixed(4)),
      rejected,
      rejectReason,
      why: whyLine(record, profile, theme, match.score, fitScore, language),
      excerpt: clip(String(match.content || "").replace(/^case:[\s\S]*?\n\n/, ""), 280),
      videoUrl: record.videoUrl || null,
      record,
    });
  }
  ranked.sort((left, right) => right.fitScore - left.fitScore || left.caseCode.localeCompare(right.caseCode));
  return {
    dominantTheme: theme,
    ranked,
    kept: ranked.filter((item) => !item.rejected).slice(0, 3),
    rejected: ranked.filter((item) => item.rejected),
  };
}
