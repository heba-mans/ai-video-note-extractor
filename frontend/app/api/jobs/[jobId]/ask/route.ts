import { NextResponse } from "next/server";
import { backendFetch } from "../../../_lib/backend";

type Params = { params: Promise<{ jobId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { jobId } = await params;
  const payload = await req.text(); // pass-through

  const res = await backendFetch(`/api/v1/jobs/${jobId}/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });

  const body = await res.text();
  const nextRes = new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });

  return nextRes;
}
