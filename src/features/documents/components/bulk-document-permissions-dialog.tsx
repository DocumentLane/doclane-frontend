import { FormEvent, useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type {
  DocumentPermissions,
  ResourcePermissionItem,
} from "@/features/folders/types/folder.types";
import { useGroupsQuery } from "@/features/groups/queries/groups.queries";
import { useUsersQuery } from "@/features/users/queries/users.queries";
import {
  useBulkDocumentPermissionsQuery,
  useBulkRemoveDocumentPermissionMutation,
  useBulkSaveDocumentPermissionMutation,
} from "../queries/documents.queries";
import type { DocumentItem } from "../types/document.types";

type PrincipalType = "users" | "groups";

interface BulkPermissionSummaryRow {
  permission: ResourcePermissionItem;
  targetType: PrincipalType;
  targetId: string;
  documentIds: string[];
}

function getPermissionLabel(permission: ResourcePermissionItem) {
  if (permission.user) {
    return permission.user.displayName ?? permission.user.email ?? permission.user.id;
  }

  if (permission.group) {
    return permission.group.displayName ?? permission.group.externalId;
  }

  return permission.userId ?? permission.groupId ?? permission.id;
}

function getPermissionType(permission: ResourcePermissionItem) {
  return permission.userId ? "Person" : "Group";
}

function summarizeDirectPermissions(
  permissionsByDocument:
    | {
        documentId: string;
        permissions: DocumentPermissions;
      }[]
    | undefined,
) {
  if (!permissionsByDocument) {
    return [] as BulkPermissionSummaryRow[];
  }

  const rows = new Map<string, BulkPermissionSummaryRow>();

  permissionsByDocument.forEach(({ documentId, permissions }) => {
    permissions.direct.forEach((permission) => {
      const targetType = permission.userId ? "users" : "groups";
      const targetId = permission.userId ?? permission.groupId;

      if (!targetId) {
        return;
      }

      const key = `${targetType}:${targetId}`;
      const currentRow = rows.get(key);

      if (currentRow) {
        currentRow.documentIds.push(documentId);
        return;
      }

      rows.set(key, {
        permission,
        targetType,
        targetId,
        documentIds: [documentId],
      });
    });
  });

  return [...rows.values()].sort((left, right) =>
    getPermissionLabel(left.permission).localeCompare(getPermissionLabel(right.permission)),
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

export function BulkDocumentPermissionsDialog({
  open,
  documents,
  onOpenChange,
}: {
  open: boolean;
  documents: DocumentItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const [principalType, setPrincipalType] = useState<PrincipalType>("users");
  const [targetId, setTargetId] = useState("");
  const usersQuery = useUsersQuery(open);
  const groupsQuery = useGroupsQuery(open);
  const bulkSavePermissionMutation = useBulkSaveDocumentPermissionMutation();
  const bulkRemovePermissionMutation = useBulkRemoveDocumentPermissionMutation();
  const documentIds = useMemo(() => documents.map((document) => document.id), [documents]);
  const permissionsQuery = useBulkDocumentPermissionsQuery(documentIds, open);
  const summaryRows = useMemo(
    () => summarizeDirectPermissions(permissionsQuery.data),
    [permissionsQuery.data],
  );
  const principals =
    principalType === "users" ? usersQuery.data ?? [] : groupsQuery.data ?? [];
  const canSelectKnownPrincipals = principals.length > 0;
  const isBusy =
    permissionsQuery.isLoading ||
    bulkSavePermissionMutation.isPending ||
    bulkRemovePermissionMutation.isPending;
  const areActionsDisabled =
    isBusy || permissionsQuery.isError || documentIds.length === 0;

  const handleAllowAccess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetId) {
      toast.error("Choose a person or group");
      return;
    }

    if (documentIds.length === 0) {
      toast.error("Select at least one document");
      return;
    }

    bulkSavePermissionMutation.mutate(
      {
        documentIds,
        targetType: principalType,
        targetId,
        permission: "READ",
      },
      {
        onSuccess: () => {
          setTargetId("");
          toast.success(
            `Access updated for ${documentIds.length} document${
              documentIds.length === 1 ? "" : "s"
            }`,
          );
        },
        onError: (error) => {
          toast.error("Bulk access update failed", {
            description: getErrorMessage(error),
          });
        },
      },
    );
  };

  const handleRemoveAccess = () => {
    if (!targetId) {
      toast.error("Choose a person or group");
      return;
    }

    const targetDocuments = summaryRows.find(
      (row) => row.targetType === principalType && row.targetId === targetId,
    )?.documentIds;

    if (!targetDocuments || targetDocuments.length === 0) {
      toast.error("That access is not set on the selected documents");
      return;
    }

    bulkRemovePermissionMutation.mutate(
      {
        documentIds: targetDocuments,
        targetType: principalType,
        targetId,
      },
      {
        onSuccess: () => {
          setTargetId("");
          toast.success(
            `Access removed from ${targetDocuments.length} document${
              targetDocuments.length === 1 ? "" : "s"
            }`,
          );
        },
        onError: (error) => {
          toast.error("Bulk access removal failed", {
            description: getErrorMessage(error),
          });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPrincipalType("users");
          setTargetId("");
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Document access</DialogTitle>
          <DialogDescription>
            Add or remove direct view access for {documents.length} selected
            document{documents.length === 1 ? "" : "s"}. Folder-inherited access
            stays unchanged.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3 rounded-md border p-3" onSubmit={handleAllowAccess}>
          <div>
            <h3 className="text-sm font-medium">Apply access to all selected documents</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Grant viewing to a person or group across the current multi-selection,
              or remove any direct access they already have.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="bulk-permission-principal-type">Share with</Label>
              <select
                id="bulk-permission-principal-type"
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={principalType}
                disabled={areActionsDisabled}
                onChange={(event) => {
                  setPrincipalType(event.target.value as PrincipalType);
                  setTargetId("");
                }}
              >
                <option value="users">Person</option>
                <option value="groups">Group</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-permission-principal-id">Name</Label>
              {canSelectKnownPrincipals ? (
                <select
                  id="bulk-permission-principal-id"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={targetId}
                  disabled={areActionsDisabled}
                  onChange={(event) => setTargetId(event.target.value)}
                >
                  <option value="">Choose one</option>
                  {principals.map((principal) => (
                    <option key={principal.id} value={principal.id}>
                      {"email" in principal
                        ? principal.displayName ?? principal.email ?? principal.id
                        : principal.displayName ?? principal.externalId}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="bulk-permission-principal-id"
                  value={targetId}
                  disabled={areActionsDisabled}
                  placeholder={`Paste ${principalType === "users" ? "person" : "group"} ID`}
                  onChange={(event) => setTargetId(event.target.value)}
                />
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={areActionsDisabled || !targetId}
                onClick={handleRemoveAccess}
              >
                <Trash2Icon />
                Remove access
              </Button>
              <Button type="submit" disabled={areActionsDisabled || !targetId}>
                <PlusIcon />
                Allow viewing
              </Button>
            </div>
          </div>
        </form>

        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-medium">Direct access across the selection</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Only direct document access is listed here. Access inherited from
              folders can still differ between selected documents.
            </p>
          </div>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person or group</TableHead>
                  <TableHead className="w-28">Kind</TableHead>
                  <TableHead className="w-28">Access</TableHead>
                  <TableHead className="w-44">Applied to</TableHead>
                  <TableHead className="w-20 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.length > 0 ? (
                  summaryRows.map((row) => (
                    <TableRow key={`${row.targetType}-${row.targetId}`}>
                      <TableCell className="min-w-64 whitespace-normal">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {getPermissionLabel(row.permission)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.targetId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPermissionType(row.permission)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Can view</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.documentIds.length === documents.length
                            ? "All selected"
                            : `${row.documentIds.length} of ${documents.length} docs`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Remove ${getPermissionLabel(row.permission)}`}
                          disabled={isBusy}
                          onClick={() => {
                            bulkRemovePermissionMutation.mutate(
                              {
                                documentIds: row.documentIds,
                                targetType: row.targetType,
                                targetId: row.targetId,
                              },
                              {
                                onSuccess: () => {
                                  toast.success(
                                    `Access removed from ${row.documentIds.length} document${
                                      row.documentIds.length === 1 ? "" : "s"
                                    }`,
                                  );
                                },
                                onError: (error) => {
                                  toast.error("Bulk access removal failed", {
                                    description: getErrorMessage(error),
                                  });
                                },
                              },
                            );
                          }}
                        >
                          <Trash2Icon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {permissionsQuery.isLoading
                        ? "Loading access."
                        : permissionsQuery.isError
                          ? getErrorMessage(permissionsQuery.error)
                          : "No direct access has been added to these documents yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
