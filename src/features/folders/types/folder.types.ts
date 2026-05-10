import type { GroupItem } from "@/features/groups/types/group.types";
import type { UserItem } from "@/features/users/types/user.types";

export type ResourcePermission = "READ";

export interface FolderItem {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ResourcePermissionPrincipalUser = Pick<
  UserItem,
  "id" | "email" | "displayName"
>;

export type ResourcePermissionPrincipalGroup = Pick<
  GroupItem,
  "id" | "externalId" | "displayName" | "description"
>;

export interface ResourcePermissionItem {
  id: string;
  userId: string | null;
  groupId: string | null;
  permission: ResourcePermission;
  user?: ResourcePermissionPrincipalUser | null;
  group?: ResourcePermissionPrincipalGroup | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPermissions {
  direct: ResourcePermissionItem[];
  inheritedFromFolder: ResourcePermissionItem[];
}

export interface CreateFolderInput {
  name: string;
}

export interface UpdateFolderInput {
  folderId: string;
  name: string;
}

export interface UpdateFolderPublicAccessInput {
  folderId: string;
  isPublic: boolean;
}

export interface SaveResourcePermissionInput {
  resourceId: string;
  targetType: "users" | "groups";
  targetId: string;
  permission: ResourcePermission;
}

export interface RemoveResourcePermissionInput {
  resourceId: string;
  targetType: "users" | "groups";
  targetId: string;
}
