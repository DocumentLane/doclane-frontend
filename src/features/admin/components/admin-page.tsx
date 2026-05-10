import { useState } from "react";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { useMeQuery } from "@/features/auth/queries/auth.queries";
import type { UserRole } from "@/features/auth/types/auth.types";
import {
  useCreateGroupMutation,
  useGroupsQuery,
  useUpdateGroupMutation,
} from "@/features/groups/queries/groups.queries";
import type { GroupItem } from "@/features/groups/types/group.types";
import {
  useUpdateUserMutation,
  useUsersQuery,
} from "@/features/users/queries/users.queries";
import type { UserItem } from "@/features/users/types/user.types";

type AdminTab = "users" | "groups";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getGroupLabel(group: Pick<GroupItem, "externalId" | "displayName">) {
  return group.displayName || group.externalId;
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const meQuery = useMeQuery();
  const isAdmin = meQuery.data?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <main className="flex w-full flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>
              Only ADMIN users can manage users and groups.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage OIDC-backed users, application roles, and group metadata.
        </p>
      </div>

      <div className="flex w-fit rounded-lg border bg-background p-1">
        <Button
          type="button"
          variant={activeTab === "users" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("users")}
        >
          <UsersIcon />
          Users
        </Button>
        <Button
          type="button"
          variant={activeTab === "groups" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("groups")}
        >
          <ShieldIcon />
          Groups
        </Button>
      </div>

      {activeTab === "users" ? <UsersAdminPanel /> : <GroupsAdminPanel />}
    </main>
  );
}

