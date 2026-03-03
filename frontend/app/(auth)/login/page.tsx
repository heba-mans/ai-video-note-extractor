"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { ApiError } from "@/lib/api/error";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      toast.success("Welcome back!");
      router.replace("/jobs");
      router.refresh();
    } catch (err: any) {
      const msg =
        err instanceof ApiError ? err.message : err?.message ?? "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <form onSubmit={onSubmit} className="w-full space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Log in</h1>
          <p className="text-sm text-muted-foreground">
            Access your jobs and chat sessions.
          </p>
        </div>

        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@domain.com"
          type="email"
          required
        />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
        />

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <a className="underline" href="/register">
            Register
          </a>
        </div>
      </form>
    </div>
  );
}
