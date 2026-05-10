import { apiClient } from "@/lib/api/http-client";
import type {
  CreateFolderInput,
  FolderItem,
  RemoveResourcePermissionInput,
  ResourcePermissionItem,
  SaveResourcePermissionInput,
  UpdateFolderInput,
  UpdateFolderPublicAccessInput,
} from "../types/folder.types";

export async function listFolders(): Promise<FolderItem[]> {
  const response = await apiClient.get<FolderItem[]>("/folders");

  return response.data;
}

export async function createFolder(
  input: CreateFolderInput,
): Promise<FolderItem> {
  const response = await apiClient.post<FolderItem>("/folders", input);

  return response.data;
}

export async function updateFolder(
  input: UpdateFolderInput,
): Promise<FolderItem> {
  const response = await apiClient.patch<FolderItem>(`/folders/${input.folderId}`, {
    name: input.name,
  });

  return response.data;
}

export async function updateFolderPublicAccess(
  input: UpdateFolderPublicAccessInput,
): Promise<FolderItem> {
  const response = await apiClient.patch<FolderItem>(
    `/folders/${input.folderId}/public-access`,
    {
      isPublic: input.isPublic,
    },
  );

  return response.data;
}

export async function deleteFolder(folderId: string): Promise<void> {
  await apiClient.delete(`/folders/${folderId}`);
}

export async function listFolderPermissions(
  folderId: string,
): Promise<ResourcePermissionItem[]> {
  const response = await apiClient.get<ResourcePermissionItem[]>(
    `/folders/${folderId}/permissions`,
  );

  return response.data;
}

export async function saveFolderPermission(
  input: SaveResourcePermissionInput,
): Promise<ResourcePermissionItem> {
  const response = await apiClient.put<ResourcePermissionItem>(
    `/folders/${input.resourceId}/permissions/${input.targetType}/${input.targetId}`,
    {
      permission: input.permission,
    },
  );

  return response.data;
}

export async function removeFolderPermission(
  input: RemoveResourcePermissionInput,
): Promise<void> {
  await apiClient.delete(
    `/folders/${input.resourceId}/permissions/${input.targetType}/${input.targetId}`,
  );
}
