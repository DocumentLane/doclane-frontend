import { apiClient } from "@/lib/api/http-client";
import type { AuditLogItem, ListAuditLogsInput } from "../types/audit-log.types";

export async function listAuditLogs(
  input: ListAuditLogsInput = {},
): Promise<AuditLogItem[]> {
  const response = await apiClient.get<AuditLogItem[]>("/audit-logs", {
    params: input,
  });

  return response.data;
}
