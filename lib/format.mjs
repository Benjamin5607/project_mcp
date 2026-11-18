export function usdBand(low, high) {
  if (low == null || high == null) return "미정";
  const format = (value) => {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      return `$${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}k`;
  };
  return `${format(low)}–${format(high)}`;
}

export function weekBand(low, high) {
  if (low == null || high == null) return "미정";
  return `${low}–${high}주`;
}

export function dayBand(low, high) {
  if (low == null || high == null) return "미정";
  return `${low}–${high}일`;
}

export function safeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function clip(text, max = 280) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}
