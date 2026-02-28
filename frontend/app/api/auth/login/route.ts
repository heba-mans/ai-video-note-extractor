import { NextResponse } from "next/server";
import { backendFetch } from "../../_lib/backend";

export async function POST(req: Request) {
  const payload = await req.json();

  const res = await backendFetch("/api/v1/auth/login", {
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

  // ✅ Forward ALL set-cookie headers (robust)
  const getSetCookie = (res.headers as any).getSetCookie?.bind(res.headers);
  const cookies = getSetCookie ? getSetCookie() : [];
  if (cookies.length) {
    for (const c of cookies) nextRes.headers.append("set-cookie", c);
  } else {
    const single = res.headers.get("set-cookie");
    if (single) nextRes.headers.append("set-cookie", single);
  }

  return nextRes;
}
