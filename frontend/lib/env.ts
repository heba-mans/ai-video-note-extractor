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
