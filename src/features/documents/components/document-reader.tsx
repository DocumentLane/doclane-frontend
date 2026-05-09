import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  documentQueryKeys,
  useDocumentQuery,
  useDocumentPreviewQuery,
  useDocumentStatusQuery,
  useDocumentViewQuery,
} from "../queries/documents.queries";

const PdfReaderWorkspace = dynamic(
  () =>
    import("./pdf-reader-workspace").then(
      (module) => module.PdfReaderWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <main className="flex h-svh min-h-0 flex-col bg-background p-6">
        <Skeleton className="h-full w-full" />
      </main>
    ),
  },
);

interface DocumentReaderProps {
  documentId: string;
}

export function DocumentReader({ documentId }: DocumentReaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentQuery = useDocumentQuery(documentId);
  const statusQuery = useDocumentStatusQuery(documentId);
  const viewQuery = useDocumentViewQuery(documentId);
  const previewQuery = useDocumentPreviewQuery(documentId);
  const document = documentQuery.data;
  const status = statusQuery.data?.status ?? document?.status;
  const view = viewQuery.data;
  const metadataJobFinished = Boolean(
    statusQuery.data?.jobs.some(
      (job) =>
        job.type === "PDF_METADATA" &&
        (job.status === "COMPLETED" || job.status === "FAILED"),
    ),
  );

  useEffect(() => {
    if (view?.linearizationStatus !== "PROCESSING" || !metadataJobFinished) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: documentQueryKeys.view(documentId),
    });
  }, [metadataJobFinished, documentId, queryClient, view?.linearizationStatus]);

  const handleBack = () => {
    void router.push("/");
  };

  if (documentQuery.isError || viewQuery.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Alert variant="destructive">
          <AlertTitle>Document failed to load</AlertTitle>
          <AlertDescription>
            The document details or file link could not be loaded.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!document || !view) {
    return (
      <main className="flex h-svh min-h-0 flex-col bg-background p-6">
        <Skeleton className="h-full w-full" />
      </main>
    );
  }

  if (status === "PROCESSING_FAILED") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Alert variant="destructive">
          <AlertTitle>Processing failed</AlertTitle>
          <AlertDescription>
            PDF processing failed. Try processing the document again later.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <PdfReaderWorkspace
      key={documentId}
      documentId={documentId}
      title={document.title}
      originalFileName={document.originalFileName}
      viewUrl={view.viewUrl}
      previewUrl={previewQuery.data?.previewUrl ?? null}
      documentPageCount={statusQuery.data?.pageCount ?? document.pageCount}
      initialPageNumber={document.lastReadPageNumber ?? 1}
      linearizationStatus={view.linearizationStatus}
      jobs={statusQuery.data?.jobs ?? []}
      onBack={handleBack}
    />
  );
}
