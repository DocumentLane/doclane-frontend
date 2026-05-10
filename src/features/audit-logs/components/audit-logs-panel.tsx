import { useMemo, useState } from "react";
import { EyeIcon, RefreshCcwIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogsQuery } from "../queries/audit-logs.queries";
import type {
  AuditAction,
  AuditLogItem,
  AuditResourceType,
  ListAuditLogsInput,
} from "../types/audit-log.types";

const auditActions: AuditAction[] = [
  "AUTH_LOGIN",
  "AUTH_REFRESH",
  "DOCUMENT_CREATE_UPLOAD_SESSION",
  "DOCUMENT_COMPLETE_UPLOAD",
  "DOCUMENT_READ",
  "DOCUMENT_VIEW",
  "DOCUMENT_PREVIEW",
  "DOCUMENT_UPDATE",
  "DOCUMENT_DELETE",
  "DOCUMENT_PUBLIC_ACCESS_UPDATE",
  "DOCUMENT_PERMISSION_GRANT",
  "DOCUMENT_PERMISSION_REVOKE",
  "DOCUMENT_OCR_REPROCESS",
  "DOCUMENT_JOB_RESTART",
  "FOLDER_CREATE",
  "FOLDER_UPDATE",
  "FOLDER_DELETE",
  "FOLDER_PUBLIC_ACCESS_UPDATE",
  "FOLDER_PERMISSION_GRANT",
  "FOLDER_PERMISSION_REVOKE",
  "USER_UPDATE",
  "GROUP_CREATE",
  "GROUP_UPDATE",
  "WORKER_SETTINGS_UPDATE",
];

const auditResourceTypes: AuditResourceType[] = [
  "AUTH",
  "DOCUMENT",
  "FOLDER",
  "USER",
  "GROUP",
  "WORKER_SETTINGS",
];

const actionLabels: Record<AuditAction, string> = {
  AUTH_LOGIN: "Login",
  AUTH_REFRESH: "Refresh token",
  DOCUMENT_CREATE_UPLOAD_SESSION: "Create upload",
  DOCUMENT_COMPLETE_UPLOAD: "Complete upload",
  DOCUMENT_READ: "Read document",
  DOCUMENT_VIEW: "View document",
  DOCUMENT_PREVIEW: "Preview document",
  DOCUMENT_UPDATE: "Update document",
  DOCUMENT_DELETE: "Delete document",
  DOCUMENT_PUBLIC_ACCESS_UPDATE: "Document public access",
  DOCUMENT_PERMISSION_GRANT: "Grant document permission",
  DOCUMENT_PERMISSION_REVOKE: "Revoke document permission",
  DOCUMENT_OCR_REPROCESS: "Reprocess OCR",
  DOCUMENT_JOB_RESTART: "Restart document job",
  FOLDER_CREATE: "Create folder",
  FOLDER_UPDATE: "Update folder",
  FOLDER_DELETE: "Delete folder",
  FOLDER_PUBLIC_ACCESS_UPDATE: "Folder public access",
  FOLDER_PERMISSION_GRANT: "Grant folder permission",
  FOLDER_PERMISSION_REVOKE: "Revoke folder permission",
  USER_UPDATE: "Update user",
  GROUP_CREATE: "Create group",
  GROUP_UPDATE: "Update group",
  WORKER_SETTINGS_UPDATE: "Update worker settings",
};

