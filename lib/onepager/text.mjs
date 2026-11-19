export function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireText(value, label, max) {
  const text = String(value ?? "").trim();
  if (!text) throw httpError(`${label} is required.`, 400);
  if (text.length > max) throw httpError(`${label} must be ${max} characters or fewer.`, 400);
  return text;
}

export function asText(value, max, label) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) throw httpError(`${label} is required.`, 400);
  if (text.length > max) throw httpError(`${label} must be ${max} characters or fewer.`, 400);
  return text;
}

export function asBlock(value, max, label) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) throw httpError(`${label} is required.`, 400);
  if (text.length > max) throw httpError(`${label} must be ${max} characters or fewer.`, 400);
  return text;
}

export function asOptionalText(value, max) {
  const text = String(value ?? "").trim();
  if (text.length > max) throw httpError(`Each field must be ${max} characters or fewer.`, 400);
  return text;
}

export function asStringList(value, maxItems, maxLen) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[,،、\n]/);
  const items = [];
  for (const entry of source) {
    const text = String(entry ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length > maxLen) throw httpError("A list item is too long.", 400);
    items.push(text);
    if (items.length > maxItems) throw httpError("That list has too many items.", 400);
  }
  return items;
}

export function linesToList(value, maxItems, maxLen) {
  return asStringList(Array.isArray(value) ? value : String(value ?? "").split(/\n/), maxItems, maxLen);
}

export function customerLabel(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Customer";
  if (text.length > 80) throw httpError("The customer label must be 80 characters or fewer.", 400);
  return text;
}

export function reviewerName(value) {
  const text = String(value ?? "").trim();
  if (!/^[\p{L}\p{N} .·()-]{2,40}$/u.test(text)) {
    throw httpError("The reviewer name must be 2–40 letters or numbers.", 400);
  }
  return text;
}

const BANNED_WHEN_ABSENT = ["국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크"];

export function introducesUnknownCustomer(text, source) {
  return BANNED_WHEN_ABSENT.some((name) => text.includes(name) && !source.includes(name));
}
