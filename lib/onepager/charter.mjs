/** PM charter sections. Pass rules are definitions. They are not measured results. */

function retrievalEnglish(profile) {
  const egress = profile.airgap
    ? "Zero external embedding or generation calls during the test window."
    : "Every external call is named in the gate record.";
  return {
    header: {
      classification: profile.airgap
        ? "Intranet retrieval pilot. Search and indexing only. Not a GPU purchase and not a generation rollout."
        : "Retrieval pilot. Search and indexing only. Not a GPU purchase and not a generation rollout.",
      leadRole: "Customer PM",
    },
    goals: [
      { code: "G1", statement: "Decide, on a frozen query set, whether the slow search is an index problem or a missing-document problem.", owner: "Data owner" },
      { code: "G2", statement: "Run embedding and search on the intranet with zero GPUs on that path.", owner: "Infrastructure owner" },
      { code: "G3", statement: "Leave the sponsor a written baseline they can accept or reject. Do not leave them a latency percentage.", owner: "Customer PM" },
    ],
    successMeasures: [
      { name: "Signed queries answered from the pilot index", baseline: "Not measured", target: "Every signed query returns from the pilot index on the side path.", method: "Count against the frozen set. Split index time from any later generation time. Do not publish a millisecond target before this count exists.", owner: "Data platform" },
      { name: "External calls", baseline: "Not tested", target: egress, method: "Packet or DNS evidence, signed by the security architect. A missing log is a failed gate, not a pass.", owner: "Security architect" },
      { name: "GPUs on the retrieval path", baseline: "Unset", target: "0 cards on chunking, embedding, and search.", method: "Host specification signed by the infrastructure owner before the index is called accepted.", owner: "Infrastructure owner" },
      { name: "Sponsor decision", baseline: "Not written", target: "Accept, or reject with the failed queries listed.", method: "Decision log. Silence is not acceptance.", owner: "Customer PM" },
    ],
    expectedOutcomes: [
      { outcome: "A frozen set of slow queries, each with the document that should have been returned.", evidence: "Data owner signature on the set. Unsigned rows do not count." },
      { outcome: "A side-path index the user-facing search has not been switched to.", evidence: "Build-time note, separate from query time." },
      { outcome: "A security sign-off that the runtime has no external model key.", evidence: "Egress record. The one-pager itself never contains a key." },
      { outcome: "A sponsor decision to keep the index, or to open a separate charter for generation or GPUs.", evidence: "Decision log entry D3. A follow-on is a new charter, not a silent scope add." },
    ],
    rollout: [
      { phase: "1. Baseline", protocol: "Freeze the slow queries and the expected document for each. Do not change the user-facing search and do not install a model.", success: "Every query has an expected document and an owner. The sponsor has not been given a latency number.", fallback: "If the data owner cannot name the expected document, stop. Indexing does not start." },
      { phase: "2. Side-path index", protocol: "Load one local embedder and one pgvector HNSW index on intranet Postgres. Keep it off the user-facing path.", success: "Each frozen query returns from the pilot index. The host list shows 0 GPUs.", fallback: "If the design needs a GPU or an external embedding API, tear the index down and return to phase 1." },
      { phase: "3. Measure", protocol: "Time the frozen set. Record index time apart from any other time. Run the egress test.", success: "A written baseline and an egress record exist. No millisecond target is added in this phase.", fallback: "If an external call appears, fail the gate, remove the path, and do not continue to acceptance." },
      { phase: "4. Accept or split", protocol: "The sponsor accepts the baseline or rejects it in writing. Any generation or GPU request is written up as a new charter.", success: "One decision, one Accountable, and a list of queries that missed.", fallback: "If someone adds a generator to this charter to make the demo faster, the acceptance is void and the review reopens." },
    ],
    governance: {
      note: "The customer PM is the only Accountable for scope and for acceptance. Cisco delivery is Responsible for checking the public pattern against these constraints and is not Accountable for the customer's data, policy, or price. Weekly, before the next phase, those two parties review the decision log and the egress record. An implementation partner is Responsible only for an interface procurement has named. Until a firm is named, that seat stays empty and cannot be Accountable. Two Accountable names on one row is a defect, not joint governance.",
      parties: [
        { party: "Customer PM", side: "Customer", seat: "Accountable for the charter, change control, and the accept-or-reject decision." },
        { party: "Cisco delivery architect", side: "Cisco", seat: "Responsible for the pattern fit. Consulted on the index design. Not a price owner." },
        { party: "Data platform", side: "Customer", seat: "Accountable for the embedder, HNSW, and the split between index time and anything else." },
        { party: "Security architect", side: "Customer", seat: "Accountable for the intranet boundary and the egress gate." },
      ],
    },
    postmortem: {
      when: "Within 10 business days of the sponsor's accept or reject decision.",
      owner: "Customer PM",
      purpose: "Write what was learned. Leave the answers blank until the pilot has been measured. Do not backfill a success percentage.",
      questions: [
        "Which queries were slow because of the index, and which were slow because the expected document was missing or mislabeled?",
        "Did anyone ask for an external model key or a GPU, and was that request kept out of this charter?",
        "Where did the RACI break: two people acting as Accountable, or a vendor step with nobody Accountable?",
        "What will the next charter refuse to copy from a reference-case price or a reference-case duration?",
      ],
    },
  };
}

