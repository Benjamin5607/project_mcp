import { applyReview } from "../../../../lib/onepager/review.mjs";
import { readOnePager } from "../../../../lib/onepager/store.mjs";

export const runtime = "nodejs";

function fail(error) {
  const status = Number(error.status) || 500;
  return Response.json({ error: status === 500 ? "원페이저를 처리하지 못했습니다." : error.message }, { status });
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const doc = readOnePager(id);
    if (!doc) return Response.json({ error: "원페이저를 찾지 못했습니다." }, { status: 404 });
    return Response.json(doc);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request, context) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    return Response.json(applyReview(id, body));
  } catch (error) {
    return fail(error);
  }
}
