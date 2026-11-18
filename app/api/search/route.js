import { answerQuestion } from "../../../lib/pipeline.mjs";
import { loadCases, loadIndex } from "../../../lib/store.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  if (!query.trim()) return Response.json({ error: "q가 필요합니다." }, { status: 400 });
  try {
    const result = answerQuestion(loadCases(), loadIndex(), query, {
      industry: url.searchParams.get("industry") || "",
      solution: url.searchParams.get("solution") || "",
      artifact: "executive_brief",
      limit: 5,
    });
    return Response.json({ query: result.query, matches: result.matches });
  } catch (error) {
    const status = Number(error.status) || 500;
    return Response.json({ error: status === 500 ? "검색을 처리하지 못했습니다." : error.message }, { status });
  }
}
