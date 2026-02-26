"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/api/routes";
import { api } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(routes.auth.login(), { email, password });
      router.push("/jobs");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start extracting notes from videos.
      </p>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <button
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <a className="underline" href="/login">
          Log in
        </a>
      </div>
    </div>
  );
}
