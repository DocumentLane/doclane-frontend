import { apiClient } from "@/lib/api/http-client";
import type { UpdateUserInput, UserItem } from "../types/user.types";

export async function listUsers(): Promise<UserItem[]> {
  const response = await apiClient.get<UserItem[]>("/users");

  return response.data;
}

export async function getUser(userId: string): Promise<UserItem> {
  const response = await apiClient.get<UserItem>(`/users/${userId}`);

  return response.data;
}

export async function updateUser(input: UpdateUserInput): Promise<UserItem> {
  const response = await apiClient.put<UserItem>(`/users/${input.userId}`, {
    role: input.role,
    groupIds: input.groupIds,
  });

  return response.data;
}
