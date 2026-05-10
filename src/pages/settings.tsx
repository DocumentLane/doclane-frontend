import { SeoHead } from "@/components/app/seo-head";
import { SettingsPage } from "@/features/settings/components/settings-page";

export default function Settings() {
  return (
    <>
      <SeoHead
        title="Settings"
        description="Manage Doclane reader and workspace preferences."
      />
      <SettingsPage />
    </>
  );
}
