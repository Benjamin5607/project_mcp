import assert from "node:assert/strict";
import test from "node:test";
import { EMBED_DIM, cosine, embed } from "../lib/embed.mjs";

test("embeddings are deterministic, 384-d, and unit length", () => {
  const left = embed("금융권 Hypershield 가시성");
  const right = embed("금융권 Hypershield 가시성");
  assert.equal(left.length, EMBED_DIM);
  assert.deepEqual(left, right);
  const norm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9);
});

test("related Korean queries are closer than an unrelated one", () => {
  const query = embed("금융권 AI 가시성", { expand: true });
  const finance = embed("금융권 Hypershield AI Defense 가시성과 접근 통제");
  const noise = embed("Webex 노이즈 캔슬링 가상 배경 제스처");
  assert.ok(cosine(query, finance) > cosine(query, noise));
});
