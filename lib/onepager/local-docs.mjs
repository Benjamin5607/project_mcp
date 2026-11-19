const KEY = "case-bank-onepagers-v1";

function readMap() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function listLocalOnePagers() {
  return Object.values(readMap())
    .filter((doc) => doc && typeof doc.id === "string")
    .map((doc) => ({
      id: doc.id,
      customerLabel: doc.customerLabel,
      headline: doc.headline,
      status: doc.status,
      updatedAt: doc.updatedAt,
      theme: doc.solution?.theme || "",
    }))
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export function readLocalOnePager(id) {
  const doc = readMap()[id];
  return doc || null;
}

export function saveLocalOnePager(doc) {
  const map = readMap();
  map[doc.id] = doc;
  writeMap(map);
  return doc;
}
