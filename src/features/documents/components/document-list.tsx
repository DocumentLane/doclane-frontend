import Link from "next/link";
import axios from "axios";
import {
  ChevronRightIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  Grid2X2Icon,
  Globe2Icon,
  ImageIcon,
  LinkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  Table2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ResourcePermissionsDialog } from "@/features/permissions/components/resource-permissions-dialog";
import {
  FolderNameDialog,
  FolderShareDialog,
} from "@/features/folders/components/folder-sidebar";
import {
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useFoldersQuery,
  useUpdateFolderMutation,
  useUpdateFolderPublicAccessMutation,
} from "@/features/folders/queries/folders.queries";
import type { FolderItem } from "@/features/folders/types/folder.types";
import {
  useDeleteDocumentMutation,
  useDownloadDocumentPdfMutation,
  useDocumentPermissionsQuery,
  useDocumentPreviewQuery,
  useDocumentsQuery,
  useRemoveDocumentPermissionMutation,
  useReprocessDocumentOcrMutation,
  useSaveDocumentPermissionMutation,
  useUpdateDocumentFolderMutation,
  useUpdateDocumentTitleMutation,
  useUpdateDocumentPublicAccessMutation,
  useUploadDocumentThumbnailMutation,
} from "../queries/documents.queries";
import { getPdfDownloadFileName, saveBlobAsFile } from "../lib/pdf-download";
import type { DocumentItem } from "../types/document.types";

type DocumentListViewMode = "grid" | "table";
type DocumentListScope = "library" | "all";

const supportedThumbnailContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function DocumentList({
  folderId = null,
  scope,
  canCreateFolder,
  onSelectFolder,
}: {
  folderId?: string | null;
  scope: DocumentListScope;
  canCreateFolder: boolean;
  onSelectFolder: (folderId: string | null) => void;
}) {
  const [viewMode, setViewMode] = useState<DocumentListViewMode>("grid");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const foldersQuery = useFoldersQuery();
  const createFolderMutation = useCreateFolderMutation();
  const documentFolderFilter =
    scope === "all" && !folderId ? undefined : folderId;
  const documentsQuery = useDocumentsQuery(documentFolderFilter);
  const selectedFolder = foldersQuery.data?.find((folder) => folder.id === folderId);
  const folders = folderId || scope === "all" ? [] : foldersQuery.data ?? [];
  const folderNameById = useMemo(
    () =>
      new Map(
        (foldersQuery.data ?? []).map((folder) => [folder.id, folder.name]),
      ),
    [foldersQuery.data],
  );
  const readyDocuments = useMemo(
    () => documentsQuery.data?.filter((document) => document.status === "READY") ?? [],
    [documentsQuery.data],
  );
  const hasItems = folders.length > 0 || readyDocuments.length > 0;
  const showDocumentLocation = scope === "all" && !folderId;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FolderBreadcrumb
          selectedFolder={selectedFolder}
          scope={scope}
          onSelectFolder={onSelectFolder}
        />
        <div className="flex items-center gap-1">
          {!folderId && scope === "library" && canCreateFolder ? (
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(true)}
            >
              <PlusIcon />
              New folder
            </Button>
          ) : null}
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Grid view"
            onClick={() => setViewMode("grid")}
          >
            <Grid2X2Icon />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Table view"
            onClick={() => setViewMode("table")}
          >
            <Table2Icon />
          </Button>
        </div>
      </div>

      {documentsQuery.isLoading || foldersQuery.isLoading ? (
        <DocumentListSkeleton viewMode={viewMode} />
      ) : hasItems ? (
        viewMode === "grid" ? (
          <DocumentGrid
            folders={folders}
            documents={readyDocuments}
            getFolderName={(document) => getDocumentFolderName(document, folderNameById)}
            showLocation={showDocumentLocation}
            onSelectFolder={onSelectFolder}
          />
        ) : (
          <DocumentTable
            folders={folders}
            documents={readyDocuments}
            getFolderName={(document) => getDocumentFolderName(document, folderNameById)}
            showLocation={showDocumentLocation}
            onSelectFolder={onSelectFolder}
          />
        )
      ) : (
        <DocumentEmptyState isInsideFolder={Boolean(folderId)} scope={scope} />
      )}
      <FolderNameDialog
        title="Create folder"
        open={isCreateFolderOpen}
        isSaving={createFolderMutation.isPending}
        onOpenChange={setIsCreateFolderOpen}
        onSubmit={(name) => {
          createFolderMutation.mutate(
            { name },
            {
              onSuccess: (folder) => {
                setIsCreateFolderOpen(false);
                onSelectFolder(folder.id);
                toast.success("Folder created");
              },
              onError: (error) => {
                toast.error("Folder create failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
      />
    </section>
  );
}

function FolderBreadcrumb({
  selectedFolder,
  scope,
  onSelectFolder,
}: {
  selectedFolder?: FolderItem;
  scope: DocumentListScope;
  onSelectFolder: (folderId: string | null) => void;
}) {
  const rootLabel = scope === "all" && !selectedFolder ? "All documents" : "Library";

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="Folder path">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-1.5"
        onClick={() => {
          if (scope === "all" && !selectedFolder) {
            return;
          }

          onSelectFolder(null);
        }}
      >
        {rootLabel}
      </Button>
      {selectedFolder ? (
        <>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-medium">
            {selectedFolder.name}
          </span>
          <FolderActionsMenu
            folder={selectedFolder}
            onDeleted={() => onSelectFolder(null)}
          />
        </>
      ) : null}
    </nav>
  );
}

function DocumentListSkeleton({ viewMode }: { viewMode: DocumentListViewMode }) {
  if (viewMode === "table") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="aspect-[3/4] w-full sm:w-48 sm:flex-none" />
      ))}
    </div>
  );
}

