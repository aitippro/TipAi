import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectPath = LOGIN_PATH } = options ?? {};
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    // Don't throw errors to error boundary - auth.me now returns null for unauthenticated
    meta: { errorToast: false },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate(redirectPath);
    },
  });

  const demoLoginMutation = trpc.auth.demoLogin.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/");
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);
  const demoLogin = useCallback(() => demoLoginMutation.mutate(), [demoLoginMutation]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user && (user as { id?: number }).id !== 0,
      isLoading: isLoading || logoutMutation.isPending || demoLoginMutation.isPending,
      logout,
      demoLogin,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, demoLoginMutation.isPending, logout, demoLogin, refetch],
  );
}
