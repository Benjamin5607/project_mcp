import { renderExport } from "../../../../../lib/onepager/export-html.mjs";
import { assertExportable } from "../../../../../lib/onepager/review.mjs";
import { readOnePager } from "../../../../../lib/onepager/store.mjs";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const doc = readOnePager(id);
    if (!doc) return Response.json({ error: "That one-pager was not found." }, { status: 404 });
    assertExportable(doc);
    const kind = new URL(request.url).searchParams.get("kind") || "report";
    const html = renderExport(doc, kind);
    const filename = kind === "slides" ? `${id}-slides.html` : `${id}-report.html`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const status = Number(error.status) || 500;
    return Response.json({ error: status === 500 ? "The document could not be created." : error.message }, { status });
  }
}
