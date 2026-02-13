export const PROFILE_LANGUAGE_OPTIONS = [
  { code: "en-US", label: "American English" },
  { code: "en-GB", label: "British English" },
  { code: "en-CA", label: "Canadian English" },
  { code: "en-AU", label: "Australian English" },
  { code: "en-NZ", label: "New Zealand English" },
  { code: "en-ZA", label: "South African English" },
] as const;

export type ProfileLanguageCode = (typeof PROFILE_LANGUAGE_OPTIONS)[number]["code"];

const STORAGE_KEY_LANGUAGE = "pilotwriter.profile.language";
const STORAGE_KEY_AI_OFF = "pilotwriter.profile.aiOff";

export function getProfileLanguage(): ProfileLanguageCode {
  if (typeof window === "undefined") return "en-US";
  const saved = window.localStorage.getItem(STORAGE_KEY_LANGUAGE);
  const valid = PROFILE_LANGUAGE_OPTIONS.some((o) => o.code === saved);
  return valid ? (saved as ProfileLanguageCode) : "en-US";
}

export function setProfileLanguage(code: ProfileLanguageCode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_LANGUAGE, code);
}

export function getProfileAiOff(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY_AI_OFF) === "true";
}

export function setProfileAiOff(off: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_AI_OFF, off ? "true" : "false");
}
