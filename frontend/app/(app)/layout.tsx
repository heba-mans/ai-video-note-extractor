import { AppShell } from "@/components/layout/app-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function requireSession() {
  const backend = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${backend}/api/v1/auth/me`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");
  return res.json();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
