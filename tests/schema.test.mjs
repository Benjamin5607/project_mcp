import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/001_pm_case_bank.sql", import.meta.url), "utf8");

test("migration covers the PM framework and hnsw cosine search", () => {
  for (const table of [
    "solution_cases",
    "knowledge_areas",
    "process_groups",
    "stakeholders",
    "requirements",
    "raci_items",
    "wbs_items",
    "milestones",
    "risks",
    "issues",
    "kpis",
    "cost_lines",
    "quality_gates",
    "communications",
    "procurement_items",
    "decisions",
    "lessons",
    "benefits",
    "case_chunks",
    "source_documents",
    "collection_runs",
  ]) {
    assert.match(sql, new RegExp(`create table ${table}`));
  }
  assert.match(sql, /using hnsw \(embedding vector_cosine_ops\)/);
  assert.match(sql, /function match_case_chunks/);
  assert.match(sql, /confidentiality = 'public'/);
  assert.match(sql, /create table app_settings/);
  assert.match(sql, /default_language text not null default 'en' check \(default_language = 'en'\)/);
  assert.match(sql, /language text not null default 'en' check \(language = 'en'\)/);
});
