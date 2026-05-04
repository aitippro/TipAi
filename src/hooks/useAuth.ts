import { trpc } from "@/providers/trpc";
import { useMemo } from "react";

export function useAuth() {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // isAuthenticated is always true — TipAi is a local-only desktop app.
  // Users download the app and configure their own API keys locally.
  // There is no login, no network auth, no multi-user. The auth query
  // above (trpc.auth.me) exists for compatibility with middleware that
  // expects a user object, but the app never blocks access based on it.
  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: true,
      isLoading,
      refresh: refetch,
    }),
    [user, isLoading, refetch],
  );
}
