export type CookieConsent = "accepted" | "rejected" | null;

const KEY = "pm_cookie_consent";

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function setCookieConsent(value: "accepted" | "rejected") {
  window.localStorage.setItem(KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
}

export function resetCookieConsent() {
  window.localStorage.removeItem(KEY);
}
