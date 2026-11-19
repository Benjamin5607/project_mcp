/** Product language. The database setting and the interface both read this. */
export const DEFAULT_LANGUAGE = "en";

export function isKorean(language) {
  return language === "ko";
}

export function resolveLanguage(language) {
  return language === "ko" ? "ko" : DEFAULT_LANGUAGE;
}
