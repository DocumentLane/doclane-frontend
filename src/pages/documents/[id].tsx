import { useRouter } from "next/router";
import { DocumentReader } from "@/features/documents/components/document-reader";

function DocumentPage() {
  const router = useRouter();
  const documentId = typeof router.query.id === "string" ? router.query.id : null;

  if (!documentId) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted-foreground">Checking document ID.</p>
      </main>
    );
  }

  return <DocumentReader documentId={documentId} />;
}

DocumentPage.fullscreen = true;

export default DocumentPage;
