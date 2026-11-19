import { answerQuestion } from "../../../lib/pipeline.mjs";
import { loadCases, loadIndex } from "../../../lib/store.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A JSON body is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "A JSON object is required." }, { status: 400 });
  }
  try {
    const result = answerQuestion(loadCases(), loadIndex(), typeof body.query === "string" ? body.query : "", {
      artifact: typeof body.artifact === "string" ? body.artifact : "auto",
      industry: typeof body.industry === "string" ? body.industry : "",
      solution: typeof body.solution === "string" ? body.solution : "",
      limit: 5,
    });
    return Response.json(result);
  } catch (error) {
    const status = Number(error.status) || 500;
    return Response.json({ error: status === 500 ? "Search could not be completed." : error.message }, { status });
  }
}
