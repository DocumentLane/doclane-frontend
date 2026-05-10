import { SeoHead } from "@/components/app/seo-head";
import {
  AdminSectionPage,
  GroupsAdminPanel,
} from "@/features/admin/components/admin-page";

export default function AdminGroups() {
  return (
    <>
      <SeoHead
        title="Groups"
        description="Manage group metadata in Doclane."
      />
      <AdminSectionPage
        title="Groups"
        description="Manage OIDC group metadata and pre-create groups for permissions."
      >
        <GroupsAdminPanel />
      </AdminSectionPage>
    </>
  );
}