function retrievalKorean(profile) {
  const egress = profile.airgap ? "시험 구간에 임베딩·생성의 외부 호출이 없다." : "외부 호출은 게이트 기록에 이름을 남긴다.";
  return {
    header: {
      classification: "인트라넷 검색 파일럿. 검색과 인덱싱만 다룬다. GPU 구매도 생성 모델 롤아웃도 아니다.",
      leadRole: "고객 PM",
    },
    goals: [
      { code: "G1", statement: "동결된 질의 집합으로, 느린 검색이 인덱스 문제인지 문서 문제인지 가른다.", owner: "데이터 오너" },
      { code: "G2", statement: "임베딩과 검색을 인트라넷에서 하고, 그 경로의 GPU는 0장으로 둔다.", owner: "인프라" },
      { code: "G3", statement: "스폰서에게 지연 백분율이 아니라 수용하거나 거절할 기준 기록을 남긴다.", owner: "고객 PM" },
    ],
    successMeasures: [
      { name: "서명된 질의가 파일럿 인덱스에서 반환되는가", baseline: "미측정", target: "서명된 질의는 모두 측면 경로 인덱스에서 반환된다.", method: "동결 집합으로 센다. 인덱스 시간과 그 외 시간을 분리한다. 이 수가 생기기 전에 밀리초 목표를 쓰지 않는다.", owner: "데이터 플랫폼" },
      { name: "외부 호출", baseline: "미점검", target: egress, method: "패킷 또는 DNS 근거. 로그가 없으면 실패다.", owner: "보안 아키텍트" },
      { name: "검색 경로 GPU", baseline: "미정", target: "청크, 임베딩, 검색에 0장.", method: "인프라가 서명한 호스트 명세.", owner: "인프라" },
      { name: "스폰서 결정", baseline: "없음", target: "수용하거나, 실패한 질의를 적어 거절한다.", method: "결정 기록. 침묵은 수용이 아니다.", owner: "고객 PM" },
    ],
    expectedOutcomes: [
      { outcome: "느린 질의와, 각 질의가 돌려줘야 했던 문서가 동결된다.", evidence: "데이터 오너 서명. 서명 없는 행은 세지 않는다." },
      { outcome: "사용자 검색으로 전환하지 않은 측면 경로 인덱스가 있다.", evidence: "구축 시간 기록. 질의 시간과 분리한다." },
      { outcome: "런타임에 외부 모델 키가 없다는 보안 서명.", evidence: "반출 기록. 원페이저 본문에 키를 적지 않는다." },
      { outcome: "인덱스를 유지하거나, 생성·GPU는 새 차터로 연다는 스폰서 결정.", evidence: "결정 기록. 조용히 범위를 넓히지 않는다." },
    ],
    rollout: [
      { phase: "1. 기준", protocol: "느린 질의와 기대 문서를 동결한다. 사용자 검색과 모델은 바꾸지 않는다.", success: "모든 질의에 기대 문서와 소유자가 있다. 스폰서에게 지연 숫자를 주지 않았다.", fallback: "기대 문서를 지정할 수 없으면 멈춘다. 인덱싱을 시작하지 않는다." },
      { phase: "2. 측면 인덱스", protocol: "로컬 임베딩과 pgvector HNSW 하나를 인트라넷 Postgres에 올린다. 사용자 경로에는 붙이지 않는다.", success: "동결된 질의가 파일럿 인덱스에서 반환된다. 호스트 목록의 GPU는 0장이다.", fallback: "GPU나 외부 임베딩 API가 필요하면 인덱스를 걷어 내고 1단계로 돌아간다." },
      { phase: "3. 측정", protocol: "동결 집합의 시간을 재고, 반출 시험을 한다.", success: "기준 기록과 반출 기록이 있다. 이 단계에서 밀리초 목표를 추가하지 않는다.", fallback: "외부 호출이 보이면 게이트를 실패로 두고 수용으로 넘어가지 않는다." },
      { phase: "4. 수용 또는 분리", protocol: "스폰서가 기준을 수용하거나 문서로 거절한다. 생성이나 GPU 요청은 새 차터로 적는다.", success: "결정 하나, Accountable 하나, 미달 질의 목록.", fallback: "데모를 빨리 하려고 생성 모델을 이 차터에 넣으면 수용은 무효이고 검토를 다시 연다." },
    ],
    governance: {
      note: "범위와 수용의 Accountable은 고객 PM 한 사람이다. Cisco 딜리버리는 공개 패턴이 제약에 맞는지 확인할 Responsible이고, 고객의 데이터·정책·가격의 Accountable이 아니다. 다음 단계로 넘어가기 전에 두 당사자가 결정 기록과 반출 기록을 본다. 구현 파트너는 조달이 이름을 적은 인터페이스의 Responsible만 된다. 회사 이름이 없으면 그 자리는 비워 두고 Accountable로 올리지 않는다. 한 행에 Accountable이 둘이면 거버넌스 결함이다.",
      parties: [
        { party: "고객 PM", side: "고객", seat: "차터, 변경 통제, 수용 또는 거절의 Accountable." },
        { party: "Cisco 딜리버리", side: "Cisco", seat: "패턴 적합성의 Responsible. 인덱스 설계에는 Consulted. 가격의 소유자가 아니다." },
        { party: "데이터 플랫폼", side: "고객", seat: "임베딩, HNSW, 시간 분리의 Accountable." },
        { party: "보안 아키텍트", side: "고객", seat: "인트라넷 경계와 반출 게이트의 Accountable." },
      ],
    },
    postmortem: {
      when: "스폰서가 수용 또는 거절을 적은 뒤 영업일 10일 이내.",
      owner: "고객 PM",
      purpose: "배운 점을 적는다. 측정 전에는 답을 채우지 않는다. 성공 백분율을 나중에 끼워 넣지 않는다.",
      questions: [
        "어떤 질의는 인덱스 때문에 느렸고, 어떤 질의는 기대 문서가 없거나 잘못 붙어 느렸는가?",
        "외부 모델 키나 GPU를 요청한 일이 있었고, 그 요청을 이 차터 밖에 두었는가?",
        "RACI가 어디서 깨졌는가? Accountable이 둘이었는가, 벤더 단계에 Accountable이 없었는가?",
        "다음 차터가 참조 사례의 가격이나 기간에서 베끼지 않을 것은 무엇인가?",
      ],
    },
  };
}

