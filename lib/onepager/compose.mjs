import { dayBand, safeHttpsUrl, usdBand, weekBand } from "../format.mjs";
import { FIDELITY, phaseLabel } from "../taxonomy.mjs";
import { charterFor } from "./charter.mjs";
import { ENGLISH_DISCLAIMER, englishCaseOverlay, englishFidelity, englishReferenceTitle, retrievalEnglish } from "./english.mjs";

const DISCLAIMER =
  "금액·기간·KPI 목표 중 계획 밴드 또는 계획 목표로 적힌 값은 고시 가격이나 특정 고객의 실적이 아닙니다. 승인 전에 최신 공개 문서와 고객 환경으로 다시 확인하세요. 민감한 구성도와 정책 값은 넣지 않았습니다.";

function referenceView(item, language) {
  const english = language === "en";
  return {
    caseCode: item.caseCode,
    slug: item.slug,
    title: english ? englishReferenceTitle(item.record) : item.title,
    fidelity: item.fidelity,
    fidelityLabel: english ? englishFidelity(item.fidelity) : FIDELITY[item.fidelity] || item.fidelity,
    retrievalScore: item.retrievalScore,
    fitScore: item.fitScore,
    why: item.why,
    excerpt: item.excerpt,
    videoUrl: safeHttpsUrl(item.videoUrl),
  };
}

function gpuResource(profile, theme) {
  if (profile.minGpu || theme === "retrieval") {
    return {
      kind: "infra",
      name: "그래픽카드",
      amount: "검색·인덱싱 0장",
      notes: "생성 모델은 스폰서가 다시 열기 전에는 검색 경로에 넣지 않습니다.",
    };
  }
  return {
    kind: "infra",
    name: "그래픽카드",
    amount: "참조 사례의 컴퓨팅 범위",
    notes: "대수는 이 원페이저에서 확정하지 않습니다. 설계 동결 때 배포 가이드로 확인합니다.",
  };
}

function mapStakeholders(record) {
  return record.stakeholders.slice(0, 8).map((item) => ({
    roleName: item.roleName,
    organization: item.organization,
    interest: item.interest,
    influence: item.influence,
    engagement: item.engagement,
    cadence: item.cadence,
  }));
}

function mapRaci(record) {
  return record.raci.slice(0, 12).map((item) => ({
    activity: item.activity,
    phase: phaseLabel(item.phase),
    accountable: item.accountable,
    responsible: [...item.responsible],
    consulted: [...item.consulted],
    informed: [...item.informed],
  }));
}

function mapWbs(record) {
  return [...record.wbs]
    .sort((left, right) => left.sort - right.sort)
    .slice(0, 8)
    .map((item) => ({
      code: item.wbsCode,
      name: item.name,
      owner: item.ownerRole,
      duration: dayBand(item.durationDaysLow, item.durationDaysHigh),
      deliverable: item.deliverable,
    }));
}

function mapMilestones(record) {
  return record.milestones.slice(0, 6).map((item) => ({
    name: item.name,
    when: `착수 후 ${weekBand(item.weekOffsetLow, item.weekOffsetHigh)}`,
    criteria: item.criteria,
  }));
}

