import { SeoHead } from "@/components/app/seo-head";
import { JobsPage } from "@/features/jobs/components/jobs-page";

export default function Jobs() {
  return (
    <>
      <SeoHead
        title="Jobs"
        description="Monitor document processing and OCR jobs in Doclane."
      />
      <JobsPage />
    </>
  );
}
