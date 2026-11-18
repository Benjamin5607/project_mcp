import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { cases } from "../data/authoring/index.mjs";
import { EMBED_MODEL } from "./embed.mjs";
import { buildIndex } from "./pipeline.mjs";

let cachedIndex;

export function loadCases() {
  return cases;
}

export function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const file = path.join(process.cwd(), "data", "index.json");
  if (existsSync(file)) {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed.model === EMBED_MODEL && parsed.chunks?.length) {
      cachedIndex = parsed;
      return cachedIndex;
    }
  }
  cachedIndex = buildIndex(cases, "runtime");
  return cachedIndex;
}

export function publishedCases() {
  return cases.filter((item) => item.status === "published");
}
