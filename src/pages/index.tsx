import { SeoHead } from "@/components/app/seo-head";
import { DocumentsDashboard } from "@/features/documents/components/documents-dashboard";

export default function Home() {
  return (
    <>
      <SeoHead
        title="Documents"
        description="Browse, upload, and open your PDF documents in Doclane."
      />
      <DocumentsDashboard />
    </>
  );
}
