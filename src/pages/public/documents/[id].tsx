import { useRouter } from "next/router";
import { SeoHead } from "@/components/app/seo-head";
import { PublicDocumentReader } from "@/features/documents/components/public-document-reader";

function PublicDocumentPage() {
  const router = useRouter();
  const documentId = typeof router.query.id === "string" ? router.query.id : null;

  if (!documentId) {
    return (
      <>
        <SeoHead
          title="Public document"
          description="Read a public PDF document in Doclane."
          noIndex
        />
        <main className="p-6">
          <p className="text-sm text-muted-foreground">Checking document ID.</p>
        </main>
      </>
    );
  }

  return <PublicDocumentReader documentId={documentId} />;
}

PublicDocumentPage.fullscreen = true;

export default PublicDocumentPage;
