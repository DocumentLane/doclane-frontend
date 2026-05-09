export type UserRole = "ADMIN" | "USER";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface OidcAuthorizationResponse {
  authorizationUrl: string;
}
