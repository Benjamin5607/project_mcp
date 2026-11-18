/** PMI process groups plus the two extensions this case bank plans against. */
export const PHASES = {
  initiate: "착수",
  plan: "계획",
  execute: "실행",
  monitor: "감시·통제",
  close: "종료",
};

/** PMI knowledge areas, plus security and AI governance used on every Cisco AI program. */
export const KNOWLEDGE_AREAS = {
  integration: {
    ko: "통합",
    en: "Integration",
    description: "차터, 변경, 교훈, 단계 게이트를 한 계획으로 묶는다.",
  },
  scope: {
    ko: "범위",
    en: "Scope",
    description: "포함·제외·수용 기준. 파일럿과 전사 확대를 섞지 않는다.",
  },
  schedule: {
    ko: "일정",
    en: "Schedule",
    description: "리드타임, 기간 밴드, 마일스톤, 선행 관계.",
  },
  cost: {
    ko: "원가",
    en: "Cost",
    description: "CapEx·OpEx 계획 밴드. 고시 가격이나 고객 실적이 아니다.",
  },
  quality: {
    ko: "품질",
    en: "Quality",
    description: "단계 게이트와 수용 기준. 보안 검증을 품질 활동으로 둔다.",
  },
  resource: {
    ko: "자원",
    en: "Resource",
    description: "역할, 내부 공수, 파트너 역할. RACI의 Responsible와 연결한다.",
  },
  communications: {
    ko: "의사소통",
    en: "Communications",
    description: "스폰서 보고, 현업 공지, 예외 처리 채널.",
  },
  risk: {
    ko: "리스크",
    en: "Risk",
    description: "확률×영향, 대응 전략, 유발 요인, 잔여 리스크.",
  },
  procurement: {
    ko: "조달",
    en: "Procurement",
    description: "라이선스, 하드웨어 리드타임, 파트너 계약 방식.",
  },
  stakeholder: {
    ko: "이해관계자",
    en: "Stakeholder",
    description: "영향·관심, 참여 전략, 의사결정자.",
  },
  security: {
    ko: "보안",
    en: "Security",
    description: "가시성, 통제 배치, 운영 런북, 탐지·대응.",
  },
  ai_governance: {
    ko: "AI 거버넌스",
    en: "AI governance",
    description: "학습 데이터 권리, 평가, 인간 승인, 모델 사용 한계.",
  },
};

export const INDUSTRIES = {
  cross_industry: "전 산업",
  financial_services: "금융",
  technology: "기술·인프라",
  workplace: "협업",
};

export const RECORD_TYPES = {
  public_announcement: "공개 발표",
  validated_design: "검증 설계",
  reference_scenario: "계획 시나리오",
  video_demo: "영상 데모",
  partner_guide: "파트너 가이드",
};

export const FIDELITY = {
  primary_source: "공개 출처",
  public_composite: "공개 자료 기반 계획 시나리오",
};

export const COMPLEXITY = {
  low: "낮음",
  medium: "중간",
  high: "높음",
  very_high: "매우 높음",
};

export const PHASE_CODES = Object.keys(PHASES);
export const KNOWLEDGE_CODES = Object.keys(KNOWLEDGE_AREAS);

export function phaseLabel(code) {
  return PHASES[code] || code;
}

export function knowledgeLabel(code) {
  return KNOWLEDGE_AREAS[code]?.ko || code;
}
