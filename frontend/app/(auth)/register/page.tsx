"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { ApiError } from "@/lib/api/error";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      await api.post(routes.auth.register(), { email, password });
      toast.success("Account created!");
      router.replace("/jobs");
      router.refresh();
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message ?? "Register failed";
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
          <h1 className="text-xl font-semibold">Register</h1>
          <p className="text-sm text-muted-foreground">
            Create an account to start processing videos.
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
          {loading ? "Creating…" : "Create account"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <a className="underline" href="/login">
            Log in
          </a>
        </div>
      </form>
    </div>
  );
}
