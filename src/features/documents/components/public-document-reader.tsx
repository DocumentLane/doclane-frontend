import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SeoHead } from "@/components/app/seo-head";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  documentQueryKeys,
  usePublicDocumentPreviewQuery,
  usePublicDocumentQuery,
  usePublicDocumentViewQuery,
} from "../queries/documents.queries";

const PublicPdfReaderWorkspace = dynamic(
  () =>
    import("./public-pdf-reader-workspace").then(
      (module) => module.PublicPdfReaderWorkspace,
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

interface PublicDocumentReaderProps {
  documentId: string;
}

export function PublicDocumentReader({ documentId }: PublicDocumentReaderProps) {
  const queryClient = useQueryClient();
  const documentQuery = usePublicDocumentQuery(documentId);
  const viewQuery = usePublicDocumentViewQuery(documentId);
  const previewQuery = usePublicDocumentPreviewQuery(documentId);
  const document = documentQuery.data;
  const view = viewQuery.data;
  const metadataJobFinished = Boolean(document?.metadataExtractedAt);

  useEffect(() => {
    if (view?.linearizationStatus !== "PROCESSING" || !metadataJobFinished) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: documentQueryKeys.publicView(documentId),
    });
  }, [metadataJobFinished, documentId, queryClient, view?.linearizationStatus]);

  if (documentQuery.isError || viewQuery.isError) {
    return (
      <>
        <SeoHead
          title="Public document unavailable"
          description="This public Doclane document could not be loaded."
          noIndex
        />
        <main className="flex min-h-svh items-center justify-center bg-background p-6">
          <Alert variant="destructive">
            <AlertTitle>Document unavailable</AlertTitle>
            <AlertDescription>
              This document is private, deleted, or not ready for public viewing.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  if (!document || !view) {
    return (
      <>
        <SeoHead
          title="Public document"
          description="Read a public PDF document in Doclane."
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
      <PublicPdfReaderWorkspace
        title={document.title}
        viewUrl={view.viewUrl}
        previewUrl={previewQuery.data?.previewUrl ?? null}
        documentPageCount={document.pageCount}
        linearizationStatus={view.linearizationStatus}
      />
    </>
  );
}
