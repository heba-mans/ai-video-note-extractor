"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { ApiError } from "@/lib/api/error";

export type SessionUser = { id: string; email: string };

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.get<SessionUser>(routes.auth.me());
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
