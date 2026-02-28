import { NextResponse } from "next/server";
import { backendFetch } from "../../../_lib/backend";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { jobId } = await params;

  const res = await backendFetch(`/api/v1/jobs/${jobId}/results`, {
    method: "GET",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
