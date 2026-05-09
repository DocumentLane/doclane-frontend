import { apiClient } from "@/lib/api/http-client";
import type {
  AuthenticatedUser,
  AuthTokenResponse,
  OidcAuthorizationResponse,
} from "../types/auth.types";

export async function createAuthorizationUrl(): Promise<OidcAuthorizationResponse> {
  const response = await apiClient.get<OidcAuthorizationResponse>(
    "/auth/oidc/authorize",
  );

  return response.data;
}

export async function authorizeCallback(params: {
  code: string;
  state: string;
}): Promise<AuthTokenResponse> {
  const response = await apiClient.get<AuthTokenResponse>(
    "/auth/oidc/callback",
    {
      params,
    },
  );

  return response.data;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<AuthenticatedUser>("/auth/oidc/me");

  return response.data;
}