const resourceLabels: Record<AuditResourceType, string> = {
  AUTH: "Auth",
  DOCUMENT: "Document",
  FOLDER: "Folder",
  USER: "User",
  GROUP: "Group",
  WORKER_SETTINGS: "Worker settings",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatActor(log: AuditLogItem) {
  if (log.actor) {
    return log.actor.displayName ?? log.actor.email ?? log.actor.id;
  }

  return log.actorId ?? "System";
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function toJsonText(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "-";
  }

  return JSON.stringify(value, null, 2);
}

export function AuditLogsPanel() {
  const [action, setAction] = useState<AuditAction | "">("");
  const [resourceType, setResourceType] = useState<AuditResourceType | "">("");
  const [resourceId, setResourceId] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const queryInput = useMemo<Omit<ListAuditLogsInput, "cursor" | "take">>(
    () => ({
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId.trim() ? { resourceId: resourceId.trim() } : {}),
      ...(actorId.trim() ? { actorId: actorId.trim() } : {}),
      ...(from ? { from: toIsoDateTime(from) } : {}),
      ...(to ? { to: toIsoDateTime(to) } : {}),
    }),
    [action, actorId, from, resourceId, resourceType, to],
  );
  const auditLogsQuery = useAuditLogsQuery(queryInput);
  const logs = auditLogsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Audit logs</CardTitle>
              <CardDescription>
                Review administrative and document access activity.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void auditLogsQuery.refetch()}
              disabled={auditLogsQuery.isFetching}
            >
              <RefreshCcwIcon />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditLogFilters
            action={action}
            resourceType={resourceType}
            resourceId={resourceId}
            actorId={actorId}
            from={from}
            to={to}
            onActionChange={setAction}
            onResourceTypeChange={setResourceType}
            onResourceIdChange={setResourceId}
            onActorIdChange={setActorId}
            onFromChange={setFrom}
            onToChange={setTo}
          />

          {auditLogsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading audit logs.
            </p>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-36">Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="w-20 text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate font-medium">{formatActor(log)}</p>
                        {log.actor?.email ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {log.actor.email}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{actionLabels[log.action]}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {resourceLabels[log.resourceType]}
                        </p>
                        <p className="max-w-48 truncate text-xs text-muted-foreground">
                          {log.resourceId ?? "-"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-md whitespace-normal">
                        {log.summary ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.ipAddress ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View audit log ${log.id}`}
                          onClick={() => setSelectedLog(log)}
                        >
                          <EyeIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audit logs match the current filters.
            </p>
          )}

          {auditLogsQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void auditLogsQuery.fetchNextPage()}
                disabled={auditLogsQuery.isFetchingNextPage}
              >
                <SearchIcon />
                {auditLogsQuery.isFetchingNextPage ? "Loading" : "Load more"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AuditLogDetailsDialog
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
      />
    </>
  );
}

function AuditLogFilters({
  action,
  resourceType,
  resourceId,
  actorId,
  from,
  to,
  onActionChange,
  onResourceTypeChange,
  onResourceIdChange,
  onActorIdChange,
  onFromChange,
  onToChange,
}: {
  action: AuditAction | "";
  resourceType: AuditResourceType | "";
  resourceId: string;
  actorId: string;
  from: string;
  to: string;
  onActionChange: (value: AuditAction | "") => void;
  onResourceTypeChange: (value: AuditResourceType | "") => void;
  onResourceIdChange: (value: string) => void;
  onActorIdChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-3 xl:grid-cols-6">
      <div className="grid gap-1.5">
        <Label htmlFor="audit-action">Action</Label>
        <select
          id="audit-action"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={action}
          onChange={(event) => onActionChange(event.target.value as AuditAction | "")}
        >
          <option value="">All actions</option>
          {auditActions.map((item) => (
            <option key={item} value={item}>
              {actionLabels[item]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-resource-type">Resource</Label>
        <select
          id="audit-resource-type"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={resourceType}
          onChange={(event) =>
            onResourceTypeChange(event.target.value as AuditResourceType | "")
          }
        >
          <option value="">All resources</option>
          {auditResourceTypes.map((item) => (
            <option key={item} value={item}>
              {resourceLabels[item]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-resource-id">Resource ID</Label>
        <Input
          id="audit-resource-id"
          value={resourceId}
          onChange={(event) => onResourceIdChange(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-actor-id">Actor ID</Label>
        <Input
          id="audit-actor-id"
          value={actorId}
          onChange={(event) => onActorIdChange(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-from">From</Label>
        <Input
          id="audit-from"
          type="datetime-local"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-to">To</Label>
        <Input
          id="audit-to"
          type="datetime-local"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function AuditLogDetailsDialog({
  log,
  onOpenChange,
}: {
  log: AuditLogItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(log)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        {log ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{actionLabels[log.action]}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <DetailItem label="Time" value={formatDateTime(log.createdAt)} />
              <DetailItem label="Actor" value={formatActor(log)} />
              <DetailItem label="Resource" value={resourceLabels[log.resourceType]} />
              <DetailItem label="Resource ID" value={log.resourceId ?? "-"} />
              <DetailItem label="IP address" value={log.ipAddress ?? "-"} />
              <DetailItem label="User agent" value={log.userAgent ?? "-"} />
            </div>
            {log.summary ? (
              <div className="rounded-md border p-3 text-sm">{log.summary}</div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <JsonBlock label="Before" value={log.before} />
              <JsonBlock label="After" value={log.after} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-sm font-medium">{label}</p>
      <pre className="max-h-80 overflow-auto rounded-md border bg-muted p-3 text-xs">
        {toJsonText(value)}
      </pre>
    </div>
  );
}
