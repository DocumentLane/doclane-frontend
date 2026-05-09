import Link from "next/link";
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  Grid2X2Icon,
  RefreshCcwIcon,
  Table2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useDeleteDocumentMutation,
  useDownloadDocumentPdfMutation,
  useDocumentPreviewQuery,
  useDocumentsQuery,
  useReprocessDocumentOcrMutation,
} from "../queries/documents.queries";
import { getPdfDownloadFileName, saveBlobAsFile } from "../lib/pdf-download";
import type { DocumentItem } from "../types/document.types";

type DocumentListViewMode = "grid" | "table";

export function DocumentList() {
  const [viewMode, setViewMode] = useState<DocumentListViewMode>("grid");
  const documentsQuery = useDocumentsQuery();
  const readyDocuments = useMemo(
    () => documentsQuery.data?.filter((document) => document.status === "READY") ?? [],
    [documentsQuery.data],
  );

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-1">
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

      {documentsQuery.isLoading ? (
        <DocumentListSkeleton viewMode={viewMode} />
      ) : readyDocuments.length > 0 ? (
        viewMode === "grid" ? (
          <DocumentGrid documents={readyDocuments} />
        ) : (
          <DocumentTable documents={readyDocuments} />
        )
      ) : (
        <DocumentEmptyState />
      )}
    </section>
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
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="aspect-[3/4] w-full flex-none sm:w-48" />
      ))}
    </div>
  );
}

function DocumentEmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        <UploadIcon className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-medium">No ready documents.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Uploaded PDFs appear here after processing is complete.
      </p>
    </div>
  );
}

function DocumentGrid({ documents }: { documents: DocumentItem[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {documents.map((document) => (
        <DocumentGridCard key={document.id} document={document} />
      ))}
    </div>
  );
}

function DocumentGridCard({ document }: { document: DocumentItem }) {
  return (
    <div className="group relative aspect-[3/4] w-full flex-none overflow-hidden rounded-lg border bg-background transition hover:bg-muted/30 hover:shadow-sm sm:w-48">
      <Link
        href={`/documents/${document.id}`}
        className="absolute inset-0 block"
        aria-label={`Open ${document.title}`}
      >
        <DocumentThumbnail
          document={document}
          className="absolute inset-0 rounded-none border-0"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-10">
          <h3 className="truncate text-sm font-medium leading-5 text-white group-hover:underline">
            {document.title}
          </h3>
        </div>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <DocumentActionsMenu document={document} />
      </div>
    </div>
  );
}

function DocumentTable({ documents }: { documents: DocumentItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Preview</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-20 text-right">Open</TableHead>
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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
              </div>
            </TableCell>
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

function DocumentActionsMenu({ document }: { document: DocumentItem }) {
  const deleteDocumentMutation = useDeleteDocumentMutation();
  const downloadDocumentPdfMutation = useDownloadDocumentPdfMutation();
  const reprocessOcrMutation = useReprocessDocumentOcrMutation();
  const isDeleting = deleteDocumentMutation.isPending;
  const isDownloading = downloadDocumentPdfMutation.isPending;
  const isReprocessing = reprocessOcrMutation.isPending;

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

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDownload}
          disabled={isDeleting || isDownloading || isReprocessing}
        >
          <DownloadIcon />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleReprocessOcr}
          disabled={isDeleting || isDownloading || isReprocessing}
        >
          <RefreshCcwIcon />
          Process OCR again
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isDownloading || isReprocessing}
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
