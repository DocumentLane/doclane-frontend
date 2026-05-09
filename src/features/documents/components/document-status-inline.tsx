import { StatusBadge } from "./status-badge";
import { useDocumentStatusQuery } from "../queries/documents.queries";
import type { DocumentItem } from "../types/document.types";

interface DocumentStatusInlineProps {
  document: DocumentItem;
}

export function DocumentStatusInline({ document }: DocumentStatusInlineProps) {
  const statusQuery = useDocumentStatusQuery(document.id);
  const status = statusQuery.data?.status ?? document.status;
  const ocrStatus = statusQuery.data?.ocrStatus ?? document.ocrStatus;

  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status={status} />
      <StatusBadge status={ocrStatus} />
    </div>
  );
}
