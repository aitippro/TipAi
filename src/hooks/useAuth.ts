import { trpc } from "@/providers/trpc";
import { useMemo } from "react";

export function useAuth() {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: true, // Local mode: always authenticated
      isLoading,
      refresh: refetch,
    }),
    [user, isLoading, refetch],
  );
}
