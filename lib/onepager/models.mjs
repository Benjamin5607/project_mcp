const NVIDIA_MODELS = "https://integrate.api.nvidia.com/v1/models";
const NVIDIA_CHAT = "https://integrate.api.nvidia.com/v1/chat/completions";

/** Profiles for models published on the NVIDIA integrate API. VRAM is not asserted. */
export const MODEL_CATALOG = [
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    label: "Nemotron Super 49B v1.5",
    quality: 96,
    reasoning: 5,
    gpuClass: "large",
    gpuNote: "대형 추론 모델입니다. 그래픽카드를 최소화하는 환경의 본안이 아닙니다.",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    label: "Nemotron Super 49B v1",
    quality: 90,
    reasoning: 5,
    gpuClass: "large",
    gpuNote: "대형 추론 모델입니다. 같은 계열의 v1.5가 있으면 v1.5를 먼저 둡니다.",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    quality: 88,
    reasoning: 4,
    gpuClass: "large",
    gpuNote: "대형 일반 지시 모델입니다.",
  },
  {
    id: "nvidia/nemotron-3.5-bolt-e4b",
    label: "Nemotron 3.5 Bolt",
    quality: 84,
    reasoning: 4,
    gpuClass: "edge",
    gpuNote: "카탈로그의 컴팩트 추론 모델입니다. 검색 경로와 분리하고, 용량은 배포 가이드로 확인합니다.",
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B Instruct",
    quality: 74,
    reasoning: 3,
    gpuClass: "small",
    gpuNote: "소형 지시 모델입니다. 용량은 배포 가이드로 확인합니다.",
  },
  {
    id: "meta/llama-3.2-3b-instruct",
    label: "Llama 3.2 3B Instruct",
    quality: 64,
    reasoning: 2,
    gpuClass: "edge",
    gpuNote: "엣지 규모 지시 모델입니다.",
  },
  {
    id: "meta/llama-3.2-1b-instruct",
    label: "Llama 3.2 1B Instruct",
    quality: 50,
    reasoning: 1,
    gpuClass: "edge",
    gpuNote: "가장 작은 후보입니다. 문장이 부족하면 더 큰 컴팩트 모델을 검토합니다.",
  },
];

const GPU_DELTA = { edge: 18, small: 8, large: -34 };

export function scoreModel(model, profile) {
  const notes = [];
  let score = model.quality + model.reasoning;
  if (profile.minGpu) {
    score += GPU_DELTA[model.gpuClass] || 0;
    notes.push(model.gpuClass === "large" ? "그래픽 최소 요구와 거리가 있습니다." : "그래픽 부담이 낮습니다.");
  } else {
    score += model.reasoning * 4;
    notes.push("추론 품질을 우선했습니다.");
  }
  if (profile.airgap) notes.push("폐쇄망에서는 가중치를 호출하지 않고 페르소나만 연결합니다.");
  return { ...model, score, notes };
}

function englishGpu(model) {
  if (model.id.includes("bolt")) {
    return "Compact reasoning model in the catalog. Keep it off the retrieval path. Confirm capacity against the deployment guide before any order.";
  }
  if (model.gpuClass === "large") return "Large inference model. It is not the proposal when GPUs must be minimized.";
  if (model.gpuClass === "small") return "Small instruction model. Confirm capacity against the deployment guide.";
  return "Edge-scale instruction model. Confirm capacity against the deployment guide.";
}

function englishNotes(model, profile) {
  const notes = [];
  if (profile.minGpu) notes.push(model.gpuClass === "large" ? "Far from a minimize-GPU requirement." : "Lower GPU burden.");
  else notes.push("Reasoning quality was preferred.");
  if (profile.airgap) notes.push("On an intranet the weights are not called. The pain text is not sent to the API.");
  return notes;
}

