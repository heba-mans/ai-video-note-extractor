import { NextResponse } from "next/server";
import { backendFetch } from "../../_lib/backend";

export async function GET() {
  const res = await backendFetch("/api/v1/auth/me");
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
