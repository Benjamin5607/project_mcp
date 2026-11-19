import { usdBand, weekBand } from "./format.mjs";
import { COMPLEXITY, DEPLOYMENTS, FIDELITY, INDUSTRIES, RECORD_TYPES, SEGMENTS } from "./taxonomy.mjs";

export function summarize(item) {
  return {
    slug: item.slug,
    caseCode: item.caseCode,
    title: item.titleEn || item.title,
    titleKo: item.title,
    titleEn: item.titleEn,
    industry: item.industry,
    industryLabel: INDUSTRIES[item.industry] || item.industry,
    customerSegmentLabel: SEGMENTS[item.customerSegment] || item.customerSegment,
    region: item.region,
    vendor: item.vendor || "",
    ciscoSolutions: item.ciscoSolutions,
    complexity: item.complexity,
    complexityLabel: COMPLEXITY[item.complexity] || item.complexity,
    fidelity: item.fidelity,
    fidelityLabel: FIDELITY[item.fidelity] || item.fidelity,
    recordTypeLabel: RECORD_TYPES[item.recordType] || item.recordType,
    durationLabel: weekBand(item.durationWeeksLow, item.durationWeeksHigh),
    leadLabel: weekBand(item.leadTimeWeeksLow, item.leadTimeWeeksHigh),
    dealLabel: usdBand(item.dealSizeLowUsd, item.dealSizeHighUsd),
    dealSizeBand: item.dealSizeBand,
    executiveSummary: item.executiveSummary,
    deploymentModelLabel: DEPLOYMENTS[item.deploymentModel] || item.deploymentModel,
  };
}

export function comparison(item) {
  return {
    ...summarize(item),
    fidelityNote: item.fidelityNote,
    architecturePattern: item.architecturePattern,
    successCriteria: item.successCriteria,
    scopeOut: item.scopeOut,
    milestones: item.milestones.map((milestone) => milestone.name),
    risks: item.risks.map((risk) => ({
      code: risk.riskCode,
      title: risk.title,
      score: risk.probability * risk.impact,
      response: risk.response,
    })),
  };
}
