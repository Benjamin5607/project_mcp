import assert from "node:assert/strict";
import test from "node:test";
import { cases } from "../data/authoring/index.mjs";
import { answerQuestion, buildIndex } from "../lib/pipeline.mjs";

const index = buildIndex(cases, "test");
const SAMPLE = "금융권 고객의 AI 애플리케이션 보안 가시성 확보를 위한 Hypershield 도입 사례와 RACI 매트릭스 초안을 작성해 줘";

test("the sample PM question grounds RACI on the financial scenario", () => {
  const result = answerQuestion(cases, index, SAMPLE, { artifact: "auto", limit: 5 });
  assert.equal(result.artifact.kind, "raci");
  assert.equal(result.artifact.primaryCaseCode, "CSCO-HYP-FIN-001");
  assert.equal(result.matches[0].caseCode, "CSCO-HYP-FIN-001");
  assert.equal(result.matches.length, 5);
  assert.equal(new Set(result.matches.map((match) => match.caseCode)).size, 5);
  assert.match(result.artifact.markdown, /CISO\(스폰서\)/);
  assert.match(result.artifact.markdown, /planning band/i);
  const packed = JSON.stringify(result);
  assert.equal(packed.includes("국민은행"), false);
  assert.equal(packed.includes("신한은행"), false);
  assert.equal(packed.includes("우리은행"), false);
});

test("XDR and AI factory queries hit their own cases first", () => {
  const xdr = answerQuestion(cases, index, "Cisco XDR 보안 운영 플레이북과 디지털 회복탄력성", { limit: 5 });
  const factory = answerQuestion(cases, index, "NVIDIA Secure AI Factory 엔터프라이즈 포드", { limit: 5 });
  assert.equal(xdr.matches[0].caseCode, "CSCO-XDR-SOC-001");
  assert.equal(factory.matches[0].caseCode, "CSCO-AIF-NVD-001");
});

test("empty and oversized queries are rejected", () => {
  assert.throws(() => answerQuestion(cases, index, "   "), /empty/);
  assert.throws(() => answerQuestion(cases, index, "가".repeat(2001)), /2000/);
});
