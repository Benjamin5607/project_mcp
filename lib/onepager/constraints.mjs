const THEMES = [
  {
    id: "retrieval",
    weight: 1,
    pattern: /느리|지연|검색|데이터베이스|벡터|rag|찾아오|응답 시간|latency/gi,
  },
  {
    id: "visibility",
    weight: 1.2,
    pattern: /가시성|비인가|섀도|기밀|접근 통제|hypershield|하이퍼실드/gi,
  },
  {
    id: "soc",
    weight: 1.3,
    pattern: /xdr|인시던트|soc|위협 탐지|보안 운영|회복탄력/gi,
  },
  {
    id: "collab",
    weight: 1.3,
    pattern: /webex|노이즈|회의|제스처|가상 배경|화상/gi,
  },
  {
    id: "training",
    weight: 1.4,
    pattern: /팩토리|파운데이션|미세조정|모델 훈련|모델 학습|gpu 클러스터|학습 포드/gi,
  },
  {
    id: "fabric",
    weight: 1.3,
    pattern: /패브릭|silicon one|실리콘원|이더넷|무중단|400g/gi,
  },
];

function hitCount(text, pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

export function parseConstraints(text) {
  const raw = String(text || "");
  const airgapHit = /인트라넷|에어\s*갭|air-?gap|폐쇄망|클라우드와\s*연결되지|클라우드[^.。\n]{0,12}금지|오프라인|망분리|외부\s*api[^.。\n]{0,12}금지|로컬에서만/i.test(raw);
  const allowCloud = /클라우드\s*(api\s*)?(를|을)?\s*써도|퍼블릭\s*클라우드|클라우드\s*사용\s*가능|외부\s*api\s*허용|saas\s*허용/i.test(raw);
  const minGpu = /그래픽\s*카드\s*최소|그래픽카드\s*최소|gpu\s*(를|을)?\s*최소|최소\s*gpu|gpu\s*0|가속기(를|을)?\s*(쓰지|없)|cpu\s*만|저사양/i.test(raw);
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
