import { reviewDocument } from "./review-core.mjs";
import { saveOnePager, readOnePager } from "./store.mjs";
import { httpError } from "./text.mjs";

export { assertExportable } from "./review-core.mjs";

export function applyReview(id, body, opts = {}) {
  const doc = readOnePager(id, opts.dir);
  if (!doc) throw httpError("That one-pager was not found.", 404);
  return saveOnePager(reviewDocument(doc, body, opts), opts.dir);
}
