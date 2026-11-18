import { cosine, embed, tokenize } from "./embed.mjs";

function keywordScore(query, content) {
  const queryTokens = tokenize(query);
  if (!queryTokens.size) return 0;
  const haystack = String(content || "").toLowerCase();
  let hit = 0;
  let total = 0;
  for (const [token, weight] of queryTokens) {
    total += weight;
    if (haystack.includes(token)) hit += weight;
  }
  return total ? hit / total : 0;
}

export function retrieve(chunks, query, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 5, 8));
  const industry = options.industry || null;
  const solution = (options.solution || "").trim().toLowerCase();
  const queryVector = embed(query, { expand: true });
  const scored = [];

  for (const chunk of chunks) {
    if (chunk.status && chunk.status !== "published") continue;
    if (industry && chunk.industry !== industry) continue;
    if (solution && !(chunk.solutions || []).some((item) => item.toLowerCase().includes(solution))) continue;
    const semantic = cosine(queryVector, chunk.embedding);
    const lexical = keywordScore(query, `${chunk.title}\n${chunk.heading}\n${chunk.content}`);
    let score = semantic * 0.62 + lexical * 0.38;
    const queryFold = query.toLowerCase();
    if ((chunk.solutions || []).some((item) => queryFold.includes(item.toLowerCase().slice(0, 12)))) {
      score += 0.04;
    }
    scored.push({ ...chunk, score, semantic, lexical });
  }

  scored.sort((a, b) => b.score - a.score || a.caseCode.localeCompare(b.caseCode));
  if (!options.diverse) return scored.slice(0, limit);
  const seen = new Set();
  const diverse = [];
  for (const item of scored) {
    if (seen.has(item.caseCode)) continue;
    seen.add(item.caseCode);
    diverse.push(item);
    if (diverse.length >= limit) break;
  }
  return diverse;
}

export function indexChunks(cases, embedFn = embed) {
  const chunks = [];
  for (const caseRecord of cases) {
    if (caseRecord.status !== "published") continue;
    for (const chunk of caseRecord.chunks || []) {
      chunks.push({
        ...chunk,
        embedding: chunk.embedding || embedFn(chunk.content),
      });
    }
  }
  return chunks;
}
