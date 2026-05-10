import { useInfiniteQuery } from "@tanstack/react-query";
import { listAuditLogs } from "./audit-logs.api";
import type { AuditLogItem, ListAuditLogsInput } from "../types/audit-log.types";

export const auditLogPageSize = 50;

interface AuditLogPage {
  items: AuditLogItem[];
  nextCursor?: string;
}

export const auditLogQueryKeys = {
  all: ["audit-logs"] as const,
  lists: () => [...auditLogQueryKeys.all, "list"] as const,
  list: (input: Omit<ListAuditLogsInput, "cursor" | "take">) =>
    [...auditLogQueryKeys.lists(), input] as const,
};

async function listAuditLogPage(
  input: Omit<ListAuditLogsInput, "take">,
): Promise<AuditLogPage> {
  const logs = await listAuditLogs({
    ...input,
    take: auditLogPageSize + 1,
  });
  const items = logs.slice(0, auditLogPageSize);

  return {
    items,
    nextCursor:
      logs.length > auditLogPageSize ? items.at(-1)?.id : undefined,
  };
}

export function useAuditLogsQuery(
  input: Omit<ListAuditLogsInput, "cursor" | "take">,
) {
  return useInfiniteQuery({
    queryKey: auditLogQueryKeys.list(input),
    queryFn: ({ pageParam }) =>
      listAuditLogPage({
        ...input,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
