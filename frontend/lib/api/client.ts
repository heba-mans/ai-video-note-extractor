import { ApiError } from "@/lib/api/error";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiFetchOptions = Omit<RequestInit, "method" | "body"> & {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * BFF-first URL builder.
 * - In the browser: use same-origin paths like "/api/auth/me"
 * - Absolute URLs are allowed for debugging/tools
 * - If you *must* support calling backend directly in server contexts later,
 *   do it in route handlers, not from here.
 */
function buildUrl(path: string) {
  // Allow full URL override
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Ensure leading slash
  return path.startsWith("/") ? path : `/${path}`;
}

async function safeParseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const url = buildUrl(path);

  const { method = "GET", body, headers, ...rest } = options;

  const res = await fetch(url, {
    method,
    credentials: "include", // ✅ httpOnly cookie auth
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      "X-Client": "frontend",
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  // ✅ Success
  if (res.ok) {
    if (res.status === 204) return null as T;
    const data = await safeParseJson(res);
    return data as T;
  }

  // ❌ Error handling
  const payload = await safeParseJson(res);

  const message =
    payload && typeof payload === "object"
      ? (payload as any)?.error?.message ??
        (typeof (payload as any)?.detail === "string"
          ? (payload as any).detail
          : undefined) ??
        `Request failed with status ${res.status}`
      : typeof payload === "string"
      ? payload
      : `Request failed with status ${res.status}`;

  const code =
    payload && typeof payload === "object"
      ? (payload as any)?.error?.code ??
        (typeof (payload as any)?.detail === "string" ? "error" : undefined)
      : undefined;

  const details =
    payload && typeof payload === "object"
      ? (payload as any)?.error?.details ?? (payload as any)?.error ?? payload
      : payload;

  // IMPORTANT: don't force a hard redirect here.
  // Let route protection (layout/server guard) handle auth UX consistently.
  throw new ApiError({
    status: res.status,
    message,
    code,
    details,
  });
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiFetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiFetch<T>(path, { ...options, method: "POST", body }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiFetch<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiFetch<T>(path, { ...options, method: "PATCH", body }),

  del: <T>(path: string, options?: Omit<ApiFetchOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
} as const;
