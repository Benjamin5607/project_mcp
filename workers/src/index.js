/**
 * Reference RAG gateway.
 * The Next.js app is the local runtime. This handler is the same contract a
 * Cloudflare Worker would expose: POST /ask, no shell, no caller-supplied URL.
 */

export function createGateway({ answer }) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return Response.json({ ok: true, service: "case-bank-gateway" });
      }
      if (request.method !== "POST" || url.pathname !== "/ask") {
        return Response.json({ error: "POST /ask 만 받습니다." }, { status: 404 });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return Response.json({ error: "JSON 객체가 필요합니다." }, { status: 400 });
      }
      try {
        const result = await answer({
          query: typeof body.query === "string" ? body.query : "",
          artifact: typeof body.artifact === "string" ? body.artifact : "auto",
          industry: typeof body.industry === "string" ? body.industry : "",
          solution: typeof body.solution === "string" ? body.solution : "",
          limit: body.limit,
        });
        return Response.json(result);
      } catch (error) {
        const status = Number(error.status) || 500;
        return Response.json({ error: status === 500 ? "검색을 처리하지 못했습니다." : error.message }, { status });
      }
    },
  };
}

export async function localAnswer(body) {
  const { cases } = await import("../../data/authoring/index.mjs");
  const { buildIndex, answerQuestion } = await import("../../lib/pipeline.mjs");
  const index = buildIndex(cases, "worker");
  return answerQuestion(cases, index, body.query, body);
}

export default createGateway({ answer: localAnswer });
