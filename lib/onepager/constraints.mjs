const THEMES = [
  {
    id: "retrieval",
    weight: 1,
    pattern: /느리|지연|검색|데이터베이스|벡터|\brag\b|찾아오|응답 시간|latency|\bslow\b|retriev|database|vector/gi,
  },
  {
    id: "visibility",
    weight: 1.2,
    pattern: /가시성|visibility|비인가|섀도|shadow|기밀|confidential|접근 통제|access control|hypershield|하이퍼실드/gi,
  },
  {
    id: "soc",
    weight: 1.3,
    pattern: /xdr|인시던트|incident|soc|위협 탐지|threat detection|보안 운영|회복탄력|resilience/gi,
  },
  {
    id: "collab",
    weight: 1.3,
    pattern: /webex|노이즈|noise cancel|회의|meeting|제스처|gesture|가상 배경|virtual background|화상/gi,
  },
  {
    id: "training",
    weight: 1.4,
    pattern: /팩토리|factory|파운데이션|foundation|미세조정|fine-?tun|모델 훈련|모델 학습|gpu 클러스터|gpu cluster|학습 포드/gi,
  },
  {
    id: "fabric",
    weight: 1.3,
    pattern: /패브릭|fabric|silicon one|실리콘원|이더넷|ethernet|무중단|400g/gi,
  },
];

function hitCount(text, pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

export function parseConstraints(text) {
  const raw = String(text || "");
  const airgapHit = /인트라넷|intranet|에어\s*갭|air[-\s]?gap|폐쇄망|클라우드와\s*연결되지|클라우드[^.。\n]{0,12}금지|no cloud|without (a )?cloud|not connected to the cloud|disconnected from the cloud|오프라인|\boffline\b|망분리/i.test(raw);
  const allowCloud = /클라우드\s*(api\s*)?(를|을)?\s*써도|퍼블릭\s*클라우드|클라우드\s*사용\s*가능|외부\s*api\s*허용|saas\s*허용|public cloud|cloud api (is|are) allowed|may use (the )?(public )?cloud/i.test(raw);
  const minGpu = /그래픽\s*카드\s*최소|그래픽카드\s*최소|gpu\s*(를|을)?\s*최소|최소\s*gpu|gpu\s*0|가속기(를|을)?\s*(쓰지|없)|cpu\s*만|저사양|minimi[sz]e\s+(the\s+)?(gpu|graphics)|minimal\s+gpu|minimum\s+gpu|gpu footprint|fewest\s+gpus|no\s+gpus?|without\s+(a\s+)?gpu|graphics cards?\s+to a minimum/i.test(raw);
  const scored = THEMES.map((theme) => ({
    id: theme.id,
    score: hitCount(raw, theme.pattern) * theme.weight,
  }))
    .filter((theme) => theme.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return {
    airgap: airgapHit && !allowCloud,
    minGpu,
    dominantTheme: scored[0]?.id || "general",
    themes: scored.map((theme) => theme.id),
  };
}
