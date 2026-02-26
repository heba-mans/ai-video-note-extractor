import { NextResponse } from "next/server";
import { backendFetch } from "../_lib/backend";

// GET /api/jobs  ->  GET /api/v1/jobs
export async function GET() {
  const res = await backendFetch("/api/v1/jobs", { method: "GET" });
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

// POST /api/jobs  ->  POST /api/v1/jobs
export async function POST(req: Request) {
  const payload = await req.json();

  const res = await backendFetch("/api/v1/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
