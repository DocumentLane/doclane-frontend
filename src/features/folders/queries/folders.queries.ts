import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFolder,
  deleteFolder,
  listFolderPermissions,
  listFolders,
  removeFolderPermission,
  saveFolderPermission,
  updateFolder,
  updateFolderPublicAccess,
} from "./folders.api";
import type { FolderItem } from "../types/folder.types";

export const folderQueryKeys = {
  all: ["folders"] as const,
  lists: () => [...folderQueryKeys.all, "list"] as const,
  permissions: (folderId: string) =>
    [...folderQueryKeys.all, "permissions", folderId] as const,
};

export function useFoldersQuery() {
  return useQuery({
    queryKey: folderQueryKeys.lists(),
    queryFn: listFolders,
  });
}

export function useFolderPermissionsQuery(folderId: string | null) {
  return useQuery({
    queryKey: folderId
      ? folderQueryKeys.permissions(folderId)
      : [...folderQueryKeys.all, "permissions", "missing"],
    queryFn: () => listFolderPermissions(folderId as string),
    enabled: Boolean(folderId),
  });
}

export function useCreateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.lists() });
    },
  });
}

export function useUpdateFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFolder,
    onSuccess: async (folder) => {
      queryClient.setQueryData<FolderItem[] | undefined>(
        folderQueryKeys.lists(),
        (folders) =>
          folders?.map((item) => (item.id === folder.id ? folder : item)) ??
          folders,
      );
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.lists() });
    },
  });
}

export function useUpdateFolderPublicAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFolderPublicAccess,
    onSuccess: async (folder) => {
      queryClient.setQueryData<FolderItem[] | undefined>(
        folderQueryKeys.lists(),
        (folders) =>
          folders?.map((item) => (item.id === folder.id ? folder : item)) ??
          folders,
      );
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.lists() });
    },
  });
}

export function useDeleteFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: async (_result, folderId) => {
      queryClient.removeQueries({
        queryKey: folderQueryKeys.permissions(folderId),
      });
      await queryClient.invalidateQueries({ queryKey: folderQueryKeys.lists() });
    },
  });
}

export function useSaveFolderPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveFolderPermission,
    onSuccess: async (_permission, input) => {
      await queryClient.invalidateQueries({
        queryKey: folderQueryKeys.permissions(input.resourceId),
      });
    },
  });
}

export function useRemoveFolderPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFolderPermission,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: folderQueryKeys.permissions(input.resourceId),
      });
    },
  });
}
