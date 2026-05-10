import { SeoHead } from "@/components/app/seo-head";
import { WorkerSettingsPage } from "@/features/settings/components/worker-settings-page";

export default function WorkerSettings() {
  return (
    <>
      <SeoHead
        title="Worker Settings"
        description="Configure Doclane document processing workers."
      />
      <WorkerSettingsPage />
    </>
  );
}
