import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { SeoHead } from "@/components/app/seo-head";
import { PublicDocumentReader } from "@/features/documents/components/public-document-reader";
import {
  getPublicDocumentForSsr,
  getPublicDocumentPreviewForSsr,
  getPublicDocumentViewForSsr,
} from "@/features/documents/queries/public-documents.server";
import type {
  DocumentItem,
  DocumentPreviewResponse,
  DocumentViewResponse,
} from "@/features/documents/types/document.types";

interface PublicDocumentPageProps {
  documentId: string | null;
  document: DocumentItem | null;
  view: DocumentViewResponse | null;
  preview: DocumentPreviewResponse | null;
}

function PublicDocumentPage({
  documentId,
  document,
  view,
  preview,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!documentId || !document || !view) {
    return (
      <>
        <SeoHead
          title="Public document unavailable"
          description="This public Doclane document could not be loaded."
          noIndex
        />
        <main className="flex min-h-svh items-center justify-center bg-background p-6">
          <p className="text-sm text-muted-foreground">Document unavailable.</p>
        </main>
      </>
    );
  }

  return (
    <PublicDocumentReader
      documentId={documentId}
      initialDocument={document}
      initialView={view}
      initialPreview={preview}
    />
  );
}

PublicDocumentPage.fullscreen = true;

export default PublicDocumentPage;

export const getServerSideProps: GetServerSideProps<
  PublicDocumentPageProps
> = async ({ params }) => {
  const documentId = typeof params?.id === "string" ? params.id : null;

  if (!documentId) {
    return {
      props: {
        documentId: null,
        document: null,
        view: null,
        preview: null,
      },
    };
  }

  try {
    const [document, view, preview] = await Promise.all([
      getPublicDocumentForSsr(documentId),
      getPublicDocumentViewForSsr(documentId),
      getPublicDocumentPreviewForSsr(documentId),
    ]);

    return {
      props: {
        documentId,
        document,
        view,
        preview,
      },
    };
  } catch {
    return {
      notFound: true,
    };
  }
};
