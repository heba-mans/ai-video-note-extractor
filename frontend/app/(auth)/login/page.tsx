"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/api/routes";
import { api } from "@/lib/api/client";

export default function LoginPage() {
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
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Access your jobs and chat sessions.
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
          autoComplete="current-password"
        />

        {error ? <div className="text-sm text-red-500">{error}</div> : null}

        <button
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        Don’t have an account?{" "}
        <a className="underline" href="/register">
          Register
        </a>
      </div>
    </div>
  );
}
