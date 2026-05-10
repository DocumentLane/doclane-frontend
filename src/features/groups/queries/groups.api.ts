import { apiClient } from "@/lib/api/http-client";
import type {
  CreateGroupInput,
  GroupItem,
  UpdateGroupInput,
} from "../types/group.types";

export async function listGroups(): Promise<GroupItem[]> {
  const response = await apiClient.get<GroupItem[]>("/groups");

  return response.data;
}

export async function createGroup(input: CreateGroupInput): Promise<GroupItem> {
  const response = await apiClient.post<GroupItem>("/groups", input);

  return response.data;
}

export async function updateGroup(input: UpdateGroupInput): Promise<GroupItem> {
  const response = await apiClient.patch<GroupItem>(`/groups/${input.groupId}`, {
    displayName: input.displayName,
    description: input.description,
  });

  return response.data;
}
