import { createOnePager } from "../../../lib/onepager/run.mjs";
import { listOnePagers } from "../../../lib/onepager/store.mjs";

export const runtime = "nodejs";

function fail(error) {
  const status = Number(error.status) || 500;
  return Response.json({ error: status === 500 ? "원페이저를 만들지 못했습니다." : error.message }, { status });
}

export async function GET() {
  return Response.json({ items: listOnePagers() });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }
  try {
    const doc = await createOnePager(body);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
