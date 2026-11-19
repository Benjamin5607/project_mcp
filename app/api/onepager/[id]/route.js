import { applyReview } from "../../../../lib/onepager/review.mjs";
import { readOnePager } from "../../../../lib/onepager/store.mjs";

export const runtime = "nodejs";

function fail(error) {
  const status = Number(error.status) || 500;
  return Response.json({ error: status === 500 ? "The one-pager could not be saved." : error.message }, { status });
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const doc = readOnePager(id);
    if (!doc) return Response.json({ error: "That one-pager was not found." }, { status: 404 });
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
    return Response.json({ error: "A JSON body is required." }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    return Response.json(applyReview(id, body));
  } catch (error) {
    return fail(error);
  }
}