function UsersAdminPanel() {
  const usersQuery = useUsersQuery();
  const groupsQuery = useGroupsQuery();
  const updateUserMutation = useUpdateUserMutation();
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Change app roles and replace a user&apos;s full group membership set.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="w-28">Role</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead className="w-40">Last authorized</TableHead>
              <TableHead className="w-20 text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(usersQuery.data ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {user.displayName ?? user.email ?? user.id}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email ?? "No email"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap gap-1">
                    {(user.groupMemberships ?? []).length > 0 ? (
                      user.groupMemberships?.map((membership) => (
                        <Badge key={membership.id} variant="outline">
                          {getGroupLabel(membership.group)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(user.authorizedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${user.displayName ?? user.email ?? user.id}`}
                    onClick={() => setEditingUser(user)}
                  >
                    <PencilIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {usersQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading users.
          </p>
        ) : null}
      </CardContent>
      <EditUserDialog
        user={editingUser}
        groups={groupsQuery.data ?? []}
        isSaving={updateUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
          }
        }}
        onSubmit={(input) => {
          updateUserMutation.mutate(input, {
            onSuccess: () => {
              setEditingUser(null);
              toast.success("User updated");
            },
            onError: (error) => {
              toast.error("User update failed", {
                description: getErrorMessage(error),
              });
            },
          });
        }}
      />
    </Card>
  );
}

function EditUserDialog({
  user,
  groups,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  user: UserItem | null;
  groups: GroupItem[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { userId: string; role: UserRole; groupIds: string[] }) => void;
}) {
  const [role, setRole] = useState<UserRole>("USER");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const open = Boolean(user);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && user) {
          setRole(user.role);
          setSelectedGroupIds(
            new Set((user.groupMemberships ?? []).map((item) => item.groupId)),
          );
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        {user ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({
                userId: user.id,
                role,
                groupIds: [...selectedGroupIds],
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={role}
                disabled={isSaving}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border p-2">
                {groups.length > 0 ? (
                  groups.map((group) => {
                    const checked = selectedGroupIds.has(group.id);

                    return (
                      <Label
                        key={group.id}
                        htmlFor={`user-group-${group.id}`}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted"
                      >
                        <input
                          id={`user-group-${group.id}`}
                          type="checkbox"
                          className="mt-0.5 size-4 accent-primary"
                          checked={checked}
                          disabled={isSaving}
                          onChange={(event) =>
                            setSelectedGroupIds((current) => {
                              const next = new Set(current);
                              if (event.target.checked) {
                                next.add(group.id);
                              } else {
                                next.delete(group.id);
                              }
                              return next;
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {getGroupLabel(group)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {group.externalId}
                          </span>
                        </span>
                      </Label>
                    );
                  })
                ) : (
                  <p className="p-2 text-sm text-muted-foreground">
                    No groups have been created.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                <SaveIcon />
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GroupsAdminPanel() {
  const groupsQuery = useGroupsQuery();
  const createGroupMutation = useCreateGroupMutation();
  const updateGroupMutation = useUpdateGroupMutation();
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <CreateGroupCard
        isSaving={createGroupMutation.isPending}
        onSubmit={(input, reset) => {
          createGroupMutation.mutate(input, {
            onSuccess: () => {
              reset();
              toast.success("Group created");
            },
            onError: (error) => {
              toast.error("Group create failed", {
                description: getErrorMessage(error),
              });
            },
          });
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>
            Display names and descriptions are local metadata for OIDC groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-36">Issuer</TableHead>
                <TableHead className="w-20 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(groupsQuery.data ?? []).map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <p className="font-medium">{getGroupLabel(group)}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.externalId}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    {group.description || (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="truncate">{group.issuer}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${getGroupLabel(group)}`}
                      onClick={() => setEditingGroup(group)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditGroupDialog
        group={editingGroup}
        isSaving={updateGroupMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGroup(null);
          }
        }}
        onSubmit={(input) => {
          updateGroupMutation.mutate(input, {
            onSuccess: () => {
              setEditingGroup(null);
              toast.success("Group updated");
            },
            onError: (error) => {
              toast.error("Group update failed", {
                description: getErrorMessage(error),
              });
            },
          });
        }}
      />
    </div>
  );
}

function CreateGroupCard({
  isSaving,
  onSubmit,
}: {
  isSaving: boolean;
  onSubmit: (
    input: { externalId: string; displayName?: string; description?: string },
    reset: () => void,
  ) => void;
}) {
  const [externalId, setExternalId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const canSubmit = externalId.trim().length > 0;
  const reset = () => {
    setExternalId("");
    setDisplayName("");
    setDescription("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Group</CardTitle>
        <CardDescription>
          Add a group that can be assigned before a user logs in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) {
              return;
            }
            onSubmit(
              {
                externalId: externalId.trim(),
                displayName: displayName.trim() || undefined,
                description: description.trim() || undefined,
              },
              reset,
            );
          }}
        >
          <TextField
            id="group-external-id"
            label="OIDC Group ID"
            value={externalId}
            disabled={isSaving}
            onChange={setExternalId}
          />
          <TextField
            id="group-display-name"
            label="Display name"
            value={displayName}
            disabled={isSaving}
            onChange={setDisplayName}
          />
          <TextField
            id="group-description"
            label="Description"
            value={description}
            disabled={isSaving}
            onChange={setDescription}
          />
          <Button type="submit" disabled={!canSubmit || isSaving}>
            <PlusIcon />
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditGroupDialog({
  group,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  group: GroupItem | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    groupId: string;
    displayName: string | null;
    description: string | null;
  }) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const open = Boolean(group);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && group) {
          setDisplayName(group.displayName ?? "");
          setDescription(group.description ?? "");
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        {group ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({
                groupId: group.id,
                displayName: displayName.trim() || null,
                description: description.trim() || null,
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit group</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{group.externalId}</p>
              <p className="text-xs text-muted-foreground">{group.issuer}</p>
            </div>
            <TextField
              id="edit-group-display-name"
              label="Display name"
              value={displayName}
              disabled={isSaving}
              onChange={setDisplayName}
            />
            <TextField
              id="edit-group-description"
              label="Description"
              value={description}
              disabled={isSaving}
              onChange={setDescription}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                <CheckIcon />
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
