import { NextResponse } from "next/server";
import { backendFetch } from "../../_lib/backend";

export async function POST() {
  const res = await backendFetch("/api/v1/auth/logout", { method: "POST" });
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
