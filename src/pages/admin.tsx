import { SeoHead } from "@/components/app/seo-head";
import { AdminPage } from "@/features/admin/components/admin-page";

export default function Admin() {
  return (
    <>
      <SeoHead
        title="Admin"
        description="Manage users and groups in Doclane."
      />
      <AdminPage />
    </>
  );
}
