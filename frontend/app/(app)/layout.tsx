import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/lib/query/providers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function requireSession() {
  const backend = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${backend}/api/v1/auth/me`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) redirect("/login");
  } catch {
    redirect("/login");
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