function mapRisks(record) {
  return [...record.risks]
    .map((item) => ({
      code: item.riskCode,
      title: item.title,
      score: item.probability * item.impact,
      response: item.response,
      mitigation: item.mitigation,
      owner: item.ownerRole,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function mapKpis(record) {
  return record.kpis.slice(0, 5).map((item) => ({
    name: item.name,
    baseline: item.baseline,
    target: item.target,
    method: item.method,
    owner: item.ownerRole,
  }));
}

function mapCosts(record) {
  return record.costs.slice(0, 6).map((item) => ({
    name: item.name,
    band: usdBand(item.lowUsd, item.highUsd),
    notes: item.notes,
  }));
}

function constraintConflicts(record, profile) {
  const conflicts = [];
  const scopeOut = [];
  if (profile.airgap && record.deploymentModel !== "on_prem") {
    conflicts.push("참조 사례의 배치는 하이브리드입니다. 클라우드 연동 과업은 이 원페이저의 범위 밖으로 옮겼습니다.");
    scopeOut.push("클라우드 가시성·외부 모델 API 연동");
  }
  if (profile.airgap) scopeOut.push("페인포인트와 문서가 인트라넷 밖으로 나가는 호출");
  if (profile.minGpu) scopeOut.push("검색·인덱싱을 위한 그래픽카드 증설");
  return { conflicts, scopeOut };
}

function retrievalBody(profile, primary) {
  const conflicts = [];
  if (profile.airgap) conflicts.push("외부 임베딩 API와 클라우드 생성 API는 범위 밖입니다.");
  return {
    kind: "synthesized",
    name: "인트라넷 경량 RAG",
    summary:
      "데이터베이스에서 정보를 찾는 지연은 대형 생성 모델을 붙이기 전에 임베딩, 인덱스, 메타데이터 필터에서 줄입니다. 질의와 문서는 같은 로컬 임베딩을 쓰고 Postgres pgvector의 HNSW로 코사인 검색합니다. 검색 경로의 그래픽카드는 0장입니다. 문장 생성이 필요하면 측정이 끝난 뒤 컴팩트 모델만 별도 결정으로 엽니다.",
    rationale: `${primary.title}을 포함한 참고 사례는 제품 일괄 도입이 아니라 제약에 맞는 패턴으로 씁니다. 지연 목표 숫자는 평가 집합을 측정한 뒤에만 고정합니다.`,
    components: [
      { name: "로컬 임베딩", detail: "기본은 GPU가 필요 없는 로컬 임베딩입니다. 질의와 문서가 같은 함수를 씁니다." },
      { name: "pgvector HNSW", detail: "코사인 인덱스와 산업·솔루션 메타데이터 필터. 상위 결과는 사례가 겹치지 않게 고릅니다." },
      { name: "평가 집합", detail: "데이터 오너가 느린 질의와 기대 문서를 지정합니다. 기준을 재기 전에는 밀리초 목표를 약속하지 않습니다." },
      { name: "소형 생성 모델", detail: "선택 과업입니다. 검색이 수용된 뒤에만, 선정된 컴팩트 프로파일을 인트라넷에서 검토합니다." },
      { name: "참조 패턴", detail: `${primary.caseCode} ${primary.title}` },
    ],
    fit: [
      "페인포인트인 검색 지연은 인덱스와 평가 집합으로 다룹니다.",
      profile.airgap ? "인트라넷 요구는 임베딩과 생성의 외부 호출을 금지하는 반출 테스트로 확인합니다." : "배치 제약은 고객 문장에 폐쇄망이 없어 외부 호출을 막지 않았습니다.",
      profile.minGpu ? "그래픽 최소 요구는 검색 경로 0장으로 반영합니다." : "그래픽 최소 요구는 이번 입력에 없습니다.",
    ],
    conflicts,
    scopeIn: [
      "느린 질의로 구성된 평가 집합과 기대 문서",
      "로컬 임베딩과 pgvector HNSW 파일럿 인덱스",
      "메타데이터 필터와 상위 결과의 사례 다양성",
      "외부 호출이 없는지에 대한 반출 점검",
      "PM 검토를 통과한 원페이저와 성공 기준",
    ],
    scopeOut: [
      "대형 생성 모델을 검색 경로에 두는 일",
      "그래픽카드 증설",
      "측정 전 지연 숫자 약속",
      "참조 사례의 인프라 금액을 이 파일럿의 견적으로 쓰는 일",
      ...(profile.airgap ? ["클라우드 임베딩·생성 API"] : []),
    ],
    schedule: { label: "8–12주", note: "평가 집합이 늦어지면 인덱스가 밀립니다. 기간은 계획 밴드입니다." },
    lead: "1–2주",
  };
}

function compactTrainingBody(primary) {
  return {
    kind: "synthesized",
    name: "소형 온프레미스 모델 파일럿",
    summary:
      "학습 포드 전체가 아니라, 이미 가진 데이터로 평가할 수 있는 컴팩트 모델을 인트라넷에 두는 파일럿입니다. Secure AI Factory 포드는 그래픽 최소 요구와 충돌하면 본안에서 뺍니다.",
    rationale: `${primary.title}은 패턴 참고입니다. GPU 대수와 금액은 이 원페이저의 약속이 아닙니다.`,
    components: [
      { name: "평가 셋", detail: "업무 문장과 정답을 사람이 고정합니다." },
      { name: "컴팩트 모델", detail: "선정된 소형 프로파일만 후보로 둡니다. 용량은 배포 가이드로 확인합니다." },
      { name: "사람 승인", detail: "모델 출력이 자동 조치나 대외 약속으로 바로 나가지 않습니다." },
    ],
    fit: ["그래픽 최소 요구 때문에 풀 팩토리 포드를 본안에서 제외합니다.", "폐쇄망 또는 온프레미스 요구가 있으면 가중치와 데이터가 밖으로 나가지 않게 둡니다."],
    conflicts: ["Secure AI Factory 풀 포드는 이번 제약의 본안이 아닙니다."],
    scopeIn: ["평가 셋", "컴팩트 모델 후보 비교", "사람 승인 지점"],
    scopeOut: ["HGX 풀 포드", "그래픽카드 대규모 증설", "측정 전 성능 약속"],
    schedule: { label: "10–16주", note: "하드웨어 도착을 전제로 하지 않는 계획 밴드입니다." },
    lead: "2–4주",
  };
}

function caseLedBody(record, profile) {
  const extra = constraintConflicts(record, profile);
  return {
    kind: "case_led",
    name: record.ciscoSolutions.slice(0, 2).join(" + ") || record.title,
    summary: record.executiveSummary,
    rationale: record.architecturePattern,
    components: [
      { name: "아키텍처", detail: record.architecturePattern },
      { name: "배치", detail: record.deploymentModelLabel },
      ...record.aiCapabilities.slice(0, 3).map((item) => ({ name: "AI", detail: item })),
    ],
    fit: [
      `본안은 ${record.caseCode}의 공개 구조와 PM 필드를 따릅니다.`,
      profile.airgap ? "클라우드로 나가는 과업은 범위 밖으로 옮겼습니다." : "입력에 폐쇄망 금지가 없어 참조 사례의 배치를 유지합니다.",
      profile.minGpu ? "그래픽 최소 요구를 자원 표에 별도 행으로 적었습니다." : "그래픽 최소 요구는 이번 입력에 없습니다.",
    ],
    conflicts: extra.conflicts,
    scopeIn: record.scopeIn.slice(0, 6),
    scopeOut: [...record.scopeOut.slice(0, 6), ...extra.scopeOut],
    schedule: {
      label: weekBand(record.durationWeeksLow, record.durationWeeksHigh),
      note: record.planningBandNote,
    },
    lead: weekBand(record.leadTimeWeeksLow, record.leadTimeWeeksHigh),
  };
}

function compactTrainingTables(specialist) {
  const base = retrievalTables(specialist, { airgap: true, minGpu: true });
  return {
    ...base,
    stakeholders: base.stakeholders.map((item) =>
      item.roleName === "데이터 플랫폼"
        ? { ...item, roleName: "모델 평가 오너", interest: "컴팩트 모델이 평가 셋을 통과하는지", engagement: "후보 비교" }
        : item,
    ),
    raci: [
      { activity: "평가 셋 동결", phase: "계획", accountable: "데이터 오너", responsible: ["데이터 오너"], consulted: ["모델 평가 오너"], informed: ["고객 PM"] },
      { activity: "컴팩트 모델 후보 선정", phase: "계획", accountable: "모델 평가 오너", responsible: ["모델 평가 오너"], consulted: ["인프라", "보안 아키텍트"], informed: ["업무 스폰서"] },
      { activity: "풀 포드 제외 확인", phase: "계획", accountable: "업무 스폰서", responsible: ["고객 PM"], consulted: ["인프라"], informed: ["모델 평가 오너"] },
      { activity: "사람 승인 지점 고정", phase: "실행", accountable: "보안 아키텍트", responsible: ["보안 아키텍트"], consulted: ["모델 평가 오너"], informed: ["고객 PM"] },
      { activity: "수용", phase: "종료", accountable: "업무 스폰서", responsible: ["고객 PM"], consulted: ["모델 평가 오너", "데이터 오너"], informed: ["인프라"] },
    ],
    resources: [
      { kind: "role", name: "모델 평가 오너", amount: "6–10주", notes: "후보 비교와 평가 셋" },
      { kind: "infra", name: "그래픽카드", amount: "풀 포드 제외", notes: "컴팩트 프로파일의 용량은 배포 가이드로 확인합니다." },
      { kind: "model", name: specialist.deploymentModelLabel, amount: "컴팩트 후보", notes: specialist.deploymentGpuNote },
    ],
    decisions: [
      { code: "D1", title: "포드 제외", choice: "Secure AI Factory 풀 포드는 이번 범위가 아니다.", rationale: "그래픽 최소 요구와 충돌합니다.", owner: "업무 스폰서" },
      { code: "D2", title: "자동 조치", choice: "모델 출력은 사람 승인 없이 실행되지 않는다.", rationale: "파일럿 출력을 운영 조치로 바로 연결하지 않습니다.", owner: "보안 아키텍트" },
    ],
  };
}

function retrievalTables(specialist, profile) {
  return {
    stakeholders: [
      { roleName: "업무 스폰서", organization: "고객", interest: "검색 지연과 반출 금지를 함께 승인", influence: "high", engagement: "차터와 수용", cadence: "격주" },
      { roleName: "고객 PM", organization: "고객", interest: "범위와 검토 루프", influence: "high", engagement: "원페이저 승인과 이슈", cadence: "주간" },
      { roleName: "데이터 오너", organization: "고객", interest: "느린 질의와 정답 문서", influence: "high", engagement: "평가 집합", cadence: "주간" },
      { roleName: "데이터 플랫폼", organization: "고객", interest: "인덱스와 질의 계획", influence: "high", engagement: "HNSW와 필터", cadence: "주간" },
      { roleName: "보안 아키텍트", organization: "고객", interest: "인트라넷 밖 호출이 없을 것", influence: "high", engagement: "반출 점검", cadence: "마일스톤" },
      { roleName: "인프라", organization: "고객", interest: "그래픽카드와 외부 망을 늘리지 않을 것", influence: "medium", engagement: "배치 제약 서명", cadence: "마일스톤" },
    ],
    raci: [
      { activity: "차터와 검색 성공 기준", phase: "착수", accountable: "업무 스폰서", responsible: ["고객 PM"], consulted: ["데이터 오너", "보안 아키텍트"], informed: ["인프라"] },
      { activity: "인트라넷 경계와 반출 금지", phase: "착수", accountable: "보안 아키텍트", responsible: ["보안 아키텍트"], consulted: ["인프라", "데이터 플랫폼"], informed: ["업무 스폰서"] },
      { activity: "평가 집합 동결", phase: "계획", accountable: "데이터 오너", responsible: ["데이터 오너"], consulted: ["고객 PM", "데이터 플랫폼"], informed: ["업무 스폰서"] },
      { activity: "임베딩·HNSW 설계", phase: "계획", accountable: "데이터 플랫폼", responsible: ["데이터 플랫폼"], consulted: ["보안 아키텍트", "데이터 오너"], informed: ["고객 PM"] },
      { activity: "파일럿 인덱스 구축", phase: "실행", accountable: "데이터 플랫폼", responsible: ["데이터 플랫폼"], consulted: ["데이터 오너"], informed: ["고객 PM"] },
      { activity: "지연 측정과 반출 테스트", phase: "감시·통제", accountable: "보안 아키텍트", responsible: ["데이터 플랫폼", "보안 아키텍트"], consulted: ["데이터 오너"], informed: ["업무 스폰서"] },
      { activity: "원페이저 승인", phase: "감시·통제", accountable: "고객 PM", responsible: ["고객 PM"], consulted: ["업무 스폰서", "보안 아키텍트"], informed: ["데이터 오너"] },
      { activity: "수용과 확대 분리", phase: "종료", accountable: "업무 스폰서", responsible: ["고객 PM"], consulted: ["데이터 플랫폼", "데이터 오너"], informed: ["인프라"] },
    ],
    wbs: [
      { code: "1", name: "평가 집합", owner: "데이터 오너", duration: "5–10일", deliverable: "느린 질의와 기대 문서" },
      { code: "2", name: "인덱스 설계", owner: "데이터 플랫폼", duration: "5–8일", deliverable: "임베딩·HNSW 결정" },
      { code: "3", name: "파일럿 적재", owner: "데이터 플랫폼", duration: "10–15일", deliverable: "검색 가능한 인덱스" },
      { code: "4", name: "측정", owner: "보안 아키텍트", duration: "5–8일", deliverable: "지연과 반출 기록" },
      { code: "5", name: "수용", owner: "고객 PM", duration: "3–5일", deliverable: "승인된 원페이저" },
    ],
    milestones: [
      { name: "평가 집합 동결", when: "착수 후 1–2주", criteria: "기대 문서가 지정됨" },
      { name: "인덱스 가동", when: "착수 후 3–6주", criteria: "평가 질의가 인덱스를 탐" },
      { name: "반출 점검", when: "착수 후 6–8주", criteria: "외부 임베딩 호출 0" },
      { name: "수용", when: "착수 후 8–12주", criteria: "PM 승인과 미달 항목의 이슈화" },
    ],
    resources: [
      { kind: "role", name: "고객 PM", amount: "파일럿 기간 0.4–0.6", notes: "검토 루프 소유" },
      { kind: "role", name: "데이터 플랫폼", amount: "4–8주", notes: "청크, 임베딩, HNSW" },
      { kind: "role", name: "데이터 오너", amount: "착수 1–2주와 수용 시", notes: "평가 집합" },
      { kind: "role", name: "보안 아키텍트", amount: "1–2주", notes: "반출 점검" },
      { kind: "software", name: "Postgres pgvector", amount: "기존 인스턴스 또는 소형 VM", notes: "코사인 HNSW" },
      { kind: "software", name: "임베딩", amount: "CPU", notes: profile.airgap ? "외부 임베딩 API 없음" : "외부 임베딩을 쓰면 키를 문서에 적지 않음" },
      gpuResource(profile, "retrieval"),
      { kind: "model", name: specialist.deploymentModelLabel, amount: "생성에만 선택", notes: specialist.deploymentGpuNote },
    ],
    risks: [
      { code: "R1", title: "지연 원인을 모델 크기로 오진한다", score: 12, response: "mitigate", mitigation: "생성 모델을 켜기 전에 인덱스와 필터의 지연을 따로 측정합니다.", owner: "데이터 플랫폼" },
      { code: "R2", title: "평가 집합이 없어 개선을 증명하지 못한다", score: 12, response: "mitigate", mitigation: "데이터 오너가 질의와 기대 문서를 동결하기 전에는 인덱싱을 성공으로 보지 않습니다.", owner: "데이터 오너" },
      { code: "R3", title: "편의상 외부 API 키를 넣는다", score: 15, response: "avoid", mitigation: "런타임 환경에 외부 모델 키를 두지 않는 것을 보안 게이트로 둡니다.", owner: "보안 아키텍트" },
    ],
    kpis: [
      { name: "평가 질의 처리", baseline: "미측정", target: "동결된 평가 집합을 인덱스가 반환", method: "계획 목표. 기준 측정 전 밀리초를 약속하지 않습니다.", owner: "데이터 플랫폼" },
      { name: "외부 호출", baseline: "미점검", target: profile.airgap ? "임베딩·생성의 외부 호출 0" : "호출 대상을 게이트에 기록", method: "반출 또는 호출 로그", owner: "보안 아키텍트" },
      { name: "검색 경로 GPU", baseline: "미정", target: "0장", method: "배치 명세서", owner: "인프라" },
    ],
    costs: [
      { name: "추가 소프트웨어", band: "기존 Postgres 범위", notes: "이 파일럿의 견적이 아닙니다." },
      { name: "그래픽카드", band: "0장", notes: "검색·인덱싱 경로" },
    ],
    qualityGates: [
      { phase: "계획", name: "평가 집합 게이트", criteria: "기대 문서가 비어 있지 않다.", owner: "데이터 오너" },
      { phase: "실행", name: "반출 게이트", criteria: "외부 임베딩 호출이 없다.", owner: "보안 아키텍트" },
      { phase: "종료", name: "수용 게이트", criteria: "PM 승인과 미달 항목이 구분된다.", owner: "고객 PM" },
    ],
    communications: [
      { audience: "업무 스폰서", message: "지연 기준, 반출, GPU 0장", cadence: "격주", owner: "고객 PM" },
      { audience: "데이터 오너", message: "평가 집합 변경", cadence: "주간", owner: "고객 PM" },
      { audience: "보안", message: "외부 키와 호출 로그", cadence: "게이트마다", owner: "보안 아키텍트" },
    ],
    decisions: [
      { code: "D1", title: "검색과 생성의 분리", choice: "검색은 로컬 임베딩과 HNSW만 사용한다.", rationale: "지연과 그래픽 요구를 생성 모델과 섞지 않기 위해서입니다.", owner: "데이터 플랫폼" },
      {
        code: "D2",
        title: "외부 API",
        choice: profile.airgap ? "인트라넷 런타임에 외부 모델 키를 두지 않는다." : "외부 호출을 쓰는 경우에도 키는 비밀 저장소에만 둔다.",
        rationale: profile.airgap ? "특별 요구의 폐쇄망 조건을 실행 환경에서 유지합니다." : "키와 고객 문장을 원페이저 본문에 남기지 않습니다.",
        owner: "보안 아키텍트",
      },
      { code: "D3", title: "지연 숫자", choice: "목표 밀리초는 기준 측정 후에만 고정한다.", rationale: "측정 전 숫자를 고객 성과처럼 말하지 않습니다.", owner: "고객 PM" },
    ],
    assumptions: [
      "평가 집합의 기대 문서를 데이터 오너가 지정할 수 있다.",
      "인트라넷에서 Postgres에 pgvector를 올릴 수 있다.",
      "생성 모델은 검색 수용 뒤의 선택 과업이다.",
    ],
  };
}

function caseLedTables(record, specialist, profile) {
  const resources = record.stakeholders.slice(0, 6).map((item) => ({
    kind: "role",
    name: item.roleName,
    amount: item.cadence,
    notes: item.engagement,
  }));
  resources.push(gpuResource(profile, "case"));
  resources.push({
    kind: "model",
    name: specialist.deploymentModelLabel,
    amount: profile.minGpu ? "컴팩트 프로파일만" : "스페셜리스트 프로파일",
    notes: specialist.deploymentGpuNote,
  });
  const constraintOwner =
    record.stakeholders.find((item) => /보안|개인정보|준법/.test(item.roleName))?.roleName ||
    record.stakeholders[0].roleName;
  for (const item of (record.procurement || []).slice(0, 3)) {
    resources.push({
      kind: "procurement",
      name: item.item,
      amount: item.leadWeeks ? `리드타임 ${item.leadWeeks}주 밴드` : "리드타임 미정",
      notes: item.notes,
    });
  }
  const decisions = record.decisions.slice(0, 4).map((item) => ({
    code: item.decisionCode,
    title: item.title,
    choice: item.choice,
    rationale: item.rationale,
    owner: item.ownerRole,
  }));
  if (profile.airgap) {
    decisions.push({
      code: "D-NET",
      title: "폐쇄망",
      choice: "클라우드 연동 과업은 범위 밖으로 둔다.",
      rationale: "특별 요구가 인트라넷 밖 연결을 금지합니다.",
      owner: constraintOwner,
    });
  }
  return {
    stakeholders: mapStakeholders(record),
    raci: mapRaci(record),
    wbs: mapWbs(record),
    milestones: mapMilestones(record),
    resources,
    risks: mapRisks(record),
    kpis: mapKpis(record),
    costs: mapCosts(record),
    qualityGates: record.qualityGates.slice(0, 4).map((item) => ({
      phase: phaseLabel(item.phase),
      name: item.name,
      criteria: item.criteria,
      owner: item.ownerRole,
    })),
    communications: record.communications.slice(0, 4).map((item) => ({
      audience: item.audience,
      message: item.message,
      cadence: item.cadence,
      owner: item.ownerRole,
    })),
    decisions,
    assumptions: record.assumptions.slice(0, 5).map((item) => item.statement),
  };
}

function caseLedEnglishBody(record, profile) {
  const scopeOut = ["Treating the reference case’s planning band as this charter’s price."];
  const conflicts = [];
  if (profile.airgap) {
    conflicts.push("Cloud-connected tasks are out of scope.");
    scopeOut.push("Any task that sends documents or prompts off the intranet.");
  }
  if (profile.minGpu) scopeOut.push("A full GPU factory pod, and any GPU expansion for search or indexing.");
  const products = (record.ciscoSolutions || []).slice(0, 4).join(", ");
  return {
    kind: "case_led",
    name: record.titleEn || record.title,
    summary: `${record.architecturePattern} Products named in the public pattern: ${products}. The register below states who decides, who is accountable, and what is staffed for a pilot of that pattern.`,
    rationale: "Use the public architecture as a pattern. Do not copy its deal size into this charter, and do not describe it as a customer result.",
    components: (record.ciscoSolutions || []).slice(0, 5).map((name) => ({
      name,
      detail: "Named in the public pattern. Confirm the orderable SKU before procurement.",
    })),
    fit: [
      `The intake theme is ${profile.dominantTheme}. The operating model comes from ${record.caseCode}.`,
      profile.airgap ? "Intranet: cloud tasks are excluded." : "No air-gap rule was stated, so the reference deployment model stays.",
      profile.minGpu ? "GPU minimum: a full factory pod is out of scope." : "No GPU minimum was stated.",
    ],
    conflicts,
    scopeIn: [
      record.architecturePattern,
      "The stakeholder register, the RACI, and the resource sheet in this charter",
      "A written sponsor decision before enforcement, isolation, or a purchase",
    ],
    scopeOut,
    schedule: {
      label: `${record.durationWeeksLow}–${record.durationWeeksHigh} weeks`,
      note: "Planning band from the reference case. Not a commitment and not a quote.",
    },
    lead: `${record.leadTimeWeeksLow}–${record.leadTimeWeeksHigh} weeks`,
  };
}

function caseLedEnglishTables(overlay, specialist, profile) {
  const resources = overlay.stakeholders.slice(0, 6).map((item) => ({
    kind: "role",
    name: item.roleName,
    amount: item.cadence,
    notes: item.engagement,
  }));
  resources.push({
    kind: "infra",
    name: "GPUs",
    amount: profile.minGpu ? "0 cards on search and indexing" : "Inside the reference compute band",
    notes: "Do not freeze a card count here. Confirm it against the deployment guide at design freeze.",
  });
  resources.push({
    kind: "model",
    name: specialist.deploymentModelLabel,
    amount: profile.minGpu ? "Compact profile only" : "Specialist profile",
    notes: specialist.deploymentGpuNote,
  });
  const owner =
    overlay.stakeholders.find((item) => /security|privacy|compliance/i.test(item.roleName))?.roleName ||
    overlay.stakeholders[0].roleName;
  const decisions = overlay.decisions.map((item) => ({ ...item }));
  if (profile.airgap) {
    decisions.push({
      code: "D-NET",
      title: "Intranet boundary",
      choice: "Cloud-connected tasks stay out of scope.",
      rationale: "The special requirements forbid a connection off the intranet.",
      owner,
    });
  }
  return {
    stakeholders: overlay.stakeholders,
    raci: overlay.raci,
    wbs: overlay.raci.slice(0, 6).map((row, index) => ({
      code: String(index + 1),
      name: row.activity,
      owner: row.accountable,
      duration: "Planning band",
      deliverable: `Accountable: ${row.accountable}`,
    })),
    milestones: overlay.raci.filter((_, index) => index % 2 === 0).slice(0, 4).map((row) => ({
      name: row.activity,
      when: row.phase,
      criteria: `Accountable: ${row.accountable}`,
    })),
    resources,
    risks: overlay.risks,
    kpis: [
      {
        name: "Sponsor decision",
        baseline: "Not written",
        target: "The sponsor accepts or rejects the pilot in writing",
        method: "Decision log. No customer-result number is invented.",
        owner: overlay.stakeholders[0].roleName,
      },
    ],
    costs: [
      { name: "This charter", band: "Not a quote", notes: "Reference-case bands stay in their own table." },
    ],
    qualityGates: overlay.raci.slice(0, 3).map((row) => ({
      phase: row.phase,
      name: row.activity,
      criteria: `Accountable: ${row.accountable}`,
      owner: row.accountable,
    })),
    communications: overlay.stakeholders.slice(0, 3).map((item) => ({
      audience: item.roleName,
      message: item.interest,
      cadence: item.cadence,
      owner: overlay.stakeholders.find((row) => /PM/.test(row.roleName))?.roleName || overlay.stakeholders[0].roleName,
    })),
    decisions,
    assumptions: [
      "The public architecture is a pattern, not a purchased bill of materials.",
      "A planning band is not a quote and not a customer result.",
      "Each activity has one Accountable role.",
    ],
  };
}

export function composeDocument({ id, now, customerLabel, pain, requirements, industry, profile, picked, specialist, language = "en" }) {
  const lang = language === "ko" ? "ko" : "en";
  const primary = picked.kept[0];
  const record = primary.record;
  const overlay = lang === "en" ? englishCaseOverlay(primary.caseCode) : null;
  let body;
  let tables;
  if (lang === "en" && profile.dominantTheme === "retrieval") {
    const pack = retrievalEnglish(profile, primary, specialist);
    body = pack.body;
    tables = pack.tables;
  } else if (lang === "en" && profile.dominantTheme === "training" && profile.minGpu) {
    const pack = retrievalEnglish(profile, primary, specialist);
    body = {
      ...pack.body,
      name: "Compact model pilot",
      summary: "A full GPU factory pod is out of scope. The pilot compares one compact model on a frozen evaluation set, and a person approves any action the model suggests.",
    };
    tables = {
      ...pack.tables,
      decisions: [
        { code: "D1", title: "No full factory pod", choice: "The Secure AI Factory full pod is out of this charter.", rationale: "It conflicts with the minimize-GPU requirement.", owner: "Business sponsor" },
        ...pack.tables.decisions.slice(0, 2),
      ],
    };
  } else if (lang === "en" && overlay) {
    body = caseLedEnglishBody(record, profile);
    tables = caseLedEnglishTables(overlay, specialist, profile);
  } else {
    body = profile.dominantTheme === "retrieval"
      ? retrievalBody(profile, primary)
      : profile.dominantTheme === "training" && profile.minGpu
        ? compactTrainingBody(primary)
        : caseLedBody(record, profile);
    tables = profile.dominantTheme === "retrieval"
      ? retrievalTables(specialist, profile)
      : profile.dominantTheme === "training" && profile.minGpu
        ? compactTrainingTables(specialist)
        : caseLedTables(record, specialist, profile);
  }
  const charter = charterFor({
    language: lang,
    theme: profile.dominantTheme,
    caseCode: primary.caseCode,
    profile,
  });
  tables = {
    ...tables,
    ...charter,
    header: { ...charter.header, customerProfile: customerLabel },
  };
  const headline = `${customerLabel} — ${body.name}`;
  const executiveSummary = lang === "en"
    ? [
      `Pain: ${pain}`,
      `Constraints: ${requirements}`,
      body.summary,
      `${primary.caseCode} is a ${englishFidelity(primary.fidelity).toLowerCase()}. It is not a customer result for this charter.`,
    ].join("\n\n")
    : [
      `${customerLabel}의 페인포인트는 “${pain}”입니다. 특별 요구는 “${requirements}”입니다.`,
      body.summary,
      `${primary.caseCode}는 ${FIDELITY[primary.fidelity] || primary.fidelity}입니다. ${record.fidelityNote}`,
    ].join("\n\n");
  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    customerLabel,
    pain,
    requirements,
    industry: industry || "",
    language: lang,
    profile: {
      airgap: profile.airgap,
      minGpu: profile.minGpu,
      dominantTheme: profile.dominantTheme,
      themes: profile.themes,
    },
    specialist: {
      persona: specialist.persona,
      authoringModelId: specialist.authoringModelId,
      authoringModelLabel: specialist.authoringModelLabel,
      deploymentModelId: specialist.deploymentModelId,
      deploymentModelLabel: specialist.deploymentModelLabel,
      deploymentGpuNote: specialist.deploymentGpuNote,
      gpuClass: specialist.gpuClass,
      connection: specialist.connection,
      called: specialist.called,
      narrativeSource: specialist.narrativeSource,
      reason: specialist.reason,
      considered: specialist.considered,
      error: specialist.error,
    },
    references: picked.kept.map((item) => referenceView(item, lang)),
    rejected: picked.rejected.map((item) => ({
      caseCode: item.caseCode,
      title: lang === "en" ? item.record.titleEn || item.title : item.title,
      reason: item.rejectReason,
    })),
    solution: {
      theme: profile.dominantTheme,
      kind: body.kind,
      name: body.name,
      summary: body.summary,
      rationale: body.rationale,
      components: body.components,
      fit: body.fit,
      conflicts: body.conflicts,
      primaryCaseCode: primary.caseCode,
    },
    headline,
    executiveSummary,
    scopeIn: body.scopeIn,
    scopeOut: body.scopeOut,
    schedule: body.schedule,
    lead: body.lead,
    ...tables,
    referenceBands: picked.kept.map((item) => ({
      caseCode: item.caseCode,
      title: item.title,
      band: usdBand(item.record.dealSizeLowUsd, item.record.dealSizeHighUsd),
      note: lang === "en" ? "Planning band from the reference case. Not a quote for this pilot." : "참조 사례의 계획 밴드이며 이 파일럿의 견적이 아닙니다.",
    })),
    disclaimer: lang === "en" ? ENGLISH_DISCLAIMER : DISCLAIMER,
    reviews: [],
    approval: null,
  };
}
