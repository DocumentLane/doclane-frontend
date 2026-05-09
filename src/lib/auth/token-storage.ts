export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

const accessTokenKey = "doclane.accessToken";
const refreshTokenKey = "doclane.refreshToken";
const tokenTypeKey = "doclane.tokenType";
const expiresInKey = "doclane.expiresIn";

function getStorage(): Storage | null {
  return globalThis.window?.localStorage ?? null;
}

export function getAccessToken(): string | null {
  return getStorage()?.getItem(accessTokenKey) ?? null;
}

export function getRefreshToken(): string | null {
  return getStorage()?.getItem(refreshTokenKey) ?? null;
}

export function hasStoredAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function storeAuthTokens(tokens: StoredAuthTokens): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(accessTokenKey, tokens.accessToken);
  storage.setItem(refreshTokenKey, tokens.refreshToken);
  storage.setItem(tokenTypeKey, tokens.tokenType);
  storage.setItem(expiresInKey, tokens.expiresIn.toString());
}

export function clearAuthTokens(): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(accessTokenKey);
  storage.removeItem(refreshTokenKey);
  storage.removeItem(tokenTypeKey);
  storage.removeItem(expiresInKey);
}
