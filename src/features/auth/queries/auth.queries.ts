import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAuthTokens, hasStoredAccessToken, storeAuthTokens } from "@/lib/auth/token-storage";
import {
  authorizeCallback,
  createAuthorizationUrl,
  getAuthenticatedUser,
} from "./auth.api";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
};

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: getAuthenticatedUser,
    enabled: enabled && hasStoredAccessToken(),
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: createAuthorizationUrl,
    onSuccess: (data) => {
      window.location.assign(data.authorizationUrl);
    },
  });
}

export function useAuthorizeCallbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authorizeCallback,
    onSuccess: (data) => {
      storeAuthTokens(data);
      queryClient.setQueryData(authQueryKeys.me, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    clearAuthTokens();
    queryClient.clear();
  };
}
