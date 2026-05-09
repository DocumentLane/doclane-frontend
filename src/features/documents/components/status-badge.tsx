import { Badge } from "@/components/ui/badge";
import type {
  DocumentOcrStatus,
  DocumentStatus,
} from "../types/document.types";

interface StatusBadgeProps {
  status: DocumentStatus | DocumentOcrStatus;
}

const statusLabels: Record<DocumentStatus | DocumentOcrStatus, string> = {
  UPLOAD_PENDING: "Upload pending",
  UPLOADED: "Uploaded",
  METADATA_PROCESSING: "Preparing",
  READY: "Ready",
  PROCESSING_FAILED: "Failed",
  DELETED: "Deleted",
  NOT_REQUIRED: "OCR not required",
  PENDING: "OCR pending",
  PROCESSING: "OCR processing",
  COMPLETED: "OCR complete",
  FAILED: "OCR failed",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "READY" || status === "NOT_REQUIRED" || status === "COMPLETED"
      ? "secondary"
      : status === "PROCESSING_FAILED" || status === "FAILED"
        ? "destructive"
        : "outline";

  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}
