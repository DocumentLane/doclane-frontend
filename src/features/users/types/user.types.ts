import type { UserRole } from "@/features/auth/types/auth.types";
import type { GroupItem } from "@/features/groups/types/group.types";

export interface UserGroupMembership {
  id: string;
  groupId: string;
  group: Pick<GroupItem, "id" | "externalId" | "displayName" | "description">;
}

export interface UserItem {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  groupsInitializedAt: string | null;
  authorizedAt: string;
  createdAt: string;
  updatedAt: string;
  groupMemberships?: UserGroupMembership[];
}

export interface UpdateUserInput {
  userId: string;
  role?: UserRole;
  groupIds?: string[];
}
