import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { SeoHead } from "@/components/app/seo-head";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  documentQueryKeys,
  useDocumentQuery,
  useDocumentPreviewQuery,
  useRestartDocumentJobMutation,
  useDocumentStatusQuery,
  useDocumentViewQuery,
} from "../queries/documents.queries";
import type { DocumentJobSummary } from "../types/document.types";

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

function getMutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function canRestartJob(job: DocumentJobSummary) {
  return (
    (job.type === "PDF_METADATA" || job.type === "PDF_OCR") &&
    (job.status === "FAILED" || job.status === "CANCELLED")
  );
}

export function DocumentReader({ documentId }: DocumentReaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentQuery = useDocumentQuery(documentId);
  const statusQuery = useDocumentStatusQuery(documentId);
  const viewQuery = useDocumentViewQuery(documentId);
  const previewQuery = useDocumentPreviewQuery(documentId);
  const restartJobMutation = useRestartDocumentJobMutation();
  const document = documentQuery.data;
  const status = statusQuery.data?.status ?? document?.status;
  const view = viewQuery.data;
  const restartableJob = statusQuery.data?.jobs.find(canRestartJob) ?? null;
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

  if (documentQuery.isError || (viewQuery.isError && status !== "PROCESSING_FAILED")) {
    return (
      <>
        <SeoHead
          title="Document failed to load"
          description="The requested Doclane document could not be loaded."
          noIndex
        />
        <main className="flex min-h-svh items-center justify-center bg-background p-6">
          <Alert variant="destructive">
            <AlertTitle>Document failed to load</AlertTitle>
            <AlertDescription>
              The document details or file link could not be loaded.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  if (!document) {
    return (
      <>
        <SeoHead
          title="Document"
          description="Read and annotate a PDF document in Doclane."
          noIndex
        />
        <main className="flex h-svh min-h-0 flex-col bg-background p-6">
          <Skeleton className="h-full w-full" />
        </main>
      </>
    );
  }

  if (status === "PROCESSING_FAILED") {
    const handleRestart = () => {
      if (!restartableJob) {
        return;
      }

      restartJobMutation.mutate(
        {
          documentId,
          jobId: restartableJob.id,
        },
        {
          onSuccess: () => {
            toast.success("Task restarted");
          },
          onError: (error) => {
            toast.error("Restart failed", {
              description: getMutationErrorMessage(error),
            });
          },
        },
      );
    };

    return (
      <>
        <SeoHead
          title={document.title}
          description={`${document.title} could not be processed in Doclane.`}
          imageUrl={previewQuery.data?.previewUrl ?? null}
          noIndex
        />
        <main className="flex min-h-svh items-center justify-center bg-background p-6">
          <Alert variant="destructive">
            <AlertTitle>Processing failed</AlertTitle>
            <AlertDescription>
              PDF processing failed. Try processing the document again later.
            </AlertDescription>
            {restartableJob ? (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleRestart}
                  disabled={restartJobMutation.isPending}
                >
                  <RefreshCcwIcon />
                  Restart failed task
                </Button>
              </div>
            ) : null}
          </Alert>
        </main>
      </>
    );
  }

  if (!view) {
    return (
      <>
        <SeoHead
          title={document.title}
          description={`Read ${document.title} in Doclane.`}
          imageUrl={previewQuery.data?.previewUrl ?? null}
          noIndex
        />
        <main className="flex h-svh min-h-0 flex-col bg-background p-6">
          <Skeleton className="h-full w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <SeoHead
        title={document.title}
        description={`Read ${document.title} in Doclane.`}
        imageUrl={previewQuery.data?.previewUrl ?? null}
        noIndex
      />
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
    </>
  );
}
