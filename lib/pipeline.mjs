import { chunkCase } from "./chunk.mjs";
import { EMBED_DIM, EMBED_MODEL, embed } from "./embed.mjs";
import { retrieve } from "./retrieve.mjs";
import { synthesize } from "./synthesize.mjs";

export function buildIndex(cases, builtAt = new Date().toISOString()) {
  const chunks = [];
  for (const caseRecord of cases) {
    if (caseRecord.status !== "published") continue;
    for (const chunk of chunkCase(caseRecord)) {
      chunks.push({ ...chunk, embedding: embed(chunk.content) });
    }
  }
  return { model: EMBED_MODEL, dim: EMBED_DIM, builtAt, chunks };
}

export function answerQuestion(cases, index, query, options = {}) {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    const error = new Error("질의가 비어 있습니다.");
    error.status = 400;
    throw error;
  }
  if (trimmed.length > 2000) {
    const error = new Error("질의는 2000자 이하로 보내 주세요.");
    error.status = 400;
    throw error;
  }
  const matches = retrieve(index.chunks, trimmed, {
    limit: options.limit || 5,
    industry: options.industry || null,
    solution: options.solution || null,
    diverse: options.diverse !== false,
  }).map((match) => {
    const { embedding, ...rest } = match;
    return rest;
  });
  const artifact = synthesize({
    query: trimmed,
    artifact: options.artifact || "auto",
    matches,
    cases: cases.filter((item) => item.status === "published"),
  });
  return {
    query: trimmed,
    mode: "local-index",
    model: index.model,
    matches: matches.map((match) => ({
      id: match.id,
      caseCode: match.caseCode,
      slug: match.slug,
      title: match.title,
      section: match.section,
      heading: match.heading,
      industry: match.industry,
      industryLabel: match.industryLabel,
      fidelity: match.fidelity,
      score: Number(match.score.toFixed(4)),
      semantic: Number(match.semantic.toFixed(4)),
      lexical: Number(match.lexical.toFixed(4)),
      excerpt: match.content.replace(/^case:[\s\S]*?\n\n/, "").slice(0, 700),
    })),
    artifact,
  };
}
