import { draftOnePager } from "./session.mjs";

/** Ask the server to draft, so NVIDIA_API_KEY stays on the server. A static host with no API falls back to the local draft. */
export async function requestDraft(input, fetchImpl = globalThis.fetch) {
  const body = {
    customerLabel: input.customerLabel,
    pain: input.pain,
    requirements: input.requirements,
    language: input.language === "ko" ? "ko" : "en",
  };
  let response;
  try {
    response = await fetchImpl("/api/onepager", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return draftOnePager(body);
  }
  if (response.status === 404) return draftOnePager(body);
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const error = new Error(payload.error || "The draft could not be created.");
    error.status = response.status;
    throw error;
  }
  return payload;
}
