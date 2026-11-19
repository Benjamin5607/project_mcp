import { cases as authoredCases } from "../../data/authoring/index.mjs";
import { resolveLanguage } from "../locale.mjs";
import { buildIndex } from "../pipeline.mjs";
import { retrieve } from "../retrieve.mjs";
import { INDUSTRIES } from "../taxonomy.mjs";
import { composeDocument } from "./compose.mjs";
import { parseConstraints } from "./constraints.mjs";
import { selectSpecialist } from "./models.mjs";
import { rankCases } from "./select.mjs";
import { customerLabel, httpError, requireText } from "./text.mjs";

let indexCache;

export function publishedBank() {
  return authoredCases.filter((item) => item.status === "published");
}

export function bankIndex() {
  if (!indexCache) indexCache = buildIndex(publishedBank(), "browser");
  return indexCache;
}

function allocateId(now = new Date()) {
  const bytes = new Uint8Array(3);
  globalThis.crypto.getRandomValues(bytes);
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `op-${now.getTime().toString(36)}-${hex}`;
}

function normalizeIndustry(value) {
  if (!value) return "";
  if (typeof value !== "string" || !INDUSTRIES[value]) throw httpError("That industry code is not in the case bank.", 400);
  return value;
}

/** Draft in the browser. No file is written and the pain text is not sent to an API. */
export async function draftOnePager(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw httpError("A JSON object is required.", 400);
  const language = resolveLanguage(input.language);
  const pain = requireText(input.pain, language === "ko" ? "페인포인트" : "pain point", 2000);
  const requirements = requireText(input.requirements, language === "ko" ? "특별 요구사항" : "special requirements", 2000);
  const label = customerLabel(input.customerLabel);
  const industry = normalizeIndustry(input.industry);
  const profile = parseConstraints(`${pain}\n${requirements}`);
  const cases = publishedBank();
  const matches = retrieve(bankIndex().chunks, `${pain}\n${requirements}`, {
    limit: 6,
    diverse: true,
    industry: industry || null,
  });
  const picked = rankCases(cases, matches, profile, language);
  if (!picked.kept.length) throw httpError(language === "ko" ? "조건에 맞는 게시 사례가 없습니다." : "No published case fits these constraints.", 400);
  const at = new Date();
  const specialist = await selectSpecialist({
    profile,
    apiKey: "",
    allowNetwork: false,
    language,
  });
  return composeDocument({
    id: allocateId(at),
    now: at.toISOString(),
    customerLabel: label,
    pain,
    requirements,
    industry,
    profile,
    picked,
    specialist,
    language,
  });
}
