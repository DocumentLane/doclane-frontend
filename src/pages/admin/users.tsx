import { SeoHead } from "@/components/app/seo-head";
import {
  AdminSectionPage,
  UsersAdminPanel,
} from "@/features/admin/components/admin-page";

export default function AdminUsers() {
  return (
    <>
      <SeoHead
        title="Users"
        description="Manage users and group membership in Doclane."
      />
      <AdminSectionPage
        title="Users"
        description="Manage OIDC-backed users, application roles, and group membership."
      >
        <UsersAdminPanel />
      </AdminSectionPage>
    </>
  );
}
