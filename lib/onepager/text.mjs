export function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireText(value, label, max) {
  const text = String(value ?? "").trim();
  if (!text) throw httpError(`${label}이 비어 있습니다.`, 400);
  if (text.length > max) throw httpError(`${label}은 ${max}자 이하로 보내 주세요.`, 400);
  return text;
}

export function asText(value, max, label) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) throw httpError(`${label}이 비어 있습니다.`, 400);
  if (text.length > max) throw httpError(`${label}은 ${max}자 이하로 보내 주세요.`, 400);
  return text;
}

export function asBlock(value, max, label) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) throw httpError(`${label}이 비어 있습니다.`, 400);
  if (text.length > max) throw httpError(`${label}은 ${max}자 이하로 보내 주세요.`, 400);
  return text;
}

export function asOptionalText(value, max) {
  const text = String(value ?? "").trim();
  if (text.length > max) throw httpError(`항목은 ${max}자 이하로 보내 주세요.`, 400);
  return text;
}

export function asStringList(value, maxItems, maxLen) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[,،、\n]/);
  const items = [];
  for (const entry of source) {
    const text = String(entry ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length > maxLen) throw httpError("목록 항목이 너무 깁니다.", 400);
    items.push(text);
    if (items.length > maxItems) throw httpError("목록 항목이 너무 많습니다.", 400);
  }
  return items;
}

export function linesToList(value, maxItems, maxLen) {
  return asStringList(Array.isArray(value) ? value : String(value ?? "").split(/\n/), maxItems, maxLen);
}

export function customerLabel(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "고객";
  if (text.length > 80) throw httpError("고객 표시 이름은 80자 이하로 보내 주세요.", 400);
  return text;
}

export function reviewerName(value) {
  const text = String(value ?? "").trim();
  if (!/^[\p{L}\p{N} .·()-]{2,40}$/u.test(text)) {
    throw httpError("검토자 이름은 2–40자의 문자로 적어 주세요.", 400);
  }
  return text;
}

const BANNED_WHEN_ABSENT = ["국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크"];

export function introducesUnknownCustomer(text, source) {
  return BANNED_WHEN_ABSENT.some((name) => text.includes(name) && !source.includes(name));
}
