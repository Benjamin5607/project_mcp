/** English charter copy. Korean remains available when language is "ko". */

export function retrievalEnglish(profile, primary, specialist) {
  const airgap = profile.airgap
    ? "Security architect signs an egress test before any index is called accepted. The runtime gets no external model key."
    : "The intake does not forbid cloud calls. Any key still stays in a secret store, not in this charter.";
  return {
    body: {
      kind: "synthesized",
      name: "Intranet retrieval pilot",
      summary:
        "The complaint is retrieval latency, so the pilot measures a frozen query set against the index before anyone adds a larger model. Query and document use the same local embedder. Postgres pgvector answers with cosine search on an HNSW index. The retrieval path has zero GPUs. A compact generation model is a separate decision, opened only after the baseline is accepted.",
      rationale: `${primary.caseCode} is a pattern reference, not the thing we are buying. ${primary.titleEn || primary.title}. Do not freeze a millisecond target until the data owner’s query set has been timed.`,
      components: [
        { name: "Frozen query set", detail: "Data owner names the slow queries and the document each one should have returned. About 30 queries. No acceptance test exists before this is frozen." },
        { name: "Local embedder", detail: "CPU only. The same function embeds the query and the chunk. Default is the case bank’s local embedder, which does not call out." },
        { name: "pgvector HNSW", detail: "Cosine index on the existing Postgres, or one small VM if that instance cannot take the extension. Filter on industry and solution metadata." },
        { name: "Egress test", detail: airgap },
        { name: "GPUs", detail: "Zero cards on chunking, embedding, and search. Ordering GPUs is out of this charter." },
        { name: "Optional generator", detail: `${specialist.deploymentModelLabel} is the compact profile to revisit later. ${specialist.deploymentGpuNote}` },
      ],
      fit: [
        "Pain: slow database retrieval is handled by the index and the frozen query set, not by a larger model.",
        profile.airgap ? "Intranet: embedding and generation must show zero external calls in the egress test." : "No air-gap rule was stated, so external calls are not banned.",
        profile.minGpu ? "GPU minimum: the retrieval path is specified as 0 cards, with a named owner." : "No GPU minimum was stated.",
      ],
      conflicts: profile.airgap ? ["External embedding and generation APIs are out of scope."] : [],
      scopeIn: [
        "A frozen set of slow queries and the expected document for each",
        "Local embedding and one pgvector HNSW index on intranet Postgres",
        "A written latency baseline on that set, with no target number promised up front",
        "An egress test owned by the security architect",
        "This charter, the RACI, and the resource sheet accepted by the sponsor",
      ],
      scopeOut: [
        "Putting a large generative model on the retrieval path",
        "Buying GPUs for search or indexing",
        "A millisecond SLO before the baseline exists",
        "Using a reference case’s infrastructure band as this pilot’s price",
        ...(profile.airgap ? ["Any cloud embedding or generation API"] : []),
      ],
      schedule: { label: "8–12 weeks", note: "The index cannot start until the query set is frozen. The band is a plan, not a commitment." },
      lead: "1–2 weeks",
    },
    tables: {
      stakeholders: [
        { roleName: "Business sponsor", organization: "Customer", interest: "The search complaint is either fixed or shown to be a data problem, without a GPU purchase.", influence: "high", engagement: "Accountable for the charter and for accepting the measured baseline. Does not set a latency number before that baseline exists.", cadence: "Biweekly" },
        { roleName: "Customer PM", organization: "Customer", interest: "Scope, the review loop, and a single place where decisions are written down.", influence: "high", engagement: "Owns the integrated plan, this one-pager, and change control. The only person who adds scope.", cadence: "Weekly" },
        { roleName: "Data owner", organization: "Customer", interest: "The queries people actually complain about, and the document that should have come back.", influence: "high", engagement: "Accountable for freezing the query set. The pilot has no acceptance test without this person.", cadence: "Weekly until freeze, then at acceptance" },
        { roleName: "Data platform", organization: "Customer", interest: "The index, the embedder, and the query plan on the database they already run.", influence: "high", engagement: "Accountable for HNSW build and for separating index time from model time in the measurements.", cadence: "Weekly" },
        { roleName: "Security architect", organization: "Customer", interest: "No prompt, chunk, or embedding leaves the intranet.", influence: "high", engagement: "Accountable for the egress test and for refusing an external API key in the runtime.", cadence: "At the design gate and the acceptance gate" },
        { roleName: "Infrastructure owner", organization: "Customer", interest: "No new GPU order and no new path to the public internet.", influence: "medium", engagement: "Confirms the retrieval hosts and signs the zero-GPU line. Consulted, not accountable, for the index design.", cadence: "At the design gate" },
        { roleName: "Cisco delivery architect", organization: "Cisco", interest: "The public pattern still fits the intranet and zero-GPU constraints.", influence: "medium", engagement: "Consulted on the index design. Not accountable for the customer's data, acceptance, or price.", cadence: "At the design gate" },
      ],
      raci: [
        { activity: "Charter and the rule for when a latency number may be frozen", phase: "Initiate", accountable: "Business sponsor", responsible: ["Customer PM"], consulted: ["Data owner", "Security architect"], informed: ["Infrastructure owner"] },
        { activity: "Intranet boundary and the ban on external model keys", phase: "Initiate", accountable: "Security architect", responsible: ["Security architect"], consulted: ["Infrastructure owner", "Data platform"], informed: ["Business sponsor"] },
        { activity: "Freeze the slow-query set and the expected document for each query", phase: "Plan", accountable: "Data owner", responsible: ["Data owner"], consulted: ["Customer PM", "Data platform"], informed: ["Business sponsor"] },
        { activity: "Choose the embedder and the HNSW parameters on existing Postgres", phase: "Plan", accountable: "Data platform", responsible: ["Data platform"], consulted: ["Security architect", "Data owner", "Cisco delivery architect"], informed: ["Customer PM"] },
        { activity: "Load the pilot index and record build time separately from query time", phase: "Execute", accountable: "Data platform", responsible: ["Data platform"], consulted: ["Data owner"], informed: ["Customer PM"] },
        { activity: "Measure the frozen set and run the egress test", phase: "Monitor", accountable: "Security architect", responsible: ["Data platform", "Security architect"], consulted: ["Data owner"], informed: ["Business sponsor"] },
        { activity: "Accept or reject the pilot against the written baseline", phase: "Monitor", accountable: "Customer PM", responsible: ["Customer PM"], consulted: ["Business sponsor", "Security architect"], informed: ["Data owner"] },
        { activity: "Split any GPU or generation follow-on into a new charter", phase: "Close", accountable: "Business sponsor", responsible: ["Customer PM"], consulted: ["Data platform", "Infrastructure owner"], informed: ["Data owner"] },
      ],
      wbs: [
        { code: "1", name: "Freeze the query set", owner: "Data owner", duration: "5–10 days", deliverable: "Slow queries plus the expected document for each" },
        { code: "2", name: "Index design", owner: "Data platform", duration: "5–8 days", deliverable: "Embedder choice, HNSW parameters, host name" },
        { code: "3", name: "Pilot load", owner: "Data platform", duration: "10–15 days", deliverable: "Searchable index and a build-time note" },
        { code: "4", name: "Baseline and egress test", owner: "Security architect", duration: "5–8 days", deliverable: "Latency table and egress evidence" },
        { code: "5", name: "Accept or split", owner: "Customer PM", duration: "3–5 days", deliverable: "Signed charter outcome and any follow-on charter" },
      ],
      milestones: [
        { name: "Query set frozen", when: "Week 1–2", criteria: "Every query has an expected document. Unsigned rows do not count." },
        { name: "Index serving the set", when: "Week 3–6", criteria: "Each frozen query returns from the index." },
        { name: "Egress gate", when: "Week 6–8", criteria: "Evidence of zero external embedding calls." },
        { name: "Sponsor acceptance", when: "Week 8–12", criteria: "Baseline accepted, or a written rejection with the failed queries listed." },
      ],
      resources: [
        { kind: "role", name: "Customer PM", amount: "0.5 FTE for 8–12 weeks", notes: "Internal. Owns the review loop and the charter." },
        { kind: "role", name: "Data platform", amount: "1 FTE for 4–8 weeks", notes: "Internal. Chunking, embedder, HNSW, measurement split." },
        { kind: "role", name: "Data owner", amount: "1–2 weeks, then acceptance", notes: "Internal. The query set is this person’s deliverable." },
        { kind: "role", name: "Security architect", amount: "1–2 weeks", notes: "Internal. Egress test and key ban." },
        { kind: "role", name: "Infrastructure owner", amount: "A few days at the gates", notes: "Internal. Confirms host and the zero-GPU line." },
        { kind: "software", name: "Postgres with pgvector", amount: "Existing instance, or one small VM", notes: "Cosine HNSW. Not a new platform program." },
        { kind: "software", name: "Embedder", amount: "CPU only", notes: "Same function for query and document. No external embedding API." },
        { kind: "infra", name: "GPUs", amount: "0 cards on the retrieval path", notes: "A generation model is not ordered inside this charter." },
        { kind: "model", name: specialist.deploymentModelLabel, amount: "Not deployed in this pilot", notes: specialist.deploymentGpuNote },
      ],
      risks: [
        { code: "R1", title: "The team treats latency as a model-size problem", score: 16, response: "mitigate", mitigation: "Do not enable a generator until index latency and filter latency are measured on their own.", owner: "Data platform" },
        { code: "R2", title: "The query set is never frozen, so improvement cannot be shown", score: 16, response: "mitigate", mitigation: "Indexing does not count as success until the data owner signs the query set.", owner: "Data owner" },
        { code: "R3", title: "Someone adds an external API key to make a demo faster", score: 20, response: "avoid", mitigation: "The security gate fails if the runtime environment contains an external model key.", owner: "Security architect" },
        { code: "R4", title: "A reference-case price is copied into the sponsor pack", score: 12, response: "avoid", mitigation: "Reference bands stay in their own table and are labeled as not this pilot’s quote.", owner: "Customer PM" },
      ],
      kpis: [
        { name: "Frozen queries answered from the index", baseline: "Not measured", target: "Every signed query returns from the pilot index", method: "Count against the frozen set. Do not promise milliseconds before the baseline.", owner: "Data platform" },
        { name: "External calls", baseline: "Not tested", target: profile.airgap ? "Zero external embedding or generation calls" : "Every external call named at the gate", method: "Egress test or call log, owned by security.", owner: "Security architect" },
        { name: "GPUs on the retrieval path", baseline: "Unset", target: "0 cards", method: "Host specification signed by infrastructure.", owner: "Infrastructure owner" },
      ],
      costs: [
        { name: "Extra software license", band: "Inside the current Postgres estate", notes: "Not a quote. A new VM, if required, is an internal cost, not a case-study price." },
        { name: "GPUs", band: "0 cards", notes: "Retrieval and indexing path." },
      ],
      qualityGates: [
        { phase: "Plan", name: "Query-set gate", criteria: "Every query has an expected document and an owner.", owner: "Data owner" },
        { phase: "Execute", name: "Egress gate", criteria: "The security architect has evidence about external calls, and the runtime has no external model key.", owner: "Security architect" },
        { phase: "Close", name: "Acceptance gate", criteria: "The sponsor accepts the baseline or rejects the pilot in writing. Misses are issues, not a silent pass.", owner: "Customer PM" },
      ],
      communications: [
        { audience: "Business sponsor", message: "Baseline, egress result, and the zero-GPU line", cadence: "Biweekly", owner: "Customer PM" },
        { audience: "Data owner", message: "Changes to the query set", cadence: "Weekly until freeze", owner: "Customer PM" },
        { audience: "Security architect", message: "Any request to add an external key", cadence: "At each gate", owner: "Security architect" },
      ],
      decisions: [
        { code: "D1", title: "Keep search and generation apart", choice: "This pilot uses only a local embedder and HNSW.", rationale: "Latency and the GPU constraint get lost if a generator is added in the same charter.", owner: "Data platform" },
        { code: "D2", title: "External API keys", choice: profile.airgap ? "The intranet runtime does not receive an external model key." : "Any external key lives only in the secret store.", rationale: "The charter states the boundary. The one-pager itself never contains a key.", owner: "Security architect" },
        { code: "D3", title: "When a latency number is allowed", choice: "A target is written only after the frozen set has a measured baseline.", rationale: "A number chosen before measurement would be a made-up customer result.", owner: "Customer PM" },
      ],
      assumptions: [
        "The data owner can point at the document a slow query should have returned.",
        "Postgres on the intranet can take pgvector, or one small VM can be stood up for it.",
        "A generation model is not required to answer the retrieval complaint.",
      ],
    },
  };
}

