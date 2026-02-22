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
  // If caller accidentally passes full URL, allow it.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
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
    credentials: "include", // ✅ cookie auth
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (res.ok) {
    // handle empty responses (204)
    if (res.status === 204) return null as T;
    const data = await safeParseJson(res);
    return data as T;
  }

  // Non-2xx
  const payload = await safeParseJson(res);

  // Try to map backend standardized error shape if present
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as any).message === "string"
      ? (payload as any).message
      : typeof payload === "string"
      ? payload
      : `Request failed with status ${res.status}`;

  const code =
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    typeof (payload as any).code === "string"
      ? (payload as any).code
      : undefined;

  const details =
    payload && typeof payload === "object" && "details" in payload
      ? (payload as any).details
      : payload;

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
