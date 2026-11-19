import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { httpError } from "./text.mjs";

const ID_RE = /^op-[a-z0-9-]{6,80}$/;

export function onepagerDir(explicit) {
  return explicit || process.env.ONEPAGER_DIR || path.join(process.cwd(), "data", "onepagers");
}

export function assertId(id) {
  if (typeof id !== "string" || !ID_RE.test(id)) throw httpError("원페이저 번호 형식이 올바르지 않습니다.", 400);
  return id;
}

export function allocateId(now = new Date()) {
  return `op-${now.getTime().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export function saveOnePager(doc, dir) {
  assertId(doc.id);
  const folder = onepagerDir(dir);
  mkdirSync(folder, { recursive: true });
  const target = path.join(folder, `${doc.id}.json`);
  const tmp = path.join(folder, `.${doc.id}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(doc, null, 2));
  renameSync(tmp, target);
  return doc;
}

export function readOnePager(id, dir) {
  assertId(id);
  const file = path.join(onepagerDir(dir), `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function listOnePagers(dir) {
  const folder = onepagerDir(dir);
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        const doc = JSON.parse(readFileSync(path.join(folder, name), "utf8"));
        return {
          id: doc.id,
          customerLabel: doc.customerLabel,
          headline: doc.headline,
          status: doc.status,
          updatedAt: doc.updatedAt,
          theme: doc.solution?.theme || "",
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}
