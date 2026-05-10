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
import { useGroupsQuery } from "@/features/groups/queries/groups.queries";
import { useUsersQuery } from "@/features/users/queries/users.queries";
import type {
  DocumentPermissions,
  ResourcePermissionItem,
} from "@/features/folders/types/folder.types";

type PrincipalType = "users" | "groups";

interface ResourcePermissionsDialogProps {
  open: boolean;
  title: string;
  description: string;
  permissions: ResourcePermissionItem[] | DocumentPermissions | undefined;
  isLoading: boolean;
  isSaving: boolean;
  isRemoving: boolean;
  showInherited?: boolean;
  directSourceLabel?: "This document" | "This folder";
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    targetType: PrincipalType;
    targetId: string;
    permission: "READ";
  }) => void;
  onRemove: (input: { targetType: PrincipalType; targetId: string }) => void;
}

interface PermissionMatrixRow {
  permission: ResourcePermissionItem;
  source: "This document" | "This folder" | "From folder";
  canRemove: boolean;
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

function flattenPermissions(
  permissions: ResourcePermissionItem[] | DocumentPermissions | undefined,
) {
  if (!permissions) {
    return {
      direct: [] as ResourcePermissionItem[],
      inherited: [] as ResourcePermissionItem[],
    };
  }

  if (Array.isArray(permissions)) {
    return { direct: permissions, inherited: [] as ResourcePermissionItem[] };
  }

  return {
    direct: permissions.direct,
    inherited: permissions.inheritedFromFolder,
  };
}

function getSourceBadgeVariant(source: PermissionMatrixRow["source"]) {
  return source === "From folder" ? "outline" : "secondary";
}

export function ResourcePermissionsDialog({
  open,
  title,
  description,
  permissions,
  isLoading,
  isSaving,
  isRemoving,
  showInherited = false,
  directSourceLabel,
  onOpenChange,
  onSave,
  onRemove,
}: ResourcePermissionsDialogProps) {
  const usersQuery = useUsersQuery(open);
  const groupsQuery = useGroupsQuery(open);
  const [principalType, setPrincipalType] = useState<PrincipalType>("users");
  const [targetId, setTargetId] = useState("");
  const { direct, inherited } = useMemo(
    () => flattenPermissions(permissions),
    [permissions],
  );
  const sourceForDirectPermissions =
    directSourceLabel ?? (showInherited ? "This document" : "This folder");
  const matrixRows = useMemo<PermissionMatrixRow[]>(
    () => [
      ...direct.map((permission) => ({
        permission,
        source: sourceForDirectPermissions,
        canRemove: true,
      })),
      ...inherited.map((permission) => ({
        permission,
        source: "From folder" as const,
        canRemove: false,
      })),
    ],
    [direct, inherited, sourceForDirectPermissions],
  );
  const principals =
    principalType === "users" ? usersQuery.data ?? [] : groupsQuery.data ?? [];
  const canSelectKnownPrincipals = principals.length > 0;
  const isBusy = isSaving || isRemoving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetId) {
      toast.error("Choose a person or group");
      return;
    }

    onSave({
      targetType: principalType,
      targetId,
      permission: "READ",
    });
    setTargetId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-3 rounded-md border p-3" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-sm font-medium">Add view access</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              People with view access can open this item. They cannot edit,
              delete, make it public, or change access settings.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="permission-principal-type">Share with</Label>
              <select
                id="permission-principal-type"
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={principalType}
                disabled={isBusy}
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
              <Label htmlFor="permission-principal-id">Name</Label>
              {canSelectKnownPrincipals ? (
                <select
                  id="permission-principal-id"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={targetId}
                  disabled={isBusy}
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
                  id="permission-principal-id"
                  value={targetId}
                  disabled={isBusy}
                  placeholder={`Paste ${principalType === "users" ? "person" : "group"} ID`}
                  onChange={(event) => setTargetId(event.target.value)}
                />
              )}
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isBusy || !targetId}>
                <PlusIcon />
                Allow viewing
              </Button>
            </div>
          </div>
        </form>

        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-medium">Who can view</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Access set on this item and access coming from its folder are
              shown separately.
            </p>
          </div>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person or group</TableHead>
                  <TableHead className="w-28">Kind</TableHead>
                  <TableHead className="w-28">Access</TableHead>
                  <TableHead className="w-44">Where it applies</TableHead>
                  <TableHead className="w-20 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixRows.length > 0 ? (
                  matrixRows.map((row) => (
                    <PermissionMatrixTableRow
                      key={`${row.source}-${row.permission.id}`}
                      row={row}
                      isRemoving={isRemoving}
                      onRemove={onRemove}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {isLoading ? "Loading access." : "No one has been added yet."}
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

function PermissionMatrixTableRow({
  row,
  isRemoving,
  onRemove,
}: {
  row: PermissionMatrixRow;
  isRemoving: boolean;
  onRemove: (input: { targetType: PrincipalType; targetId: string }) => void;
}) {
  const targetType = row.permission.userId ? "users" : "groups";
  const targetId = row.permission.userId ?? row.permission.groupId;

  return (
    <TableRow>
      <TableCell className="min-w-64 whitespace-normal">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {getPermissionLabel(row.permission)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {targetId ?? row.permission.id}
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
        <Badge variant={getSourceBadgeVariant(row.source)}>{row.source}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {row.canRemove && targetId ? (
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label={`Remove ${getPermissionLabel(row.permission)}`}
            disabled={isRemoving}
            onClick={() => onRemove({ targetType, targetId })}
          >
            <Trash2Icon />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">From folder</span>
        )}
      </TableCell>
    </TableRow>
  );
}
