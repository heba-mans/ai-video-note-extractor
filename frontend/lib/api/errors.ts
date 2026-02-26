export type ApiErrorShape =
  | { error: { code: string; message: string; request_id?: string } }
  | { detail: unknown };

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function parseApiError(res: Response): Promise<ApiError> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  const msg =
    data?.error?.message ??
    (typeof data?.detail === "string" ? data.detail : null) ??
    `Request failed (${res.status})`;

  return new ApiError(
    msg,
    res.status,
    data?.error?.code,
    data?.error?.request_id
  );
}
