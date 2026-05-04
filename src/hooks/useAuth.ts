import { useMemo } from "react";

/**
 * Auth hook for TipAi — local-only desktop app.
 * No login, no network auth, no multi-user. Returns a static user object.
 */
export function useAuth() {
  return useMemo(
    () => ({
      user: { id: 1, name: "TipAi 用户", role: "admin" as const },
      isAuthenticated: true,
      isLoading: false,
      refresh: () => Promise.resolve(),
    }),
    [],
  );
}