function reasonFor({ profile, selected, connection, catalogNote, hasKey, language }) {
  if (language !== "ko") {
    const parts = [];
    if (connection === "nvidia-api") {
      parts.push(`Connected ${selected.label} on the NVIDIA API as the AI project specialist.`);
    } else if (profile.airgap) {
      parts.push(
        `The requirements keep this on an intranet, so only the ${selected.label} persona is connected to the local case bank. The pain text was not sent to the NVIDIA API.`,
      );
    } else if (!hasKey) {
      parts.push(`NVIDIA_API_KEY is absent, so the ${selected.label} persona ran locally.`);
    } else {
      parts.push(`This run does not call NVIDIA. The selected model is ${selected.label}, and the local persona wrote the draft.`);
    }
    if (profile.airgap && selected.gpuClass === "large") {
      parts.push("Keeping a large model on premises needs a capacity check at the design gate.");
    }
    if (profile.minGpu) parts.push("A minimize-GPU requirement ranked the compact profile above the large models.");
    if (catalogNote) parts.push(catalogNote);
    return parts.join(" ");
  }
  const parts = [];
  if (connection === "nvidia-api") {
    parts.push(`NVIDIA API의 ${selected.label}을 AI 프로젝트 스페셜리스트로 연결했습니다.`);
  } else if (profile.airgap) {
    parts.push(
      `특별 요구가 클라우드와 분리된 인트라넷이므로 ${selected.label} 페르소나만 로컬 케이스 뱅크에 연결했습니다. 페인포인트 원문은 NVIDIA API로 보내지 않았습니다.`,
    );
  } else if (!hasKey) {
    parts.push(`NVIDIA_API_KEY가 없어 ${selected.label} 프로파일의 페르소나를 로컬에서 수행했습니다.`);
  } else {
    parts.push(`이 실행은 NVIDIA 호출을 하지 않습니다. 선정 모델은 ${selected.label}이고, 초안은 로컬 페르소나가 작성했습니다.`);
  }
  if (profile.airgap && selected.gpuClass === "large") {
    parts.push("온프레미스에 두려면 그래픽 용량을 설계 게이트에서 다시 확인해야 합니다.");
  }
  if (profile.minGpu) parts.push("그래픽 최소 요구 때문에 컴팩트 프로파일을 대형 모델보다 위에 두었습니다.");
  if (catalogNote) parts.push(catalogNote);
  return parts.join(" ");
}

async function listModelIds(apiKey, fetchImpl) {
  const response = await fetchImpl(NVIDIA_MODELS, {
    method: "GET",
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error("catalog");
  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => row?.id).filter((id) => typeof id === "string");
}

export async function selectSpecialist({ profile, apiKey, fetchImpl, allowNetwork = true, language = "en" }) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  const flagOff = process.env.ONEPAGER_ALLOW_NVIDIA === "false";
  const blocked = profile.airgap || allowNetwork === false || flagOff || !key;
  let pool = MODEL_CATALOG;
  let catalogNote = "";
  let withholdCall = false;
  if (!blocked) {
    try {
      const live = new Set(await listModelIds(key, fetchImpl));
      const filtered = MODEL_CATALOG.filter((model) => live.has(model.id));
      if (filtered.length) {
        pool = filtered;
        const missingLarge = MODEL_CATALOG
          .filter((model) => model.gpuClass === "large" && !live.has(model.id))
          .map((model) => model.label);
        if (missingLarge.length) {
          catalogNote = language === "ko"
            ? `실시간 카탈로그에 없어 뺀 대형 프로파일: ${missingLarge.slice(0, 3).join(", ")}.`
            : `Large profiles missing from the live catalog were left out: ${missingLarge.slice(0, 3).join(", ")}.`;
        }
      } else {
        catalogNote = language === "ko"
          ? "실시간 카탈로그에 내장 프로파일과 겹치는 모델이 없어 API 호출을 보류했습니다."
          : "The live catalog did not overlap the built-in profiles, so the API call was withheld.";
        withholdCall = true;
      }
    } catch {
      catalogNote = language === "ko"
        ? "실시간 카탈로그를 읽지 못해 내장 프로파일로 골랐습니다."
        : "The live catalog could not be read, so a built-in profile was selected.";
    }
  }
  const ranked = pool
    .map((model) => scoreModel(model, profile))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const selected = ranked[0];
  const connection = !blocked && !withholdCall ? "nvidia-api" : "local-persona";
  return {
    persona: language === "ko" ? "AI 프로젝트 스페셜리스트" : "AI project specialist",
    authoringModelId: selected.id,
    authoringModelLabel: selected.label,
    deploymentModelId: selected.id,
    deploymentModelLabel: selected.label,
    deploymentGpuNote: language === "ko" ? selected.gpuNote : englishGpu(selected),
    gpuClass: selected.gpuClass,
    connection,
    called: false,
    narrativeSource: "local",
    reason: reasonFor({ profile, selected, connection, catalogNote, hasKey: Boolean(key), language }),
    considered: ranked.slice(0, 5).map((model) => ({
      id: model.id,
      label: model.label,
      score: Math.round(model.score),
      note: language === "ko" ? model.notes.join(" ") : englishNotes(model, profile).join(" "),
    })),
    error: null,
  };
}

