import { writeFileSync } from "node:fs";
import path from "node:path";
import { cases } from "../data/authoring/index.mjs";
import { buildIndex } from "../lib/pipeline.mjs";

const index = buildIndex(cases, "feature-hash-v1");
const target = path.join(process.cwd(), "data", "index.json");
writeFileSync(target, JSON.stringify(index));
console.log(`indexed ${index.chunks.length} chunks (${index.dim}d, ${index.model})`);
