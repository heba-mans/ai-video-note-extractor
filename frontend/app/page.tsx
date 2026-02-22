"use client";

import { useQuery } from "@tanstack/react-query";

function TestQuery() {
  const { data, isLoading } = useQuery({
    queryKey: ["test"],
    queryFn: async () => {
      return new Promise<string>((resolve) =>
        setTimeout(() => resolve("React Query is working 🚀"), 800)
      );
    },
  });

  if (isLoading) return <p>Loading...</p>;
  return <p>{data}</p>;
}

export default function Home() {
  return (
    <main className="min-h-screen p-8 space-y-4">
      <h1 className="text-xl font-semibold">AI Video Note Extractor</h1>
      <TestQuery />
    </main>
  );
}
