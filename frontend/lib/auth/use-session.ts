"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { ApiError } from "@/lib/api/error";

export type SessionUser = { id: string; email: string };

export function useSession() {
  const q = useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.get<SessionUser>(routes.auth.me());
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    user: q.data ?? null,
    isLoading: q.isLoading,
    isAuthenticated: !!q.data,
  };
}
