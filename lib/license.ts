"use client";

const LICENSE_STORAGE_KEY = "pilotwriter.license.serial";
const LICENSE_ACCEPTED_KEY = "pilotwriter.license.accepted";

export function validateSerial(raw: string): boolean {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^PW[A-Z0-9]{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s.charCodeAt(i);
  }
  return sum % 31 === 0;
}

export function getStoredLicense(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LICENSE_STORAGE_KEY);
}

export function isActivated(): boolean {
  if (typeof window === "undefined") return false;
  const serial = window.localStorage.getItem(LICENSE_STORAGE_KEY);
  const accepted = window.localStorage.getItem(LICENSE_ACCEPTED_KEY);
  return !!serial && accepted === "true" && validateSerial(serial);
}

export function activateLicense(serial: string): boolean {
  if (!validateSerial(serial)) return false;
  const cleaned = serial.replace(/[\s-]/g, "").toUpperCase();
  window.localStorage.setItem(LICENSE_STORAGE_KEY, cleaned);
  window.localStorage.setItem(LICENSE_ACCEPTED_KEY, "true");
  return true;
}

export function deactivateLicense(): void {
  window.localStorage.removeItem(LICENSE_STORAGE_KEY);
  window.localStorage.removeItem(LICENSE_ACCEPTED_KEY);
}
