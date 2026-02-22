import { env, assertEnv } from "@/lib/env";
import { ApiError } from "@/lib/api/error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiFetchOptions = Omit<RequestInit, "method" | "body"> & {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
};

function buildUrl(path: string) {
  assertEnv();

  // Allow full URL override
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = env.API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
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
      "X-Client": "frontend", // helpful for backend logs
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

  // 🔐 Global 401 redirect (browser only)
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

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
