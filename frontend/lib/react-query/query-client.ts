import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SaaS-friendly defaults
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 1000 * 30, // 30 seconds
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