function DocumentEmptyState({
  isInsideFolder,
  scope,
}: {
  isInsideFolder: boolean;
  scope: DocumentListScope;
}) {
  const isAllDocuments = scope === "all" && !isInsideFolder;

  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        {isInsideFolder ? (
          <FolderOpenIcon className="size-5 text-muted-foreground" />
        ) : (
          <UploadIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <p className="mt-3 text-sm font-medium">
        {isInsideFolder
          ? "This folder is empty."
          : isAllDocuments
            ? "No documents yet."
            : "No folders or unfiled documents."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isInsideFolder
          ? "Upload PDFs while inside this folder or move documents here."
          : isAllDocuments
            ? "Upload a PDF to add it to your documents."
            : "Create a folder or upload PDFs to start organizing documents."}
      </p>
    </div>
  );
}

function getDocumentFolderName(
  document: DocumentItem,
  folderNameById: Map<string, string>,
) {
  return document.folderId
    ? (folderNameById.get(document.folderId) ?? "Folder")
    : "Unfiled";
}

function DocumentGrid({
  folders,
  documents,
  getFolderName,
  showLocation,
  onSelectFolder,
}: {
  folders: FolderItem[];
  documents: DocumentItem[];
  getFolderName: (document: DocumentItem) => string;
  showLocation: boolean;
  onSelectFolder: (folderId: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
      {folders.map((folder) => (
        <FolderGridCard
          key={folder.id}
          folder={folder}
          onOpen={() => onSelectFolder(folder.id)}
        />
      ))}
      {documents.map((document) => (
        <DocumentGridCard
          key={document.id}
          document={document}
          locationLabel={showLocation ? getFolderName(document) : undefined}
        />
      ))}
    </div>
  );
}

function DocumentGridCard({
  document,
  locationLabel,
}: {
  document: DocumentItem;
  locationLabel?: string;
}) {
  return (
    <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-background transition hover:bg-muted/30 hover:shadow-sm sm:w-48 sm:flex-none sm:rounded-lg">
      <Link
        href={`/documents/${document.id}`}
        className="absolute inset-0 block"
        aria-label={`Open ${document.title}`}
      >
        <DocumentThumbnail
          document={document}
          className="absolute inset-0 rounded-none border-0"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-8 sm:px-3 sm:pb-3 sm:pt-10">
          {locationLabel ? (
            <p className="mb-0.5 truncate text-[0.7rem] font-medium leading-4 text-white/75">
              {locationLabel}
            </p>
          ) : null}
          <h3 className="truncate text-xs font-medium leading-4 text-white group-hover:underline sm:text-sm sm:leading-5">
            {document.title}
          </h3>
        </div>
      </Link>
      {document.isPublic ? (
        <Badge className="absolute left-1.5 top-1.5 z-10 bg-background/85 text-foreground shadow-sm backdrop-blur sm:left-2 sm:top-2">
          Public
        </Badge>
      ) : null}
      <div className="absolute right-1.5 top-1.5 z-10 sm:right-2 sm:top-2">
        <DocumentActionsMenu document={document} />
      </div>
    </div>
  );
}

function FolderGridCard({
  folder,
  onOpen,
}: {
  folder: FolderItem;
  onOpen: () => void;
}) {
  return (
    <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-background transition hover:bg-muted/30 hover:shadow-sm sm:w-48 sm:flex-none sm:rounded-lg">
      <button
        type="button"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
        aria-label={`Open folder ${folder.name}`}
        onClick={onOpen}
      >
        <div className="flex size-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FolderIcon className="size-9" />
        </div>
        <span className="max-w-full truncate text-sm font-medium group-hover:underline">
          {folder.name}
        </span>
      </button>
      {folder.isPublic ? (
        <Badge className="absolute left-1.5 top-1.5 z-10 bg-background/85 text-foreground shadow-sm backdrop-blur sm:left-2 sm:top-2">
          Public
        </Badge>
      ) : null}
      <div className="absolute right-1.5 top-1.5 z-10 sm:right-2 sm:top-2">
        <FolderActionsMenu folder={folder} />
      </div>
    </div>
  );
}

function DocumentTable({
  folders,
  documents,
  getFolderName,
  showLocation,
  onSelectFolder,
}: {
  folders: FolderItem[];
  documents: DocumentItem[];
  getFolderName: (document: DocumentItem) => string;
  showLocation: boolean;
  onSelectFolder: (folderId: string | null) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Preview</TableHead>
          <TableHead>Title</TableHead>
          {showLocation ? <TableHead className="w-40">Location</TableHead> : null}
          <TableHead className="w-20 text-right">Open</TableHead>
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => (
          <TableRow key={folder.id}>
            <TableCell>
              <div className="flex h-20 w-16 items-center justify-center rounded-md border bg-muted/40">
                <FolderIcon className="size-7 text-muted-foreground" />
              </div>
            </TableCell>
            <TableCell className="min-w-72 whitespace-normal">
              <div className="flex items-start gap-2">
                <FolderIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="min-w-0 truncate font-medium hover:underline"
                  onClick={() => onSelectFolder(folder.id)}
                >
                  {folder.name}
                </button>
                {folder.isPublic ? (
                  <Badge variant="secondary" className="shrink-0">
                    Public
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            {showLocation ? <TableCell /> : null}
            <TableCell className="text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectFolder(folder.id)}
              >
                Open
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <FolderActionsMenu folder={folder} />
            </TableCell>
          </TableRow>
        ))}
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell>
              <DocumentThumbnail
                document={document}
                className="h-20 w-16"
              />
            </TableCell>
            <TableCell className="min-w-72 whitespace-normal">
              <div className="flex items-start gap-2">
                <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <Link
                  href={`/documents/${document.id}`}
                  className="min-w-0 truncate font-medium hover:underline"
                >
                  {document.title}
                </Link>
                {document.isPublic ? (
                  <Badge variant="secondary" className="shrink-0">
                    Public
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            {showLocation ? (
              <TableCell className="text-sm text-muted-foreground">
                {getFolderName(document)}
              </TableCell>
            ) : null}
            <TableCell className="text-right">
              <Button variant="outline" size="sm" render={<Link href={`/documents/${document.id}`} />}>
                Open
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <DocumentActionsMenu document={document} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getMutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function getPublicDocumentUrl(documentId: string) {
  return `${window.location.origin}/public/documents/${documentId}`;
}

function FolderActionsMenu({
  folder,
  onDeleted,
}: {
  folder: FolderItem;
  onDeleted?: () => void;
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const updateFolderMutation = useUpdateFolderMutation();
  const updatePublicAccessMutation = useUpdateFolderPublicAccessMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const isBusy =
    updateFolderMutation.isPending ||
    updatePublicAccessMutation.isPending ||
    deleteFolderMutation.isPending;

  const handleTogglePublicAccess = () => {
    updatePublicAccessMutation.mutate(
      {
        folderId: folder.id,
        isPublic: !folder.isPublic,
      },
      {
        onSuccess: (updatedFolder) => {
          toast.success(
            updatedFolder.isPublic
              ? "Folder public access enabled"
              : "Folder public access disabled",
          );
        },
        onError: (error) => {
          toast.error("Folder public access failed", {
            description: getMutationErrorMessage(error),
          });
        },
      },
    );
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete "${folder.name}"?`);

    if (!confirmed) {
      return;
    }

    deleteFolderMutation.mutate(folder.id, {
      onSuccess: () => {
        onDeleted?.();
        toast.success("Folder deleted");
      },
      onError: (error) => {
        toast.error("Folder delete failed", {
          description: getMutationErrorMessage(error),
        });
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for folder ${folder.name}`}
              className="bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background"
            >
              <EllipsisVerticalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => setIsRenameOpen(true)}
            disabled={isBusy}
          >
            <PencilIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTogglePublicAccess} disabled={isBusy}>
            {folder.isPublic ? <LockIcon /> : <Globe2Icon />}
            {folder.isPublic ? "Make private" : "Make public"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsShareOpen(true)}
            disabled={isBusy}
          >
            <ShieldCheckIcon />
            Access
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            disabled={isBusy}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FolderNameDialog
        key={folder.id}
        title="Rename folder"
        open={isRenameOpen}
        initialName={folder.name}
        isSaving={updateFolderMutation.isPending}
        onOpenChange={setIsRenameOpen}
        onSubmit={(name) => {
          updateFolderMutation.mutate(
            { folderId: folder.id, name },
            {
              onSuccess: () => {
                setIsRenameOpen(false);
                toast.success("Folder renamed");
              },
              onError: (error) => {
                toast.error("Folder rename failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
      />
      <FolderShareDialog folder={isShareOpen ? folder : null} onOpenChange={setIsShareOpen} />
    </>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be read."));
    };
    image.src = objectUrl;
  });
}

function DocumentActionsMenu({ document }: { document: DocumentItem }) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const deleteDocumentMutation = useDeleteDocumentMutation();
  const downloadDocumentPdfMutation = useDownloadDocumentPdfMutation();
  const saveDocumentPermissionMutation = useSaveDocumentPermissionMutation();
  const removeDocumentPermissionMutation = useRemoveDocumentPermissionMutation();
  const reprocessOcrMutation = useReprocessDocumentOcrMutation();
  const updateFolderMutation = useUpdateDocumentFolderMutation();
  const updateTitleMutation = useUpdateDocumentTitleMutation();
  const updatePublicAccessMutation = useUpdateDocumentPublicAccessMutation();
  const uploadThumbnailMutation = useUploadDocumentThumbnailMutation();
  const permissionsQuery = useDocumentPermissionsQuery(
    document.id,
    isShareOpen || isMenuOpen,
  );
  const isDeleting = deleteDocumentMutation.isPending;
  const isDownloading = downloadDocumentPdfMutation.isPending;
  const isReprocessing = reprocessOcrMutation.isPending;
  const isMoving = updateFolderMutation.isPending;
  const isRenaming = updateTitleMutation.isPending;
  const isUpdatingPublicAccess = updatePublicAccessMutation.isPending;
  const isUploadingThumbnail = uploadThumbnailMutation.isPending;
  const isBusy =
    isDeleting ||
    isDownloading ||
    isReprocessing ||
    isMoving ||
    isRenaming ||
    isUpdatingPublicAccess ||
    isUploadingThumbnail;
  const canManageDocument =
    permissionsQuery.isSuccess ||
    (permissionsQuery.isError &&
      (!axios.isAxiosError(permissionsQuery.error) ||
        permissionsQuery.error.response?.status !== 403));

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete "${document.title}"?`);

    if (!confirmed) {
      return;
    }

    deleteDocumentMutation.mutate(document.id, {
      onSuccess: () => {
        toast.success("Document deleted");
      },
      onError: (error) => {
        toast.error("Delete failed", {
          description: getMutationErrorMessage(error),
        });
      },
    });
  };

  const handleReprocessOcr = () => {
    reprocessOcrMutation.mutate(document.id, {
      onSuccess: () => {
        toast.success("OCR processing started");
      },
      onError: (error) => {
        toast.error("OCR processing failed", {
          description: getMutationErrorMessage(error),
        });
      },
    });
  };

  const handleDownload = () => {
    downloadDocumentPdfMutation.mutate(document.id, {
      onSuccess: (blob) => {
        saveBlobAsFile(blob, getPdfDownloadFileName(document));
        toast.success("PDF download started");
      },
      onError: (error) => {
        toast.error("Download failed", {
          description: getMutationErrorMessage(error),
        });
      },
    });
  };

  const handleTogglePublicAccess = () => {
    updatePublicAccessMutation.mutate(
      {
        documentId: document.id,
        isPublic: !document.isPublic,
      },
      {
        onSuccess: (updatedDocument) => {
          if (!updatedDocument.isPublic) {
            toast.success("Public viewing disabled");
            return;
          }

          navigator.clipboard
            .writeText(getPublicDocumentUrl(updatedDocument.id))
            .then(() => {
              toast.success("Public viewing enabled and link copied");
            })
            .catch(() => {
              toast.success("Public viewing enabled");
              toast.error("Copy failed", {
                description: "Copy the link from the document menu.",
              });
            });
        },
        onError: (error) => {
          toast.error("Public setting failed", {
            description: getMutationErrorMessage(error),
          });
        },
      },
    );
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(getPublicDocumentUrl(document.id));
      toast.success("Public link copied");
    } catch {
      toast.error("Copy failed", {
        description: "Copy the link from your browser after opening it.",
      });
    }
  };

  const handleThumbnailFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!supportedThumbnailContentTypes.has(file.type)) {
      toast.error("Thumbnail upload failed", {
        description: "Use a JPEG, PNG, or WebP image.",
      });
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);

      uploadThumbnailMutation.mutate(
        {
          documentId: document.id,
          file,
          width: dimensions.width,
          height: dimensions.height,
        },
        {
          onSuccess: () => {
            toast.success("Thumbnail updated");
          },
          onError: (error) => {
            toast.error("Thumbnail upload failed", {
              description: getMutationErrorMessage(error),
            });
          },
        },
      );
    } catch (error) {
      toast.error("Thumbnail upload failed", {
        description: getMutationErrorMessage(error),
      });
    }
  };

  return (
    <>
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleThumbnailFileChange}
      />
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for ${document.title}`}
              className="bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background"
            >
              <EllipsisVerticalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          {canManageDocument ? (
            <>
              <DropdownMenuItem
                onClick={() => setIsRenameOpen(true)}
                disabled={isBusy}
              >
                <PencilIcon />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isBusy}
              >
                <ImageIcon />
                Change thumbnail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsMoveOpen(true)}
                disabled={isBusy}
              >
                <FolderIcon />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onClick={handleDownload} disabled={isBusy}>
            <DownloadIcon />
            Download PDF
          </DropdownMenuItem>
          {canManageDocument ? (
            <DropdownMenuItem
              onClick={handleTogglePublicAccess}
              disabled={isBusy}
            >
              {document.isPublic ? <LockIcon /> : <Globe2Icon />}
              {document.isPublic ? "Make private" : "Make public"}
            </DropdownMenuItem>
          ) : null}
          {document.isPublic ? (
            <DropdownMenuItem onClick={handleCopyPublicLink} disabled={isBusy}>
              <LinkIcon />
              Copy public link
            </DropdownMenuItem>
          ) : null}
          {canManageDocument ? (
            <>
              <DropdownMenuItem
                onClick={() => setIsShareOpen(true)}
                disabled={isBusy}
              >
                <ShieldCheckIcon />
                Access
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleReprocessOcr}
                disabled={isBusy}
              >
                <RefreshCcwIcon />
                Process OCR again
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
                disabled={isBusy}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDocumentDialog
        document={document}
        open={isRenameOpen}
        isSaving={isRenaming}
        onOpenChange={setIsRenameOpen}
        onSubmit={(title) => {
          updateTitleMutation.mutate(
            {
              documentId: document.id,
              title,
            },
            {
              onSuccess: () => {
                setIsRenameOpen(false);
                toast.success("Document renamed");
              },
              onError: (error) => {
                toast.error("Rename failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
      />
      <MoveDocumentDialog
        document={document}
        open={isMoveOpen}
        isSaving={isMoving}
        onOpenChange={setIsMoveOpen}
        onSubmit={(folderId) => {
          updateFolderMutation.mutate(
            {
              documentId: document.id,
              folderId,
            },
            {
              onSuccess: () => {
                setIsMoveOpen(false);
                toast.success("Document moved");
              },
              onError: (error) => {
                toast.error("Move failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
      />
      <ResourcePermissionsDialog
        open={isShareOpen}
        title={`Document access: ${document.title}`}
        description="People and groups with view access can open and preview this document. They cannot edit, delete, make it public, or change access settings."
        permissions={permissionsQuery.data}
        isLoading={permissionsQuery.isLoading}
        isSaving={saveDocumentPermissionMutation.isPending}
        isRemoving={removeDocumentPermissionMutation.isPending}
        showInherited
        directSourceLabel="This document"
        onOpenChange={setIsShareOpen}
        onSave={(input) => {
          saveDocumentPermissionMutation.mutate(
            {
              resourceId: document.id,
              targetType: input.targetType,
              targetId: input.targetId,
              permission: input.permission,
            },
            {
              onSuccess: () => toast.success("Document access updated"),
              onError: (error) => {
                toast.error("Document access update failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
        onRemove={(input) => {
          removeDocumentPermissionMutation.mutate(
            {
              resourceId: document.id,
              targetType: input.targetType,
              targetId: input.targetId,
            },
            {
              onSuccess: () => toast.success("Document access removed"),
              onError: (error) => {
                toast.error("Document access removal failed", {
                  description: getMutationErrorMessage(error),
                });
              },
            },
          );
        }}
      />
    </>
  );
}

function RenameDocumentDialog({
  document,
  open,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  document: DocumentItem;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState(document.title);
  const trimmedTitle = title.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedTitle) {
      toast.error("Rename failed", {
        description: "Document title cannot be empty.",
      });
      return;
    }

    onSubmit(trimmedTitle);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setTitle(document.title);
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>
              The title is trimmed before it is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-document-${document.id}`}>Title</Label>
            <Input
              id={`rename-document-${document.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !trimmedTitle}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoveDocumentDialog({
  document,
  open,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  document: DocumentItem;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (folderId: string | null) => void;
}) {
  const foldersQuery = useFoldersQuery();
  const [folderId, setFolderId] = useState<string | null>(document.folderId);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setFolderId(document.folderId);
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(folderId);
          }}
        >
          <DialogHeader>
            <DialogTitle>Move document</DialogTitle>
            <DialogDescription>
              Select the folder that should contain this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`move-document-${document.id}`}>Folder</Label>
            <select
              id={`move-document-${document.id}`}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
              value={folderId ?? ""}
              disabled={isSaving}
              onChange={(event) => setFolderId(event.target.value || null)}
            >
              <option value="">No folder</option>
              {(foldersQuery.data ?? []).map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentThumbnail({
  document,
  className,
}: {
  document: DocumentItem;
  className?: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const previewQuery = useDocumentPreviewQuery(document.id);
  const previewImageSrc = previewQuery.data?.previewUrl ?? null;
  const shouldShowImage = Boolean(previewImageSrc) && !hasImageError;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md border bg-muted/40",
        className,
      )}
    >
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewImageSrc ?? undefined}
          alt={`${document.title} thumbnail`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileTextIcon className="size-6" />
          <span className="text-xs font-medium">PDF</span>
        </div>
      )}
    </div>
  );
}
