import { BriefcaseBusinessIcon } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import {
  isOngoingDocumentJob,
  useDocumentJobSummaries,
} from "@/features/jobs/queries/jobs.queries";
import type {
  DocumentJobStatus,
  DocumentJobType,
} from "@/features/documents/types/document.types";

const jobTypeLabels: Record<DocumentJobType, string> = {
  PDF_METADATA: "Document details",
  PDF_PAGE_DERIVATIVE: "Page preview",
  PDF_OCR: "Text recognition",
};

const jobStatusLabels: Record<DocumentJobStatus, string> = {
  QUEUED: "Waiting",
  ACTIVE: "In progress",
  RETRYING: "Retrying",
  COMPLETED: "Complete",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const ongoingJobStatusPriority: Record<
  Extract<DocumentJobStatus, "ACTIVE" | "RETRYING" | "QUEUED">,
  number
> = {
  ACTIVE: 0,
  RETRYING: 1,
  QUEUED: 2,
};

function formatJobProgressDetail(job: {
  completedPages: number;
  currentPageNumber: number | null;
  totalPages: number | null;
}) {
  if (job.totalPages === null) {
    return null;
  }

  if (job.currentPageNumber !== null) {
    return `p.${job.currentPageNumber}/${job.totalPages}`;
  }

  return `${job.completedPages}/${job.totalPages} pages`;
}

export function SidebarJobStatus() {
  const { rows } = useDocumentJobSummaries();
  const ongoingRows = rows.filter(({ job }) => isOngoingDocumentJob(job.status));

  if (ongoingRows.length === 0) {
    return null;
  }

  const primaryRow = [...ongoingRows].sort(
    (left, right) =>
      ongoingJobStatusPriority[
        left.job.status as keyof typeof ongoingJobStatusPriority
      ] -
      ongoingJobStatusPriority[
        right.job.status as keyof typeof ongoingJobStatusPriority
      ],
  )[0];
  const { job, document } = primaryRow;
  const progressDetail = formatJobProgressDetail(job);

  return (
    <Link
      href="/jobs"
      className="block rounded-md border bg-sidebar-accent/40 px-2.5 py-2 text-sidebar-foreground transition hover:bg-sidebar-accent"
    >
      <div className="flex items-start gap-1.5">
        <BriefcaseBusinessIcon className="mt-0.5 size-3.5 shrink-0 text-sidebar-foreground/70" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium">Current task</p>
            {ongoingRows.length > 1 ? (
              <span className="shrink-0 text-[11px] tabular-nums text-sidebar-foreground/70">
                +{ongoingRows.length - 1}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[11px] leading-4 text-sidebar-foreground/70">
            {document.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Progress value={job.progressPercent} className="min-w-0 flex-1" />
            <span className="w-7 text-right text-[11px] tabular-nums text-sidebar-foreground/70">
              {job.progressPercent}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] leading-3 text-sidebar-foreground/60">
            <span className="truncate">{jobTypeLabels[job.type]}</span>
            <span aria-hidden="true">/</span>
            <span className="shrink-0">{jobStatusLabels[job.status]}</span>
            {progressDetail ? (
              <>
                <span aria-hidden="true">/</span>
                <span className="shrink-0 tabular-nums">{progressDetail}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
