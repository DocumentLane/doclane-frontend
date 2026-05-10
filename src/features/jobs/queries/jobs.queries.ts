import { useMemo } from "react";
import {
  useDocumentStatusesQuery,
  useDocumentsQuery,
} from "@/features/documents/queries/documents.queries";
import type {
  DocumentItem,
  DocumentJobStatus,
  DocumentJobSummary,
} from "@/features/documents/types/document.types";

export interface DocumentJobSummaryRow {
  job: DocumentJobSummary;
  document: DocumentItem;
}

const emptyDocuments: DocumentItem[] = [];

const ongoingJobStatuses = new Set<DocumentJobStatus>([
  "QUEUED",
  "ACTIVE",
  "RETRYING",
]);

export function isOngoingDocumentJob(status: DocumentJobStatus) {
  return ongoingJobStatuses.has(status);
}

export function useDocumentJobSummaries() {
  const documentsQuery = useDocumentsQuery();
  const documents = documentsQuery.data ?? emptyDocuments;
  const statusesQuery = useDocumentStatusesQuery();
  const rows = useMemo(
    () => {
      const statusesByDocumentId = new Map(
        statusesQuery.data?.map((status) => [status.documentId, status]) ?? [],
      );

      return documents
        .flatMap((document): DocumentJobSummaryRow[] => {
          const status = statusesByDocumentId.get(document.id);
          return (
            status?.jobs.map((job) => ({
              job,
              document,
            })) ?? []
          );
        })
        .sort(
          (left, right) =>
            new Date(right.job.queuedAt).getTime() -
            new Date(left.job.queuedAt).getTime(),
        );
    },
    [documents, statusesQuery.data],
  );

  return {
    documentsQuery,
    statusesQuery,
    rows,
    isLoading: documentsQuery.isLoading || statusesQuery.isLoading,
  };
}
