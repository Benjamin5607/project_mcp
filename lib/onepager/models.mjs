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

function reasonFor({ profile, selected, connection, catalogNote, hasKey }) {
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

export async function selectSpecialist({ profile, apiKey, fetchImpl, allowNetwork = true }) {
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
      if (filtered.length) pool = filtered;
      else {
        catalogNote = "실시간 카탈로그에 내장 프로파일과 겹치는 모델이 없어 API 호출을 보류했습니다.";
        withholdCall = true;
      }
    } catch {
      catalogNote = "실시간 카탈로그를 읽지 못해 내장 프로파일로 골랐습니다.";
    }
  }
  const ranked = pool
    .map((model) => scoreModel(model, profile))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const selected = ranked[0];
  const connection = !blocked && !withholdCall ? "nvidia-api" : "local-persona";
  return {
    persona: "AI 프로젝트 스페셜리스트",
    authoringModelId: selected.id,
    authoringModelLabel: selected.label,
    deploymentModelId: selected.id,
    deploymentModelLabel: selected.label,
    deploymentGpuNote: selected.gpuNote,
    gpuClass: selected.gpuClass,
    connection,
    called: false,
    narrativeSource: "local",
    reason: reasonFor({ profile, selected, connection, catalogNote, hasKey: Boolean(key) }),
    considered: ranked.slice(0, 5).map((model) => ({
      id: model.id,
      label: model.label,
      score: Math.round(model.score),
      note: model.notes.join(" "),
    })),
    error: null,
  };
}

export async function completeNarrative({ apiKey, model, document, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
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
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "당신은 시스코 공개 아키텍처를 프로젝트 원페이저로 번역하는 AI 프로젝트 스페셜리스트입니다. 고객 실적, 견적, 고시 가격, 입력에 없는 회사 이름을 만들지 않습니다. JSON 객체만 반환합니다.",
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "headline, executiveSummary, recommendationRationale, constraintNotes만 한국어로 다듬으세요. 사례 코드와 계획 밴드 숫자를 새로 만들지 마세요.",
              schema: {
                headline: "string",
                executiveSummary: "string",
                recommendationRationale: "string",
                constraintNotes: ["string"],
              },
              pain: document.pain,
              requirements: document.requirements,
              solution: document.solution.name,
              summary: document.solution.summary,
              references: document.references.map((item) => ({
                caseCode: item.caseCode,
                title: item.title,
                fidelity: item.fidelityLabel,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error("nvidia");
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("nvidia");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
