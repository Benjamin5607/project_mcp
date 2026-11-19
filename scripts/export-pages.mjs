import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";

const parked = [
  ["app/api", ".pages-park/api"],
  ["app/onepager/[id]", ".pages-park/onepager-id"],
];

function park() {
  mkdirSync(".pages-park", { recursive: true });
  for (const [from, to] of parked) {
    if (existsSync(to)) renameSync(to, from);
    if (existsSync(from)) renameSync(from, to);
  }
}

function restore() {
  for (const [from, to] of parked) {
    if (existsSync(to)) renameSync(to, from);
  }
}

park();
let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
  status = result.status ?? 1;
  if (status === 0 && existsSync("out")) writeFileSync("out/.nojekyll", "");
} finally {
  restore();
}
process.exit(status);