const CASE_CHARTERS = {
  "CSCO-HYP-FIN-001": {
    classification: "AI visibility and limited enforcement pilot. Detect before enforce. The system of record stays out.",
    leadRole: "Customer PM",
    goals: [
      { code: "G1", statement: "Show which AI tools the security team cannot see, on a named non-production sample, before any block.", owner: "Security operations" },
      { code: "G2", statement: "Keep Hypershield in observe mode until the application owner signs the would-be-block list.", owner: "Data-center network architect" },
      { code: "G3", statement: "Get one written sponsor decision before limited enforcement. Do not claim an outage-free cutover in advance.", owner: "CISO (sponsor)" },
    ],
    measures: [
      { name: "Inventory coverage of the named sample", baseline: "Not taken", target: "The sample's IdP and endpoint sources are both in the inventory, and gaps are on the issue log.", method: "Security operations lists what was not seen. Unseen tools are not described as blocked.", owner: "Security operations" },
      { name: "Observe before enforce", baseline: "Not started", target: "No enforce action until the sponsor signs, and the system of record is absent from the enforce list.", method: "Change record plus the would-be-block log.", owner: "Data-center network architect" },
      { name: "False-positive disposition", baseline: "Not reviewed", target: "Every would-be block on a named application is either whitelisted or still in observe.", method: "SOC and the application owner sign the list. This charter does not set a false-positive percentage.", owner: "Security operations" },
    ],
    outcomes: [
      { outcome: "A private inventory of the sample, shared with owners before any punishment-style block.", evidence: "Issue log of gaps. Gaps stay out of enforcement." },
      { outcome: "An observe-mode window with a written would-be-block review.", evidence: "SOC and application-owner sign-off. No percentage is attached." },
      { outcome: "Either a limited enforce decision on one segment, or a decision to stay in observe.", evidence: "Sponsor signature. Rollback is a return to observe, owned by the network architect." },
    ],
    rollout: [
      { phase: "1. Baseline and integration", protocol: "Place visibility on a non-production tenant. Do not activate blocking policy. Confirm the telemetry path the customer already runs.", success: "The named sample is visible, and the application owner confirms the named workflow still completes.", fallback: "If the named workflow errors, remove the placement the same day and stop the phase." },
      { phase: "2. Shadow mode", protocol: "Log would-be blocks. Do not enforce. Keep the system of record out of the policy.", success: "SOC and the application owner have reviewed the log and listed false positives.", fallback: "If a would-be block touches the system of record, pause and retune. Do not move to tuning sign-off." },
      { phase: "3. Tune", protocol: "Whitelist the applications the owner names. Adjust thresholds only from the phase 2 log.", success: "SOC and the application owner sign the list. Unsigned rows stay in observe.", fallback: "If they do not sign, remain in phase 2. Do not invent a false-positive rate to skip the signature." },
      { phase: "4. Limited enforce", protocol: "One segment, after the sponsor signs. A person can return the segment to observe.", success: "The enforce decision names the segment and the rollback owner.", fallback: "Any unexpected effect on the named workflow returns that segment to observe. The return is not optional." },
    ],
    parties: [
      { party: "Customer PM", side: "Customer", seat: "Accountable for scope, the phase gate, and the decision log." },
      { party: "Cisco security architect", side: "Cisco", seat: "Responsible for the public-pattern fit and the test scenarios. Not accountable for customer policy." },
      { party: "Security operations", side: "Customer", seat: "Accountable for the inventory and the would-be-block review." },
      { party: "Data-center network architect", side: "Customer", seat: "Accountable for placement, the change window, and the return to observe." },
    ],
    note: "Weekly cross-party sync is required before the next phase. Cisco delivery does not share Accountable with the customer on policy or on enforcement. An implementation partner, including an MSP, is added only when procurement names the firm, and then only as Responsible for the interface they own. The SIEM path is the customer's existing one. This charter does not promise an MTTR reduction.",
    questions: [
      "Which tools showed up only after the endpoint sample, and were those gaps kept out of enforcement?",
      "Did observe mode log a would-be block on the system of record, and was the phase paused?",
      "Who was asked to be a second Accountable, and was that request refused?",
      "What will the next charter refuse to state as a customer result?",
    ],
  },
  "CSCO-AIF-NVD-001": {
    classification: "First AI factory pod, sized to one validation job. Not an enterprise-wide GPU estate.",
    leadRole: "Infrastructure PM",
    goals: [
      { code: "G1", statement: "Pass a power and cooling gate before any order.", owner: "Data-center facilities" },
      { code: "G2", statement: "Run one named validation job, with one NOS, not both.", owner: "Network architect" },
      { code: "G3", statement: "Keep security in observe mode before that job is called accepted.", owner: "Security architect" },
    ],
    measures: [
      { name: "Capacity gate", baseline: "Not checked", target: "No order is placed before facilities signs power and cooling.", method: "Gate record. A slide is not a signature.", owner: "Data-center facilities" },
      { name: "Validation job", baseline: "Not run", target: "The one named job completes under the observe-mode rule.", method: "AI platform records the job name and the result. No cluster-wide utilization target is set here.", owner: "AI platform" },
      { name: "Operating model", baseline: "Unset", target: "One NOS, one change window, one runbook.", method: "Network architect's acceptance note.", owner: "Network architect" },
    ],
    outcomes: [
      { outcome: "A size card the sponsor can point at, capped at one validation job.", evidence: "Sponsor signature. 'Enterprise demand' is not a size." },
      { outcome: "Either a passed capacity gate or a written stop.", evidence: "Facilities record before purchase." },
      { outcome: "An operations acceptance, or a decision to keep the pod out of production.", evidence: "Infrastructure sponsor's close decision." },
    ],
    rollout: [
      { phase: "1. Size and power", protocol: "Write the size card for one job. Facilities checks power and cooling. No order.", success: "The card names the job. Facilities has signed or stopped the work.", fallback: "If power fails the gate, the project stops. It does not resize itself in a meeting." },
      { phase: "2. Fabric choice", protocol: "Pick NX-OS or SONiC, the one operations already runs. Pick one storage partner.", success: "One NOS is named. The other is out.", fallback: "If both NOS tracks are still open at the design gate, the gate fails." },
      { phase: "3. Observe and first job", protocol: "Security observe mode, then the one validation job.", success: "The job result is written down, and observe mode was on before it.", fallback: "If the job is proposed without observe mode, it does not run." },
      { phase: "4. Accept", protocol: "Sponsor accepts the operating model or keeps the pod non-production.", success: "A written decision with one Accountable.", fallback: "A request to grow the pod to unnamed demand opens a new charter." },
    ],
    parties: [
      { party: "Infrastructure PM", side: "Customer", seat: "Accountable for the integrated plan and the dependency log." },
      { party: "Infrastructure sponsor", side: "Customer", seat: "Accountable for the size card and for refusing an open-ended pod." },
      { party: "Network architect", side: "Customer", seat: "Accountable for one NOS and the joint runbook." },
      { party: "Security architect", side: "Customer", seat: "Accountable for observe mode before the first job." },
    ],
    note: "Cisco delivery is Consulted on the public factory pattern and is not Accountable for facilities, export, or the customer's runbook. GPU count is not frozen in this charter. A partner is named by procurement or the seat stays empty.",
    questions: [
      "Did any order go out before the capacity gate?",
      "Did the team try to run both NOS choices in the pilot?",
      "Was the first job's success described with a number this charter did not measure?",
      "What did the sponsor refuse to add to the size card?",
    ],
  },
  "CSCO-XDR-SOC-001": {
    classification: "SOC pilot for three incident types. Low-risk enrichment may be automated. Isolation stays with a person.",
    leadRole: "SOC manager",
    goals: [
      { code: "G1", statement: "Select three incident types and the fields that may enter a draft summary.", owner: "CISO (sponsor)" },
      { code: "G2", statement: "Keep isolation, blocking, and account changes behind a named person.", owner: "Response lead" },
      { code: "G3", statement: "Describe how time will be measured. Do not state a time-saved percentage.", owner: "Customer PM" },
    ],
    measures: [
      { name: "Incident-type boundary", baseline: "Not selected", target: "Exactly three types are in scope, each with an owner.", method: "Charter list signed by the SOC manager.", owner: "SOC manager" },
      { name: "Human gate on high-impact actions", baseline: "Not tested", target: "A test that isolates a host with no person fails the gate.", method: "Playbook test record.", owner: "CISO (sponsor)" },
      { name: "Draft versus customer language", baseline: "Not reviewed", target: "No model sentence is sent outside until a person edits it.", method: "Sample of drafts with the editor's name.", owner: "SOC manager" },
    ],
    outcomes: [
      { outcome: "A field allow-list signed before any prompt test.", evidence: "Privacy signature." },
      { outcome: "A low-risk playbook and a separate high-impact rule.", evidence: "Two documents. They are not merged to speed a demo." },
      { outcome: "A measurement definition for analyst time, with no percentage in the proposal.", evidence: "Customer PM's wording in the decision log." },
    ],
    rollout: [
      { phase: "1. Select", protocol: "Name three incident types and the field allow-list.", success: "Both lists are signed. Untyped incidents stay out.", fallback: "If privacy has not signed the fields, no prompt is tested." },
      { phase: "2. Connect and draft", protocol: "Connect telemetry for those types. Summaries stay drafts.", success: "A senior analyst has scored the drafts on the evaluation set.", fallback: "If a draft is pasted into a customer notice, the phase stops and the notice is withdrawn." },
      { phase: "3. Low-risk playbook", protocol: "Automation only for enrichment the response lead lists as low-risk.", success: "The high-impact list is separate and unsigned actions do not run.", fallback: "Any isolation in this phase fails the gate." },
      { phase: "4. Accept the rhythm", protocol: "CISO accepts the operating rhythm or keeps high-impact actions manual.", success: "A written decision.", fallback: "A request to quote a time-saved percentage reopens the charter." },
    ],
    parties: [
      { party: "SOC manager", side: "Customer", seat: "Accountable for the three types and the draft-review rhythm." },
      { party: "CISO (sponsor)", side: "Customer", seat: "Accountable for the high-impact rule and for what the model may see." },
      { party: "Response lead", side: "Customer", seat: "Accountable for the playbook. High-impact actions wait for the CISO." },
      { party: "Customer PM", side: "Customer", seat: "Accountable for the wording of results. Not accountable for a containment action." },
    ],
    note: "Cisco delivery explains the public XDR pattern and does not become Accountable for containment. A managed detection partner is in the RACI only after the customer names them. This charter does not claim an MTTR change.",
    questions: [
      "Did any high-impact action run without the named person?",
      "Which draft sentences were corrected, and were any of them sent outside first?",
      "Did the proposal pick up a time-saved percentage from a reference, and was it removed?",
      "Which of the three incident types was a poor fit, and why?",
    ],
  },
};