function reasoningOff(model) {
  const id = String(model || "");
  if (id.includes("nemotron-super-49b-v1.5") || id.includes("nemotron-3")) return "/no_think";
  if (id.includes("nemotron")) return "detailed thinking off";
  return "";
}

export async function completeNarrative({ apiKey, model, document, fetchImpl, rewrite = false }) {
  const english = document.language !== "ko";
  const control = reasoningOff(model);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetchImpl(NVIDIA_CHAT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: control ? 0 : 0.2,
        max_tokens: 2800,
        messages: [
          {
            role: "system",
            content: [
              control,
              english
                ? "You are an AI project specialist. Read the retrieved cases and write a one-pager for this user's pain. Do not invent customer results, quotes, list prices, percentages, or company names that are not in the input. Return a JSON object only."
                : "당신은 AI 프로젝트 스페셜리스트입니다. 검색된 사례를 읽고 이 사용자의 페인포인트에 맞는 원페이저를 작성합니다. 고객 실적, 견적, 고시 가격, 백분율, 입력에 없는 회사 이름을 만들지 않습니다. JSON 객체만 반환합니다.",
            ].filter(Boolean).join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: english
                ? `Read the cases as patterns, then write the full one-pager for this pain. Name stakeholders for this pain. Do not copy a case's role list, goals, success measures, rollout, outcomes, governance note, or postmortem unless the pain is about that case's subject. Rewrite headline, executiveSummary, solutionName, solutionSummary, recommendationRationale, constraintNotes, components, stakeholders, raci, resources, risks, decisions, goals, successMeasures, rollout, expectedOutcomes, governanceNote, and postmortemQuestions. Every row must name this pain. Each accountable is exactly one roleName from your stakeholders. Do not paste the supplied summary. Do not invent case codes or planning-band numbers.${rewrite ? " The previous reply copied the draft. Write different sentences." : ""}`
                : `사례를 읽고 이 페인포인트의 원페이저 전체를 한국어로 작성하세요. 프로젝트는 사용자 문제이고 사례 표의 복붙이 아닙니다. headline, executiveSummary, solutionName, solutionSummary, recommendationRationale, constraintNotes, components, stakeholders, raci, resources, risks, decisions, goals, successMeasures, rollout, expectedOutcomes, governanceNote, postmortemQuestions를 다시 쓰세요. 각 행은 이 페인포인트를 반영하고, Accountable은 stakeholders의 roleName 하나만 적습니다. 제공된 요약문을 그대로 붙이지 마세요.${rewrite ? " 직전 답은 초안을 베꼈습니다. 다른 문장으로 쓰세요." : ""}`,
              schema: {
                headline: "string",
                executiveSummary: "string",
                solutionName: "string",
                solutionSummary: "string",
                recommendationRationale: "string",
                constraintNotes: ["string"],
                components: [{ name: "string", detail: "string" }],
                stakeholders: [{ roleName: "string", organization: "string", interest: "string", influence: "high|medium|low", engagement: "string", cadence: "string" }],
                raci: [{ activity: "string", phase: "string", accountable: "string", responsible: ["string"], consulted: ["string"], informed: ["string"] }],
                resources: [{ kind: "string", name: "string", amount: "string", notes: "string" }],
                risks: [{ title: "string", mitigation: "string", owner: "string" }],
                decisions: [{ title: "string", choice: "string", rationale: "string", owner: "string" }],
                goals: [{ statement: "string", owner: "string" }],
                successMeasures: [{ name: "string", baseline: "string", target: "string", method: "string", owner: "string" }],
                rollout: [{ phase: "string", protocol: "string", success: "string", fallback: "string" }],
                expectedOutcomes: [{ outcome: "string", evidence: "string" }],
                governanceNote: "string",
                postmortemQuestions: ["string"],
              },
              pain: document.pain,
              requirements: document.requirements,
              cases: document.references.map((item) => ({
                caseCode: item.caseCode,
                title: item.title,
                fidelity: item.fidelityLabel,
                why: item.why,
                excerpt: item.excerpt,
              })),
              sourceRoles: document.stakeholders.map((item) => item.roleName),
              draftSummary: document.executiveSummary,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      const error = new Error("nvidia");
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("nvidia");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** A short second call that only writes RACI and resources for this pain. */
export async function completeRaci({ apiKey, model, document, fetchImpl }) {
  const english = document.language !== "ko";
  const control = reasoningOff(model);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetchImpl(NVIDIA_CHAT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: control ? 0 : 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: [
              control,
              english
                ? "Return one JSON object only. Write the remaining one-pager sections for this user's pain. Do not copy a case study."
                : "JSON 객체만 반환합니다. 이 페인포인트의 남은 원페이저 항목을 작성합니다. 사례를 베끼지 않습니다.",
            ].filter(Boolean).join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: english
                ? "Fill every missing section for this pain only. RACI, resources, risks, decisions, goals, successMeasures, rollout, expectedOutcomes, governanceNote, and postmortemQuestions must mention concrete details from the pain. Copy accountable and owner from seats. Do not use a banned name. Do not invent prices or percentages."
                : "빠진 항목을 이 페인포인트만으로 채우세요. RACI, resources, risks, decisions, goals, successMeasures, rollout, expectedOutcomes, governanceNote, postmortemQuestions는 페인의 구체적 내용을 말해야 합니다. accountable과 owner는 seats에서 고르세요. 금지된 이름은 쓰지 마세요.",
              schema: {
                raci: [{ activity: "string", phase: "Initiate|Plan|Execute|Close", accountable: "one seat", responsible: ["seat"], consulted: ["seat"], informed: ["seat"] }],
                resources: [{ kind: "role|tool|environment", name: "string", amount: "string", notes: "string" }],
                risks: [{ title: "string", mitigation: "string", owner: "one seat" }],
                decisions: [{ title: "string", choice: "string", rationale: "string", owner: "one seat" }],
                goals: [{ statement: "string", owner: "one seat" }],
                successMeasures: [{ name: "string", baseline: "string", target: "string", method: "string", owner: "one seat" }],
                rollout: [{ phase: "string", protocol: "string", success: "string", fallback: "string" }],
                expectedOutcomes: [{ outcome: "string", evidence: "string" }],
                governanceNote: "string",
                postmortemQuestions: ["string"],
              },
              pain: document.pain,
              requirements: document.requirements,
              seats: document.stakeholders.map((item) => item.roleName),
              bannedActivities: document.raci.map((item) => item.activity),
              bannedRisks: (document.risks || []).map((item) => item.title),
              bannedDecisions: (document.decisions || []).map((item) => item.title),
              bannedGoals: (document.goals || []).map((item) => item.statement),
              bannedMeasures: (document.successMeasures || []).map((item) => item.name),
              bannedPhases: (document.rollout || []).map((item) => item.phase),
              bannedOutcomes: (document.expectedOutcomes || []).map((item) => item.outcome),
              bannedGovernance: document.governance?.note || "",
              bannedPostmortem: document.postmortem?.questions || [],
              caseTitles: document.references.map((item) => item.title),
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      const error = new Error("nvidia");
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("nvidia");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
