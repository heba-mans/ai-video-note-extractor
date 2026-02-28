import { NextResponse } from "next/server";
import { backendFetch } from "../../../../_lib/backend";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { jobId } = await params;

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = url.searchParams.get("limit") ?? "50";
  const offset = url.searchParams.get("offset") ?? "0";

  const res = await backendFetch(
    `/api/v1/jobs/${jobId}/transcript/search?q=${encodeURIComponent(
      q
    )}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    { method: "GET" }
  );

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
