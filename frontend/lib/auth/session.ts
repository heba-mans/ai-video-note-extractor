import { cookies } from "next/headers";

export async function getSessionOrNull() {
  // We only check that cookie exists and then let /api/auth/me validate.
  // This avoids a false sense of auth if cookie is invalid.
  const cookieHeader = cookies().toString();
  if (!cookieHeader.includes("access_token=")) return null;

  // Call BFF me endpoint server-side (same origin)
  const res = await fetch("http://localhost:3000/api/auth/me", {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}