function genericEnglish(caseCode, profile) {
  const boundary = profile.airgap ? "Cloud-connected tasks stay out of scope." : "No air-gap rule was stated.";
  return {
    classification: `Pilot of the public pattern ${caseCode}. A planning charter, not a customer result.`,
    leadRole: "Customer PM",
    goals: [
      { code: "G1", statement: "Name the pilot boundary and the one workflow it covers.", owner: "Customer PM" },
      { code: "G2", statement: "Keep one Accountable on every activity, including vendor steps.", owner: "Customer PM" },
      { code: "G3", statement: boundary, owner: "Security architect" },
    ],
    measures: [
      { name: "Boundary", baseline: "Not written", target: "The in-scope workflow is named, and everything else is on the out list.", method: "Charter review with the sponsor.", owner: "Customer PM" },
      { name: "Single Accountable", baseline: "Not checked", target: "No activity has two Accountable roles or an empty Accountable.", method: "RACI review at each phase gate.", owner: "Customer PM" },
      { name: "Sponsor decision", baseline: "Not written", target: "The sponsor accepts the phase or stops it in writing.", method: "Decision log. A meeting note without a decision is not acceptance.", owner: "Customer PM" },
    ],
    outcomes: [
      { outcome: "A phase plan with a fallback the owner can execute without a new meeting.", evidence: "The rollout table in this charter, signed at kickoff." },
      { outcome: "A vendor seat that is either named by procurement or left empty.", evidence: "Procurement note. An unnamed partner is not Accountable." },
      { outcome: "A close decision that separates what was observed from what was hoped.", evidence: "Postmortem. Blank until the pilot ends." },
    ],
    rollout: [
      { phase: "1. Charter", protocol: "Freeze the workflow, the out-of-scope list, and the RACI.", success: "The sponsor signs the boundary.", fallback: "If the boundary is still 'the enterprise', the project does not start." },
      { phase: "2. Design", protocol: "Map the public pattern to the constraints. Name any partner or leave the seat empty.", success: "One design, one Accountable for the customer's policy.", fallback: "If the design needs a constraint the sponsor removed, stop and rewrite the charter." },
      { phase: "3. Controlled pilot", protocol: "Run the named workflow in the safest mode the pattern allows, with a person on high-impact actions.", success: "Evidence for the success measures, not a slide of expected benefits.", fallback: "If the pilot affects an unnamed workflow, roll back that change the same day." },
      { phase: "4. Decide", protocol: "Accept, stay in the safe mode, or stop.", success: "A written decision.", fallback: "A request to quote an unmeasured improvement reopens the review." },
    ],
    parties: [
      { party: "Customer PM", side: "Customer", seat: "Accountable for scope, the phase gates, and the decision log." },
      { party: "Cisco delivery architect", side: "Cisco", seat: "Responsible for the pattern fit. Not accountable for policy or price." },
    ],
    note: "Cisco delivery does not share Accountable with the customer. A vendor or MSP is written into the RACI only after procurement names the firm, and then as Responsible for their interface only. Weekly syncs review the decision log before the next phase.",
    questions: [
      "Which constraint was nearly dropped to keep a demo moving?",
      "Was a vendor step left with nobody Accountable?",
      "What number was almost copied from a reference case?",
      "What should the next charter state on the first page so this mistake cannot repeat?",
    ],
  };
}

function pack(source, profile) {
  return {
    header: { classification: source.classification, leadRole: source.leadRole },
    goals: source.goals,
    successMeasures: source.measures,
    expectedOutcomes: source.outcomes,
    rollout: source.rollout,
    governance: { note: source.note, parties: source.parties },
    postmortem: {
      when: "Within 10 business days of the sponsor's accept, stay, or stop decision.",
      owner: source.leadRole,
      purpose: "Record learning points after the pilot. Do not write them as if the pilot had already succeeded.",
      questions: source.questions,
    },
  };
}

export function charterFor({ language, caseCode, profile }) {
  const english = pack(CASE_CHARTERS[caseCode] || genericEnglish(caseCode, profile), profile);
  if (language !== "ko") return english;
  return {
    ...english,
    header: {
      classification: `${english.header.classification} 한국어 화면은 같은 차터 구조다. 측정하지 않은 수치는 결과로 적지 않는다.`,
      leadRole: english.header.leadRole,
    },
  };
}
