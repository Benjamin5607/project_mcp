/** PMI process groups plus the two extensions this case bank plans against. */
export const PHASES = {
  initiate: "Initiating",
  plan: "Planning",
  execute: "Executing",
  monitor: "Monitoring and controlling",
  close: "Closing",
};

/** PMI knowledge areas, plus security and AI governance used on every Cisco AI program. */
export const KNOWLEDGE_AREAS = {
  integration: {
    ko: "통합",
    en: "Integration",
    description: "Charter, change control, lessons, and stage gates in one plan.",
  },
  scope: {
    ko: "범위",
    en: "Scope",
    description: "In scope, out of scope, and acceptance. Do not mix a pilot with an enterprise rollout.",
  },
  schedule: {
    ko: "일정",
    en: "Schedule",
    description: "Lead time, duration band, milestones, and predecessors.",
  },
  cost: {
    ko: "원가",
    en: "Cost",
    description: "CapEx and OpEx planning bands. Not a list price and not a customer result.",
  },
  quality: {
    ko: "품질",
    en: "Quality",
    description: "Stage gates and acceptance criteria. Security checks are quality activities.",
  },
  resource: {
    ko: "자원",
    en: "Resource",
    description: "Roles, internal effort, and partner roles. Tied to RACI Responsible.",
  },
  communications: {
    ko: "의사소통",
    en: "Communications",
    description: "Sponsor reports, user notices, and the exception channel.",
  },
  risk: {
    ko: "리스크",
    en: "Risk",
    description: "Probability times impact, response, trigger, and residual risk.",
  },
  procurement: {
    ko: "조달",
    en: "Procurement",
    description: "Licenses, hardware lead time, and partner contracting.",
  },
  stakeholder: {
    ko: "이해관계자",
    en: "Stakeholder",
    description: "Influence, interest, engagement, and the decision maker.",
  },
  security: {
    ko: "보안",
    en: "Security",
    description: "Visibility, control placement, the runbook, and detection and response.",
  },
  ai_governance: {
    ko: "AI 거버넌스",
    en: "AI governance",
    description: "Training-data rights, evaluation, human approval, and model limits.",
  },
};

export const INDUSTRIES = {
  cross_industry: "Cross-industry",
  financial_services: "Financial services",
  technology: "Technology and infrastructure",
  workplace: "Collaboration",
};

export const SEGMENTS = {
  enterprise: "Enterprise",
  security_operations: "Security operations",
  internal_it: "Internal IT",
  enterprise_neocloud: "Enterprise and neocloud",
};

export const DEPLOYMENTS = {
  hybrid: "Hybrid",
  on_prem: "On premises",
  cloud: "Cloud",
};

export const RECORD_TYPES = {
  public_announcement: "Public announcement",
  validated_design: "Validated design",
  reference_scenario: "Planning scenario",
  video_demo: "Video demo",
  partner_guide: "Partner guide",
};

export const FIDELITY = {
  primary_source: "Public source",
  public_composite: "Planning scenario from public material",
};

export const COMPLEXITY = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
};

export const PHASE_CODES = Object.keys(PHASES);
export const KNOWLEDGE_CODES = Object.keys(KNOWLEDGE_AREAS);

export function phaseLabel(code) {
  return PHASES[code] || code;
}

export function knowledgeLabel(code) {
  return KNOWLEDGE_AREAS[code]?.en || code;
}
