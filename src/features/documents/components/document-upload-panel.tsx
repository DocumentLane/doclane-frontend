import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  FileTextIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { v4 as createUuid } from "uuid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadDocument } from "../queries/documents.api";
import { documentQueryKeys } from "../queries/documents.queries";
import type { DocumentItem } from "../types/document.types";

interface DocumentUploadPanelProps {
  folderId?: string | null;
  onUploaded?: () => void;
}

type UploadStatus = "queued" | "uploading" | "complete" | "error";

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  title: string;
  errorMessage?: string;
}

function createUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${createUuid()}`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getDefaultDocumentTitle(file: File) {
  return file.name.replace(/\.pdf$/i, "");
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentUploadPanel({
  folderId = null,
  onUploaded,
}: DocumentUploadPanelProps) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadQueueItem[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const uploadableCount = useMemo(
    () =>
      uploads.filter((upload) => upload.status === "queued" || upload.status === "error")
        .length,
    [uploads],
  );
  const isUploading = uploads.some((upload) => upload.status === "uploading");

  const updateUpload = (id: string, patch: Partial<UploadQueueItem>) => {
    setUploads((currentUploads) =>
      currentUploads.map((upload) =>
        upload.id === id ? { ...upload, ...patch } : upload,
      ),
    );
  };

  const addFiles = (fileList: FileList | File[]) => {
    const nextFiles = Array.from(fileList);
    const pdfFiles = nextFiles.filter(isPdfFile);
    const rejectedCount = nextFiles.length - pdfFiles.length;

    if (rejectedCount > 0) {
      toast.error("Only PDF files can be uploaded", {
        description: `${rejectedCount} file${rejectedCount === 1 ? "" : "s"} skipped.`,
      });
    }

    if (pdfFiles.length === 0) {
      setFileInputKey((currentKey) => currentKey + 1);
      return;
    }

    setUploads((currentUploads) => [
      ...currentUploads,
      ...pdfFiles.map((file) => ({
        id: createUploadId(file),
        file,
        progress: 0,
        status: "queued" as const,
        title: getDefaultDocumentTitle(file),
      })),
    ]);
    setFileInputKey((currentKey) => currentKey + 1);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const removeUpload = (id: string) => {
    setUploads((currentUploads) =>
      currentUploads.filter((upload) => upload.id !== id),
    );
  };

  const invalidateUploadedDocument = async (document: DocumentItem) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: documentQueryKeys.detail(document.id),
      }),
      queryClient.invalidateQueries({
        queryKey: documentQueryKeys.statuses(),
      }),
      queryClient.invalidateQueries({
        queryKey: documentQueryKeys.status(document.id),
      }),
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const pendingUploads = uploads.filter(
      (upload) => upload.status === "queued" || upload.status === "error",
    );

    if (pendingUploads.length === 0) {
      return;
    }

    await Promise.all(
      pendingUploads.map(async (upload) => {
        updateUpload(upload.id, {
          errorMessage: undefined,
          progress: 0,
          status: "uploading",
        });

        try {
          const document = await uploadDocument({
            file: upload.file,
            title: upload.title.trim() || getDefaultDocumentTitle(upload.file),
            folderId,
            onUploadProgress: (progress) => {
              updateUpload(upload.id, { progress });
            },
          });

          updateUpload(upload.id, { progress: 100, status: "complete" });
          toast.success("Upload complete", {
            description: `${document.title} will appear after processing.`,
          });
          await invalidateUploadedDocument(document);
          onUploaded?.();
        } catch {
          updateUpload(upload.id, {
            errorMessage: "The upload could not be completed.",
            status: "error",
          });
          toast.error("Upload failed", {
            description: upload.file.name,
          });
        }
      }),
    );
  };

  const failedUploads = uploads.filter((upload) => upload.status === "error");

  return (
    <form className="flex min-h-0 flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="document-file">PDF files</Label>
        <label
          htmlFor="document-file"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors",
            "hover:border-ring hover:bg-muted/50",
            isDragging && "border-ring bg-muted",
          )}
        >
          <UploadIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Drop PDFs here or browse</span>
          <span className="text-xs text-muted-foreground">
            Select or drag one or more PDF files.
          </span>
        </label>
        <Input
          key={fileInputKey}
          id="document-file"
          className="sr-only"
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {uploads.length > 0 ? (
        <div className="min-h-0 max-h-[40svh] space-y-2 overflow-y-auto pr-1 overscroll-contain">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="rounded-md border bg-background p-3"
            >
              <div className="flex items-start gap-3">
                <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {upload.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(upload.file.size)}
                        {" · "}
                        {upload.status === "queued"
                          ? "Ready"
                          : upload.status === "uploading"
                            ? `${upload.progress}%`
                            : upload.status === "complete"
                              ? "Complete"
                              : "Failed"}
                      </p>
                    </div>
                    {upload.status === "complete" ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-green-600" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => removeUpload(upload.id)}
                        disabled={upload.status === "uploading"}
                        aria-label={`Remove ${upload.file.name}`}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor={`document-title-${upload.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Document title
                    </Label>
                    <Input
                      id={`document-title-${upload.id}`}
                      value={upload.title}
                      onChange={(event) =>
                        updateUpload(upload.id, { title: event.target.value })
                      }
                      placeholder="Use the file name without .pdf"
                      disabled={upload.status === "uploading" || upload.status === "complete"}
                    />
                  </div>
                  <Progress value={upload.progress} />
                  {upload.errorMessage ? (
                    <p className="text-xs text-destructive">
                      {upload.errorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {failedUploads.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>
            {failedUploads.length} file{failedUploads.length === 1 ? "" : "s"} failed.
            Fix the issue and upload again to retry failed files.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={uploadableCount === 0 || isUploading}>
          <UploadIcon />
          {uploadableCount > 1 ? `Upload ${uploadableCount} PDFs` : "Upload"}
        </Button>
      </div>
    </form>
  );
}