const CASE_PACKS = {
  "CSCO-HYP-FIN-001": {
    stakeholders: [
      { roleName: "CISO (sponsor)", organization: "Customer", interest: "Regulatory exposure and the pace of AI adoption, in the same report.", influence: "high", engagement: "Approves the charter and the switch from detect to enforce. Does not approve each policy tweak.", cadence: "Monthly" },
      { roleName: "Customer PM", organization: "Customer", interest: "Scope, the planning-band schedule, and a decision log that does not drift.", influence: "high", engagement: "Owns the integrated plan and the issue log.", cadence: "Weekly" },
      { roleName: "Security operations", organization: "Customer", interest: "Visibility, policy, false positives, and the runbook.", influence: "high", engagement: "Owns the control from detection through limited enforcement.", cadence: "Weekly" },
      { roleName: "Data-center network architect", organization: "Customer", interest: "East-west controls must not cut transaction flows.", influence: "high", engagement: "Owns Hypershield placement and the change window.", cadence: "Weekly" },
      { roleName: "AI platform owner", organization: "Customer", interest: "Approved model paths stay usable for builders.", influence: "medium", engagement: "Supplies the sandbox workload and the guardrail tests.", cadence: "Weekly" },
      { roleName: "Compliance and privacy", organization: "Customer", interest: "Prohibited data and cross-border transfer.", influence: "high", engagement: "Final review of the policy text. Accountable for the prohibited-data list.", cadence: "Biweekly" },
      { roleName: "Business data owner", organization: "Customer", interest: "The pilot workflow, such as a credit-document assistant, must not stop without notice.", influence: "medium", engagement: "Picks the pilot workflow and sits on acceptance.", cadence: "Biweekly" },
      { roleName: "Procurement", organization: "Customer", interest: "License and partner paper, on separate tracks.", influence: "medium", engagement: "Splits software from services so a long hardware lead does not block visibility.", cadence: "At milestones" },
      { roleName: "Cisco security architect", organization: "Cisco", interest: "The public architecture still fits inside the customer’s constraints.", influence: "medium", engagement: "Design review and the test scenarios. Not accountable for the customer’s policy.", cadence: "Weekly" },
    ],
    raci: [
      { activity: "Approve the charter and the pilot boundary", phase: "Initiate", accountable: "CISO (sponsor)", responsible: ["Customer PM"], consulted: ["Compliance and privacy", "Business data owner"], informed: ["Procurement"] },
      { activity: "Prohibited-data list and the regulatory map", phase: "Initiate", accountable: "CISO (sponsor)", responsible: ["Compliance and privacy"], consulted: ["Business data owner", "Security operations"], informed: ["Customer PM"] },
      { activity: "Shadow-AI sample design", phase: "Plan", accountable: "Customer PM", responsible: ["Security operations"], consulted: ["AI platform owner", "Cisco security architect"], informed: ["CISO (sponsor)"] },
      { activity: "AI Defense placement and Hypershield enforcement points", phase: "Plan", accountable: "Data-center network architect", responsible: ["Data-center network architect", "Cisco security architect"], consulted: ["Security operations", "AI platform owner"], informed: ["Customer PM"] },
      { activity: "License and partner package", phase: "Plan", accountable: "Customer PM", responsible: ["Procurement"], consulted: ["Security operations", "Cisco security architect"], informed: ["CISO (sponsor)"] },
      { activity: "Agree the operating model, including one Accountable per activity", phase: "Plan", accountable: "CISO (sponsor)", responsible: ["Customer PM"], consulted: ["Security operations", "Business data owner", "Compliance and privacy"], informed: ["Procurement"] },
      { activity: "First inventory on a non-production tenant", phase: "Execute", accountable: "Security operations", responsible: ["Security operations"], consulted: ["AI platform owner", "Cisco security architect"], informed: ["Customer PM"] },
      { activity: "Run access policy in detect mode", phase: "Execute", accountable: "CISO (sponsor)", responsible: ["Security operations"], consulted: ["Compliance and privacy", "Business data owner"], informed: ["Customer PM"] },
      { activity: "Hypershield observe mode and the change-window test", phase: "Execute", accountable: "Data-center network architect", responsible: ["Data-center network architect"], consulted: ["Security operations", "Cisco security architect"], informed: ["CISO (sponsor)"] },
      { activity: "Sponsor approval to turn on limited enforcement", phase: "Monitor", accountable: "CISO (sponsor)", responsible: ["Security operations"], consulted: ["Data-center network architect", "Business data owner", "Compliance and privacy"], informed: ["Procurement"] },
    ],
    risks: [
      { code: "R1", title: "The inventory misses local and unmanaged AI tools", score: 16, response: "mitigate", mitigation: "Add an IdP sample and an endpoint sample. Gaps stay on the issue log and out of enforcement.", owner: "Security operations" },
      { code: "R2", title: "Blocking without an approved alternative pushes staff to personal accounts", score: 12, response: "mitigate", mitigation: "Publish the approved tool and the exception SLA two weeks before enforcement.", owner: "Customer PM" },
      { code: "R4", title: "Automatic segmentation cuts a transaction flow", score: 10, response: "mitigate", mitigation: "The system of record stays out of scope. Enforce only after observe mode and a rollback rehearsal.", owner: "Data-center network architect" },
    ],
    decisions: [
      { code: "D1", title: "What enforcement covers", choice: "The ledger path stays out. Enforcement is limited to one adjacent workflow and one build sandbox.", rationale: "A mistake in east-west control must not become a customer-facing outage.", owner: "CISO (sponsor)" },
      { code: "D2", title: "Order of controls", choice: "Visibility, then detect mode, then a human approval, then limited enforcement.", rationale: "Neither AI Defense nor Hypershield is turned on as an automatic block.", owner: "Security operations" },
    ],
  },
  "CSCO-AIF-NVD-001": {
    stakeholders: [
      { roleName: "Infrastructure sponsor", organization: "Customer", interest: "The AI spend leaves an operating model, not a lab cluster.", influence: "high", engagement: "Approves the size card. Accountable for not letting the pod grow to ‘enterprise demand’.", cadence: "Monthly" },
      { roleName: "Infrastructure PM", organization: "Customer", interest: "Power, procurement, and security are one schedule.", influence: "high", engagement: "Owns the integrated plan and the dependency log.", cadence: "Weekly" },
      { roleName: "Network architect", organization: "Customer", interest: "Front-end and back-end Ethernet, and who is on the pager.", influence: "high", engagement: "Accountable for the NOS and fabric choice. One NOS, not both.", cadence: "Weekly" },
      { roleName: "AI platform", organization: "Customer", interest: "One validation job that can actually run.", influence: "high", engagement: "Owns the data set and the success test for that job.", cadence: "Weekly" },
      { roleName: "Security architect", organization: "Customer", interest: "The pod does not open without observe mode.", influence: "medium", engagement: "Accountable for observe mode before the first job.", cadence: "Biweekly" },
      { roleName: "Data-center facilities", organization: "Customer", interest: "Power and cooling are real, not a slide.", influence: "high", engagement: "Accountable for the capacity gate. Nothing is ordered before it passes.", cadence: "At the capacity gate" },
    ],
    raci: [
      { activity: "Approve the size card", phase: "Initiate", accountable: "Infrastructure sponsor", responsible: ["Infrastructure PM"], consulted: ["Network architect", "AI platform", "Data-center facilities"], informed: ["Security architect"] },
      { activity: "Power and cooling gate", phase: "Plan", accountable: "Infrastructure sponsor", responsible: ["Data-center facilities"], consulted: ["Infrastructure PM"], informed: ["Network architect"] },
      { activity: "Pick the fabric and one NOS", phase: "Plan", accountable: "Network architect", responsible: ["Network architect"], consulted: ["Infrastructure PM"], informed: ["Infrastructure sponsor"] },
      { activity: "Pick one storage partner", phase: "Plan", accountable: "Infrastructure sponsor", responsible: ["Infrastructure PM"], consulted: ["AI platform"], informed: ["Procurement"] },
      { activity: "Security observe mode", phase: "Execute", accountable: "Security architect", responsible: ["Security architect"], consulted: ["Network architect", "AI platform"], informed: ["Infrastructure sponsor"] },
      { activity: "First validation job", phase: "Execute", accountable: "AI platform", responsible: ["AI platform"], consulted: ["Security architect"], informed: ["Infrastructure PM"] },
      { activity: "Operations acceptance", phase: "Close", accountable: "Infrastructure sponsor", responsible: ["Infrastructure PM"], consulted: ["Network architect", "Security architect"], informed: ["AI platform"] },
    ],
    risks: [
      { code: "R1", title: "GPU lead time dominates the schedule", score: 20, response: "mitigate", mitigation: "Legal export check and a smaller pod are both named at kickoff. An unconfirmed ship date at four weeks triggers the smaller pod.", owner: "Infrastructure PM" },
      { code: "R2", title: "The rack design exceeds facility power", score: 15, response: "avoid", mitigation: "No order is placed before the capacity gate passes.", owner: "Data-center facilities" },
      { code: "R3", title: "Front-end and back-end teams have no shared runbook", score: 12, response: "mitigate", mitigation: "One change window and a joint runbook are acceptance criteria.", owner: "Network architect" },
    ],
    decisions: [
      { code: "D1", title: "First pod size", choice: "Size the pod to one validation job, not to imagined enterprise demand.", rationale: "The XL band moves with GPU count. Without a ceiling the schedule disappears.", owner: "Infrastructure sponsor" },
      { code: "D2", title: "NOS", choice: "NX-OS or SONiC, whichever the operations team already runs. Not both.", rationale: "Cisco documents both on the N9100 class. Running both in the pilot doubles the operating model.", owner: "Network architect" },
    ],
  },
  "CSCO-XDR-SOC-001": {
    stakeholders: [
      { roleName: "CISO (sponsor)", organization: "Customer", interest: "How far automated response is allowed to go.", influence: "high", engagement: "Approves the high-impact rule list. Accountable for isolation and blocking.", cadence: "Monthly" },
      { roleName: "SOC manager", organization: "Customer", interest: "Analyst time and the quality of the written report.", influence: "high", engagement: "Picks the three incident types. Accountable for the operating rhythm.", cadence: "Weekly" },
      { roleName: "Customer PM", organization: "Customer", interest: "Playbook scope and which telemetry is actually connected.", influence: "medium", engagement: "Owns the schedule. Does not own a containment action.", cadence: "Weekly" },
      { roleName: "Detection engineer", organization: "Customer", interest: "Correlation quality and false positives.", influence: "high", engagement: "Builds the rules for the three incident types.", cadence: "Weekly" },
      { roleName: "Senior analyst", organization: "Customer", interest: "Time spent correcting draft summaries.", influence: "medium", engagement: "Scores the prompt. The draft is not a customer notice.", cadence: "Per incident type" },
      { roleName: "Response lead", organization: "Customer", interest: "Who may isolate a host or disable an account.", influence: "high", engagement: "Owns the playbook. High-impact actions wait for the CISO.", cadence: "Weekly" },
      { roleName: "Privacy", organization: "Customer", interest: "Which fields are allowed into the model.", influence: "medium", engagement: "Writes the field allow-list before any prompt is tested.", cadence: "At kickoff" },
    ],
    raci: [
      { activity: "Select three incident types", phase: "Initiate", accountable: "CISO (sponsor)", responsible: ["SOC manager"], consulted: ["Detection engineer", "Response lead"], informed: ["Customer PM"] },
      { activity: "Field allow-list for the model", phase: "Plan", accountable: "CISO (sponsor)", responsible: ["Privacy"], consulted: ["SOC manager"], informed: ["Detection engineer"] },
      { activity: "Connect telemetry for those types", phase: "Plan", accountable: "SOC manager", responsible: ["Detection engineer"], consulted: ["Customer PM"], informed: ["CISO (sponsor)"] },
      { activity: "Evaluate summary and report prompts", phase: "Execute", accountable: "SOC manager", responsible: ["Senior analyst"], consulted: ["Detection engineer"], informed: ["Customer PM"] },
      { activity: "Low-risk playbook", phase: "Execute", accountable: "SOC manager", responsible: ["Response lead"], consulted: ["Detection engineer"], informed: ["CISO (sponsor)"] },
      { activity: "High-impact approval rule", phase: "Execute", accountable: "CISO (sponsor)", responsible: ["Response lead"], consulted: ["SOC manager", "Privacy"], informed: ["Senior analyst"] },
      { activity: "Accept the operating rhythm", phase: "Close", accountable: "CISO (sponsor)", responsible: ["SOC manager"], consulted: ["Response lead", "Senior analyst"], informed: ["Customer PM"] },
    ],
    risks: [
      { code: "R1", title: "Isolation runs with nobody accountable in the loop", score: 15, response: "mitigate", mitigation: "The CISO approves the high-impact list. A test that executes isolation with no human fails the gate.", owner: "CISO (sponsor)" },
      { code: "R2", title: "A model sentence is sent to a customer as fact", score: 12, response: "mitigate", mitigation: "External language ships only after a person edits the draft.", owner: "SOC manager" },
      { code: "R4", title: "A time-saved percentage is promised before measurement", score: 8, response: "avoid", mitigation: "The proposal states how time will be measured. It does not state a percentage.", owner: "Customer PM" },
    ],
    decisions: [
      { code: "D1", title: "Automation limit", choice: "Low-risk enrichment may run unattended. Isolation, blocking, and account changes require a person.", rationale: "The public agentic-SOC material keeps a human on high-impact actions. That person stays Accountable.", owner: "CISO (sponsor)" },
      { code: "D2", title: "How results are described", choice: "No percent-saved figure in the proposal. Write the measurement definition only.", rationale: "The white paper does not give a universal reduction rate.", owner: "Customer PM" },
    ],
  },
  "CSCO-SIO-DC-001": {
    stakeholders: [
      { roleName: "IT infrastructure executive", organization: "Customer", interest: "AI demand must not create a one-off network the operations team will not own.", influence: "high", engagement: "Accountable for adopting the standard and for killing shadow switches.", cadence: "Monthly" },
      { roleName: "Internal IT PM", organization: "Customer", interest: "Change windows and a pilot boundary people will not inflate to ‘the whole data center’.", influence: "high", engagement: "Owns the integrated schedule and the wording of the duration.", cadence: "Weekly" },
      { roleName: "Network operations", organization: "Customer", interest: "The fabric comes back on the existing runbook.", influence: "high", engagement: "Owns the fiber survey and the build. Accountable for operations acceptance.", cadence: "Weekly" },
      { roleName: "AI platform liaison", organization: "Customer", interest: "When the first pod is actually allowed to carry a job.", influence: "medium", engagement: "Supplies acceptance criteria for the first job. Does not run a side network.", cadence: "Biweekly" },
      { roleName: "Data-center security", organization: "Customer", interest: "Policy changes are rehearsed, not applied live the first time.", influence: "medium", engagement: "Owns the dual-plane rehearsal.", cadence: "At milestones" },
      { roleName: "Change advisory board", organization: "Customer", interest: "Production services do not take an unplanned hit.", influence: "high", engagement: "Accountable for the change window. Two refusals move the date, not the scope.", cadence: "Each change" },
    ],
    raci: [
      { activity: "Pick the pilot segment", phase: "Initiate", accountable: "IT infrastructure executive", responsible: ["Internal IT PM"], consulted: ["Network operations", "AI platform liaison"], informed: ["Change advisory board"] },
      { activity: "Fiber survey", phase: "Plan", accountable: "Network operations", responsible: ["Network operations"], consulted: ["Internal IT PM"], informed: ["IT infrastructure executive"] },
      { activity: "Choose the fabric standard", phase: "Plan", accountable: "IT infrastructure executive", responsible: ["Network operations"], consulted: ["Data-center security"], informed: ["AI platform liaison"] },
      { activity: "Design the change window", phase: "Plan", accountable: "Change advisory board", responsible: ["Internal IT PM"], consulted: ["Network operations"], informed: ["AI platform liaison"] },
      { activity: "Build and telemetry", phase: "Execute", accountable: "Network operations", responsible: ["Network operations"], consulted: ["Internal IT PM"], informed: ["IT infrastructure executive"] },
      { activity: "Non-disruptive policy rehearsal", phase: "Execute", accountable: "Data-center security", responsible: ["Data-center security"], consulted: ["Network operations"], informed: ["Change advisory board"] },
      { activity: "Operations acceptance", phase: "Close", accountable: "IT infrastructure executive", responsible: ["Network operations"], consulted: ["Internal IT PM", "AI platform liaison"], informed: ["Change advisory board"] },
    ],
    risks: [
      { code: "R1", title: "The fiber in the ceiling is not the fiber in the plan", score: 12, response: "mitigate", mitigation: "Purchase follows the survey. A mismatched segment drops out of this pilot.", owner: "Network operations" },
      { code: "R2", title: "Leadership hears ‘a few weeks’ as the whole data center", score: 12, response: "mitigate", mitigation: "The charter’s first line states both the full program band and the post-delivery pilot window.", owner: "Internal IT PM" },
      { code: "R4", title: "The AI team stands up a side network before acceptance", score: 12, response: "mitigate", mitigation: "The first job’s predecessor is operations acceptance.", owner: "IT infrastructure executive" },
    ],
    decisions: [
      { code: "D1", title: "How duration is stated", choice: "Full program 16–32 weeks. Pilot window 6–10 weeks after hardware arrives. Do not call the whole data center a few-week job.", rationale: "Public migration technique is not an unconfirmed customer schedule.", owner: "Internal IT PM" },
      { code: "D2", title: "Who owns it afterwards", choice: "Network operations owns the fabric after acceptance.", rationale: "The program exists so the AI platform does not keep a private network.", owner: "IT infrastructure executive" },
    ],
  },
  "CSCO-WX-AIM-001": {
    stakeholders: [
      { roleName: "Collaboration and security sponsor", organization: "Customer", interest: "Features can be turned on without creating a training-data exception.", influence: "high", engagement: "Approves any exception. Default is no customer content in training.", cadence: "Monthly" },
      { roleName: "Customer PM", organization: "Customer", interest: "Noise removal, background, gesture, and the security LLM stay on separate tracks.", influence: "high", engagement: "Owns the data-flow table and the decision log.", cadence: "Weekly" },
      { roleName: "Collaboration service owner", organization: "Customer", interest: "Admin settings and the pilot organization.", influence: "high", engagement: "Owns the rollout and the acceptance tests for background and noise.", cadence: "Weekly" },
      { roleName: "Privacy", organization: "Customer", interest: "Customer content and biometric-adjacent signals.", influence: "high", engagement: "Accountable for the data-flow table and for blocking an unsigned training exception.", cadence: "Biweekly" },
      { roleName: "Security operations lead", organization: "Customer", interest: "The security LLM does not take an automatic action.", influence: "medium", engagement: "Owns the evaluation set. Summaries stay drafts.", cadence: "Biweekly" },
      { roleName: "Change communications", organization: "Customer", interest: "Staff are told what stays on the device.", influence: "medium", engagement: "Sends the notice before the pilot organization is enabled.", cadence: "At milestones" },
    ],
    raci: [
      { activity: "Feature list and data-flow table", phase: "Plan", accountable: "Privacy", responsible: ["Customer PM", "Collaboration service owner"], consulted: ["Security operations lead"], informed: ["Collaboration and security sponsor"] },
      { activity: "Review any request to train on customer content", phase: "Plan", accountable: "Collaboration and security sponsor", responsible: ["Privacy"], consulted: ["Customer PM"], informed: ["Collaboration service owner"] },
      { activity: "Admin settings for one pilot organization", phase: "Execute", accountable: "Collaboration service owner", responsible: ["Collaboration service owner"], consulted: ["Customer PM"], informed: ["Change communications"] },
      { activity: "Acceptance test for bias and vocal range", phase: "Execute", accountable: "Privacy", responsible: ["Collaboration service owner"], consulted: ["Customer PM"], informed: ["Collaboration and security sponsor"] },
      { activity: "Staff notice", phase: "Execute", accountable: "Customer PM", responsible: ["Change communications"], consulted: ["Privacy", "Collaboration service owner"], informed: ["Pilot staff"] },
      { activity: "Security LLM evaluation set", phase: "Execute", accountable: "Security operations lead", responsible: ["Security operations lead"], consulted: ["Privacy"], informed: ["Customer PM"] },
      { activity: "Enterprise-wide setting", phase: "Close", accountable: "Collaboration and security sponsor", responsible: ["Customer PM"], consulted: ["Privacy", "Collaboration service owner", "Security operations lead"], informed: ["Change communications"] },
    ],
    risks: [
      { code: "R1", title: "Someone asks to train on meeting content ‘for quality’", score: 15, response: "avoid", mitigation: "An exception needs the sponsor and privacy in writing. Otherwise the feature stays off.", owner: "Privacy" },
      { code: "R3", title: "A good summary gets wired to automatic containment", score: 15, response: "mitigate", mitigation: "The success test is an evaluation set plus a human approval. Containment follows the XDR playbook, not this track.", owner: "Security operations lead" },
    ],
    decisions: [
      { code: "D1", title: "Training default", choice: "Customer content is not used for training.", rationale: "That matches the public Webex default. An exception is a different project.", owner: "Collaboration and security sponsor" },
      { code: "D2", title: "What the security LLM is", choice: "Prompting, review, and a human approval. Not foundation-model training, and not an automatic action.", rationale: "The public XDR material describes draft summaries. It does not publish a training recipe.", owner: "Security operations lead" },
    ],
  },
  "CSCO-AID-ENT-001": {
    stakeholders: [
      { roleName: "CISO (sponsor)", organization: "Customer", interest: "AI use the security team cannot see.", influence: "high", engagement: "Approves the pilot charter and which face of the product comes first.", cadence: "Monthly" },
      { roleName: "Customer PM", organization: "Customer", interest: "The plan stays inside what is actually orderable.", influence: "high", engagement: "Owns the schedule and the decision log.", cadence: "Weekly" },
      { roleName: "Security operations", organization: "Customer", interest: "Discovery and the access policy.", influence: "high", engagement: "Will own the control after the pilot.", cadence: "Weekly" },
      { roleName: "Development platform owner", organization: "Customer", interest: "A shared guardrail must not silently stop a release.", influence: "medium", engagement: "Owns the model-validation test. Adoption of a recommendation is a written decision.", cadence: "Weekly" },
      { roleName: "Legal and privacy", organization: "Customer", interest: "Training data and prompt data.", influence: "medium", engagement: "Reviews the data classification before discovery starts.", cadence: "Biweekly" },
    ],
    raci: [
      { activity: "Pilot charter", phase: "Initiate", accountable: "CISO (sponsor)", responsible: ["Customer PM"], consulted: ["Security operations", "Development platform owner"], informed: ["Legal and privacy"] },
      { activity: "Data classification", phase: "Plan", accountable: "CISO (sponsor)", responsible: ["Legal and privacy"], consulted: ["Development platform owner"], informed: ["Customer PM"] },
      { activity: "Discovery scope", phase: "Plan", accountable: "Customer PM", responsible: ["Security operations"], consulted: ["Development platform owner"], informed: ["CISO (sponsor)"] },
      { activity: "User access policy", phase: "Execute", accountable: "CISO (sponsor)", responsible: ["Security operations"], consulted: ["Legal and privacy"], informed: ["Customer PM"] },
      { activity: "Model validation test", phase: "Execute", accountable: "Development platform owner", responsible: ["Development platform owner"], consulted: ["Security operations"], informed: ["Customer PM"] },
      { activity: "Runtime scenarios", phase: "Execute", accountable: "Security operations", responsible: ["Security operations", "Development platform owner"], consulted: ["Legal and privacy"], informed: ["Customer PM"] },
      { activity: "Expand or stop", phase: "Close", accountable: "CISO (sponsor)", responsible: ["Customer PM"], consulted: ["Security operations", "Development platform owner"], informed: ["Legal and privacy"] },
    ],
    risks: [
      { code: "R1", title: "Discovery results are used as a punishment policy", score: 12, response: "mitigate", mitigation: "The first inventory is shared privately and owners are confirmed. Blocking is a later charter.", owner: "CISO (sponsor)" },
      { code: "R2", title: "A launch announcement is treated as a purchased control", score: 9, response: "mitigate", mitigation: "The procurement note lists only SKUs that have been confirmed.", owner: "Customer PM" },
    ],
    decisions: [
      { code: "D1", title: "Which face of the pilot comes first", choice: "The sponsor picks user visibility or development validation. Not both, enterprise-wide, in 8–16 weeks.", rationale: "The public launch describes both. The plan has to pick one.", owner: "CISO (sponsor)" },
      { code: "D2", title: "Relationship to Hypershield", choice: "This charter is AI Defense only. Data-center enforcement is a separate case.", rationale: "Mixing the products in one case collapses the schedule band.", owner: "Customer PM" },
    ],
  },
};

export function englishCaseOverlay(caseCode) {
  return CASE_PACKS[caseCode] || null;
}

export function englishReferenceTitle(record) {
  return record.titleEn || record.title;
}

export function englishFidelity(code) {
  if (code === "primary_source") return "Public source";
  if (code === "public_composite") return "Planning scenario from public material";
  return code;
}

export const ENGLISH_DISCLAIMER =
  "Figures marked as a planning band or a planning target are not a list price and not a customer result. Confirm them against the current public document and the customer environment before anyone approves. Sensitive diagrams and policy values are not in this charter.";
