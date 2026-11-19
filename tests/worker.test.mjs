import assert from "node:assert/strict";
import test from "node:test";
import { createGateway } from "../workers/src/index.js";

function gateway() {
  return createGateway({
    answer: async (body) => {
      if (!body.query.trim()) {
        const error = new Error("The question is empty.");
        error.status = 400;
        throw error;
      }
      return { query: body.query, artifact: { kind: body.artifact } };
    },
  });
}

test("gateway health and ask", async () => {
  const app = gateway();
  const health = await app.fetch(new Request("https://gateway.local/health"));
  assert.equal(health.status, 200);
  const ok = await app.fetch(
    new Request("https://gateway.local/ask", {
      method: "POST",
      body: JSON.stringify({ query: "금융 Hypershield RACI", artifact: "raci" }),
    }),
  );
  assert.equal(ok.status, 200);
  const payload = await ok.json();
  assert.equal(payload.artifact.kind, "raci");
});

test("gateway rejects bad input without echoing internals", async () => {
  const app = gateway();
  const missing = await app.fetch(new Request("https://gateway.local/ask", { method: "POST", body: "{" }));
  assert.equal(missing.status, 400);
  const empty = await app.fetch(
    new Request("https://gateway.local/ask", { method: "POST", body: JSON.stringify({ query: " " }) }),
  );
  assert.equal(empty.status, 400);
  const other = await app.fetch(new Request("https://gateway.local/admin"));
  assert.equal(other.status, 404);
});
