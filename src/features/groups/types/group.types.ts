export interface GroupItem {
  id: string;
  issuer: string;
  externalId: string;
  displayName: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  externalId: string;
  displayName?: string;
  description?: string;
}

export interface UpdateGroupInput {
  groupId: string;
  displayName?: string | null;
  description?: string | null;
}
