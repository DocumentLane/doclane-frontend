import { SeoHead } from "@/components/app/seo-head";
import { AuditLogsPanel } from "@/features/audit-logs/components/audit-logs-panel";
import { AdminSectionPage } from "@/features/admin/components/admin-page";

export default function AdminAuditLogs() {
  return (
    <>
      <SeoHead
        title="Audit logs"
        description="Review audit logs in Doclane."
      />
      <AdminSectionPage
        title="Audit logs"
        description="Review administrative and document access activity."
      >
        <AuditLogsPanel />
      </AdminSectionPage>
    </>
  );
}
