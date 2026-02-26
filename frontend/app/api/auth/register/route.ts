import { NextResponse } from "next/server";
import { backendFetch } from "../../_lib/backend";

export async function POST(req: Request) {
  const payload = await req.json();

  const res = await backendFetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  const nextRes = new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) nextRes.headers.set("set-cookie", setCookie);

  return nextRes;
}
