import { useDocumentStatusQuery } from "../queries/documents.queries";
import type { DocumentItem } from "../types/document.types";

interface DocumentPageCountInlineProps {
  document: DocumentItem;
}

export function DocumentPageCountInline({
  document,
}: DocumentPageCountInlineProps) {
  const statusQuery = useDocumentStatusQuery(document.id);
  const pageCount = statusQuery.data?.pageCount ?? document.pageCount;

  return <>{pageCount ?? "-"}</>;
}
