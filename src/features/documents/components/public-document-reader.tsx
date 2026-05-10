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
import type {
  DocumentItem,
  DocumentPreviewResponse,
  DocumentViewResponse,
} from "../types/document.types";

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
  initialDocument?: DocumentItem;
  initialView?: DocumentViewResponse;
  initialPreview?: DocumentPreviewResponse | null;
}

function getPublicDocumentDescription(document: DocumentItem) {
  if (document.pageCount) {
    return `Read ${document.title}, a ${document.pageCount}-page PDF, in Doclane.`;
  }

  return `Read ${document.title} in Doclane.`;
}

export function PublicDocumentReader({
  documentId,
  initialDocument,
  initialView,
  initialPreview,
}: PublicDocumentReaderProps) {
  const queryClient = useQueryClient();
  const documentQuery = usePublicDocumentQuery(documentId, initialDocument);
  const viewQuery = usePublicDocumentViewQuery(documentId, true, initialView);
  const previewQuery = usePublicDocumentPreviewQuery(
    documentId,
    true,
    initialPreview,
  );
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
        description={getPublicDocumentDescription(document)}
        imageUrl={previewQuery.data?.previewUrl ?? null}
      />
      <section className="sr-only" aria-label="Public document information">
        <h1>{document.title}</h1>
        <p>{getPublicDocumentDescription(document)}</p>
      </section>
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
