import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  storeAuthTokens,
} from "@/lib/auth/token-storage";
import type { AuthTokenResponse } from "@/features/auth/types/auth.types";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: "/api/backend",
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const refreshToken = getRefreshToken();

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !refreshToken
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const response = await axios.post<AuthTokenResponse>(
        "/api/backend/auth/oidc/refresh",
        { refreshToken },
      );
      storeAuthTokens(response.data);
      originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();

      return Promise.reject(refreshError);
    }
  },
);
