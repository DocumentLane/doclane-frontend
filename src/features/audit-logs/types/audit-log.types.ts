import type { UserRole } from "@/features/auth/types/auth.types";

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_REFRESH"
  | "DOCUMENT_CREATE_UPLOAD_SESSION"
  | "DOCUMENT_COMPLETE_UPLOAD"
  | "DOCUMENT_READ"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_PREVIEW"
  | "DOCUMENT_UPDATE"
  | "DOCUMENT_DELETE"
  | "DOCUMENT_PUBLIC_ACCESS_UPDATE"
  | "DOCUMENT_PERMISSION_GRANT"
  | "DOCUMENT_PERMISSION_REVOKE"
  | "DOCUMENT_OCR_REPROCESS"
  | "DOCUMENT_JOB_RESTART"
  | "FOLDER_CREATE"
  | "FOLDER_UPDATE"
  | "FOLDER_DELETE"
  | "FOLDER_PUBLIC_ACCESS_UPDATE"
  | "FOLDER_PERMISSION_GRANT"
  | "FOLDER_PERMISSION_REVOKE"
  | "USER_UPDATE"
  | "GROUP_CREATE"
  | "GROUP_UPDATE"
  | "WORKER_SETTINGS_UPDATE";

export type AuditResourceType =
  | "AUTH"
  | "DOCUMENT"
  | "FOLDER"
  | "USER"
  | "GROUP"
  | "WORKER_SETTINGS";

export interface AuditLogActor {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  summary: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: AuditLogActor | null;
}

export interface ListAuditLogsInput {
  actorId?: string;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  from?: string;
  to?: string;
  take?: number;
  cursor?: string;
}
