export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
} as const;

export function assertEnv() {
  if (!env.API_BASE_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL. Add it to frontend/.env.local"
    );
  }
}

export function getAppBaseUrl(): string {
  // Prefer configured public base URL for sharing/demo (e.g. ngrok or real domain).
  const fromEnv = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Fallback: current origin in browser.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Last resort (server/build-time)
  return "http://localhost:3000";
}
