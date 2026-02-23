import { useQuery } from "@tanstack/react-query";
import { fetchJobs } from "../jobs.api";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    staleTime: 1000 * 15,
    refetchOnWindowFocus: false,
  });
}
