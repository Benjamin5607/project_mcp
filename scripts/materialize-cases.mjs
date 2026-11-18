import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cases } from "../data/authoring/index.mjs";

const dir = path.join(process.cwd(), "data", "cases");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sortCases(list) {
  return [...list].sort((left, right) => left.caseCode.localeCompare(right.caseCode));
}

function readDisk() {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")));
}

if (process.argv.includes("--check")) {
  const disk = readDisk();
  const left = JSON.stringify(stable(sortCases(cases)));
  const right = JSON.stringify(stable(sortCases(disk)));
  if (left !== right) {
    console.error("data/cases JSON이 작성 원본과 다릅니다. npm run materialize 를 실행하세요.");
    process.exit(1);
  }
  console.log(`case json matches authoring (${cases.length})`);
} else {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".json")) rmSync(path.join(dir, name));
  }
  for (const item of cases) {
    writeFileSync(path.join(dir, `${item.slug}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }
  console.log(`wrote ${cases.length} case files`);
}
