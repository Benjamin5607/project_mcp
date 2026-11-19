/**
 * Air-gapped 384-d feature-hash embedder.
 *
 * The same function indexes chunks and embeds PM queries, so the bank runs
 * without sending architecture text to an external API. Swap the column to
 * vector(768) and rebuild the index when moving to Ollama nomic-embed-text.
 * See README, step 2.
 */
export const EMBED_DIM = 384;
export const EMBED_MODEL = "feature-hash-v1";

const SYNONYMS = [
  ["가시성", "visibility", "discovery"],
  ["접근", "access", "접근제어", "접근통제"],
  ["금융", "financial", "은행"],
  ["보안", "security"],
  ["세그멘테이션", "segmentation", "분할"],
  ["데이터센터", "datacenter", "data center"],
  ["노이즈", "noise"],
  ["배경", "background"],
  ["제스처", "gesture"],
  ["공장", "factory"],
  ["위험", "risk", "리스크"],
  ["일정", "schedule", "wbs"],
  ["역할", "raci"],
];

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function tokenize(text) {
  const norm = String(text || "").normalize("NFKC").toLowerCase();
  const weights = new Map();
  const add = (token, weight) => {
    if (!token || token.length < 2 || token.length > 48) return;
    weights.set(token, (weights.get(token) || 0) + weight);
  };

  for (const match of norm.matchAll(/[a-z0-9][a-z0-9+.-]{1,}/g)) add(match[0], 1.5);
  for (const match of norm.matchAll(/[가-힣]{2,}/g)) {
    add(match[0], 2);
    const word = match[0];
    for (let i = 0; i < word.length - 1; i += 1) add(word.slice(i, i + 2), 1);
  }
  return weights;
}

function expandQuery(text) {
  const folded = String(text || "").toLowerCase();
  const extra = [];
  for (const group of SYNONYMS) {
    if (group.some((term) => folded.includes(term))) extra.push(group.join(" "));
  }
  return extra.length ? `${text}\n${extra.join(" ")}` : text;
}

export function embed(text, { expand = false } = {}) {
  const weights = tokenize(expand ? expandQuery(text) : text);
  const vector = new Float64Array(EMBED_DIM);
  for (const [token, weight] of weights) {
    const hash = fnv1a(token);
    const index = hash % EMBED_DIM;
    const sign = hash & 1 ? 1 : -1;
    vector[index] += sign * weight;
  }
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => value / norm);
}

export function cosine(left, right) {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let i = 0; i < length; i += 1) score += left[i] * right[i];
  return score;
}
