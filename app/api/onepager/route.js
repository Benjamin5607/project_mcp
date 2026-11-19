import { createOnePager } from "../../../lib/onepager/run.mjs";
import { listOnePagers } from "../../../lib/onepager/store.mjs";

export const runtime = "nodejs";

function fail(error) {
  const status = Number(error.status) || 500;
  return Response.json({ error: status === 500 ? "The one-pager could not be created." : error.message }, { status });
}

export async function GET() {
  return Response.json({ items: listOnePagers() });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A JSON body is required." }, { status: 400 });
  }
  try {
    const doc = await createOnePager(body);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
