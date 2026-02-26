import { cookies } from "next/headers";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

/**
 * Server-side fetch to backend that forwards cookies for httpOnly auth.
 * Next.js 16: cookies() is async.
 */
export async function backendFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  // Build "Cookie" header string manually
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const headers = new Headers(init.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return fetch(`${BACKEND_ORIGIN}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
