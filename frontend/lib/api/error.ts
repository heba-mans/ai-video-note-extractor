export type ApiErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(args: {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
