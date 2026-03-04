import { backendFetch } from "@/app/api/_lib/backend";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ jobId: string }> };

export async function POST(_: Request, { params }: Params) {
  const { jobId } = await params;

  const res = await backendFetch(`/api/v1/jobs/${jobId}/delete`, {
    method: "POST",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
