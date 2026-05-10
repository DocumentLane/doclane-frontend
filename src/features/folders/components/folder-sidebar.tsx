import { FormEvent, useState } from "react";
import {
  FolderIcon,
  Globe2Icon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ResourcePermissionsDialog } from "@/features/permissions/components/resource-permissions-dialog";
import {
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useFolderPermissionsQuery,
  useFoldersQuery,
  useRemoveFolderPermissionMutation,
  useSaveFolderPermissionMutation,
  useUpdateFolderMutation,
  useUpdateFolderPublicAccessMutation,
} from "../queries/folders.queries";
import type { FolderItem } from "../types/folder.types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

export function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
}: {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}) {
  const foldersQuery = useFoldersQuery();
  const createFolderMutation = useCreateFolderMutation();
  const updateFolderMutation = useUpdateFolderMutation();
  const updatePublicAccessMutation = useUpdateFolderPublicAccessMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [sharingFolder, setSharingFolder] = useState<FolderItem | null>(null);
  const selectedFolder = foldersQuery.data?.find(
    (folder) => folder.id === selectedFolderId,
  );

  return (
    <aside className="space-y-4 lg:w-72 lg:shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Folders</h2>
          <p className="text-xs text-muted-foreground">
            Filter documents and manage folder access.
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Create folder"
          onClick={() => setIsCreateOpen(true)}
        >
          <PlusIcon />
        </Button>
      </div>

      <div className="grid gap-1">
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted",
            selectedFolderId === null && "bg-muted font-medium",
          )}
          onClick={() => onSelectFolder(null)}
        >
          <span>Library</span>
        </button>
        {(foldersQuery.data ?? []).map((folder) => (
          <div
            key={folder.id}
            className={cn(
              "group flex items-center gap-1 rounded-md transition hover:bg-muted",
              selectedFolderId === folder.id && "bg-muted",
            )}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => onSelectFolder(folder.id)}
            >
              <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{folder.name}</span>
              {folder.isPublic ? <Badge variant="outline">Public</Badge> : null}
            </button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Open access settings for ${folder.name}`}
              onClick={() => setSharingFolder(folder)}
            >
              <ShieldCheckIcon />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Rename ${folder.name}`}
              onClick={() => setEditingFolder(folder)}
            >
              <PencilIcon />
            </Button>
          </div>
        ))}
      </div>

      {selectedFolder ? (
        <div className="grid gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Folder public access</span>
            <Button
              size="sm"
              variant="outline"
              disabled={updatePublicAccessMutation.isPending}
              onClick={() => {
                updatePublicAccessMutation.mutate(
                  {
                    folderId: selectedFolder.id,
                    isPublic: !selectedFolder.isPublic,
                  },
                  {
                    onSuccess: (folder) => {
                      toast.success(
                        folder.isPublic
                          ? "Folder public access enabled"
                          : "Folder public access disabled",
                      );
                    },
                    onError: (error) => {
                      toast.error("Folder public access failed", {
                        description: getErrorMessage(error),
                      });
                    },
                  },
                );
              }}
            >
              {selectedFolder.isPublic ? <LockIcon /> : <Globe2Icon />}
              {selectedFolder.isPublic ? "Private" : "Public"}
            </Button>
          </div>
          <Button
            variant="destructive"
            disabled={deleteFolderMutation.isPending}
            onClick={() => {
              const confirmed = window.confirm(`Delete "${selectedFolder.name}"?`);
              if (!confirmed) {
                return;
              }
              deleteFolderMutation.mutate(selectedFolder.id, {
                onSuccess: () => {
                  onSelectFolder(null);
                  toast.success("Folder deleted");
                },
                onError: (error) => {
                  toast.error("Folder delete failed", {
                    description: getErrorMessage(error),
                  });
                },
              });
            }}
          >
            <Trash2Icon />
            Delete folder
          </Button>
        </div>
      ) : null}

      <FolderNameDialog
        title="Create folder"
        open={isCreateOpen}
        isSaving={createFolderMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={(name) => {
          createFolderMutation.mutate(
            { name },
            {
              onSuccess: (folder) => {
                setIsCreateOpen(false);
                onSelectFolder(folder.id);
                toast.success("Folder created");
              },
              onError: (error) => {
                toast.error("Folder create failed", {
                  description: getErrorMessage(error),
                });
              },
            },
          );
        }}
      />
      <FolderNameDialog
        key={editingFolder?.id ?? "none"}
        title="Rename folder"
        open={Boolean(editingFolder)}
        initialName={editingFolder?.name}
        isSaving={updateFolderMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingFolder(null);
          }
        }}
        onSubmit={(name) => {
          if (!editingFolder) {
            return;
          }
          updateFolderMutation.mutate(
            { folderId: editingFolder.id, name },
            {
              onSuccess: () => {
                setEditingFolder(null);
                toast.success("Folder renamed");
              },
              onError: (error) => {
                toast.error("Folder rename failed", {
                  description: getErrorMessage(error),
                });
              },
            },
          );
        }}
      />
      <FolderShareDialog
        folder={sharingFolder}
        onOpenChange={(open) => {
          if (!open) {
            setSharingFolder(null);
          }
        }}
      />
    </aside>
  );
}

export function FolderNameDialog({
  title,
  open,
  initialName = "",
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialName?: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setName(initialName);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!trimmedName) {
              toast.error("Folder name is required");
              return;
            }
            onSubmit(trimmedName);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving || !trimmedName}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FolderShareDialog({
  folder,
  onOpenChange,
}: {
  folder: FolderItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const permissionsQuery = useFolderPermissionsQuery(folder?.id ?? null);
  const savePermissionMutation = useSaveFolderPermissionMutation();
  const removePermissionMutation = useRemoveFolderPermissionMutation();

  return (
    <ResourcePermissionsDialog
      open={Boolean(folder)}
      title={folder ? `Folder access: ${folder.name}` : "Folder access"}
      description="People and groups with view access can open documents inside this folder."
      permissions={permissionsQuery.data}
      isLoading={permissionsQuery.isLoading}
      isSaving={savePermissionMutation.isPending}
      isRemoving={removePermissionMutation.isPending}
      onOpenChange={onOpenChange}
      onSave={(input) => {
        if (!folder) {
          return;
        }
        savePermissionMutation.mutate(
          {
            resourceId: folder.id,
            targetType: input.targetType,
            targetId: input.targetId,
            permission: input.permission,
          },
          {
            onSuccess: () => toast.success("Folder access updated"),
            onError: (error) => {
              toast.error("Folder access update failed", {
                description: getErrorMessage(error),
              });
            },
          },
        );
      }}
      onRemove={(input) => {
        if (!folder) {
          return;
        }
        removePermissionMutation.mutate(
          {
            resourceId: folder.id,
            targetType: input.targetType,
            targetId: input.targetId,
          },
          {
            onSuccess: () => toast.success("Folder access removed"),
            onError: (error) => {
              toast.error("Folder access removal failed", {
                description: getErrorMessage(error),
              });
            },
          },
        );
      }}
    />
  );
}
