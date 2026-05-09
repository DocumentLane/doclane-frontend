import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getDocumentStatus } from "@/features/documents/queries/documents.api";
import {
  documentQueryKeys,
  isDocumentOcrProcessing,
  isDocumentProcessing,
  useDocumentsQuery,
} from "@/features/documents/queries/documents.queries";
import type {
  DocumentItem,
  DocumentJobStatus,
  DocumentJobSummary,
  DocumentStatusResponse,
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

function shouldPollDocumentStatus(status: DocumentStatusResponse) {
  return (
    isDocumentProcessing(status.status) ||
    isDocumentOcrProcessing(status.ocrStatus) ||
    status.jobs.some((job) => isOngoingDocumentJob(job.status))
  );
}

export function useDocumentJobSummaries() {
  const documentsQuery = useDocumentsQuery();
  const documents = documentsQuery.data ?? emptyDocuments;
  const statusQueries = useQueries({
    queries: documents.map((document) => ({
      queryKey: documentQueryKeys.status(document.id),
      queryFn: () => getDocumentStatus(document.id),
      refetchInterval: (query: { state: { data?: DocumentStatusResponse } }) => {
        const data = query.state.data;

        return data && shouldPollDocumentStatus(data) ? 1500 : false;
      },
    })),
  });
  const rows = useMemo(
    () =>
      documents
        .flatMap((document, index): DocumentJobSummaryRow[] => {
          const status = statusQueries[index]?.data;

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
        ),
    [documents, statusQueries],
  );

  return {
    documentsQuery,
    statusQueries,
    rows,
    isLoading:
      documentsQuery.isLoading || statusQueries.some((query) => query.isLoading),
  };
}
