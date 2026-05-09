import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DocumentJobStatus,
  DocumentJobSummary,
  DocumentJobType,
} from "../types/document.types";

interface DocumentJobsTableProps {
  jobs: DocumentJobSummary[];
}

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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPages(job: DocumentJobSummary): string {
  if (job.totalPages === null) {
    return "-";
  }

  if (job.currentPageNumber === null) {
    return `${job.completedPages}/${job.totalPages}`;
  }

  return `${job.completedPages}/${job.totalPages} · p.${job.currentPageNumber}`;
}

export function DocumentJobsTable({ jobs }: DocumentJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-muted-foreground">
        No processing tasks yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 text-xs">Task</TableHead>
          <TableHead className="h-8 text-xs">State</TableHead>
          <TableHead className="h-8 text-xs">Progress</TableHead>
          <TableHead className="h-8 text-xs">Pages</TableHead>
          <TableHead className="h-8 text-xs">Started</TableHead>
          <TableHead className="h-8 text-xs">Done</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="py-2 text-xs font-medium">
              {jobTypeLabels[job.type]}
            </TableCell>
            <TableCell className="py-2 text-xs">
              {jobStatusLabels[job.status]}
            </TableCell>
            <TableCell className="min-w-32 py-2">
              <div className="flex items-center gap-2">
                <Progress value={job.progressPercent} className="w-24" />
                <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                  {job.progressPercent}%
                </span>
              </div>
            </TableCell>
            <TableCell className="py-2 text-xs tabular-nums">
              {formatPages(job)}
            </TableCell>
            <TableCell className="py-2 text-xs text-muted-foreground">
              {formatDateTime(job.queuedAt)}
            </TableCell>
            <TableCell className="py-2 text-xs text-muted-foreground">
              {formatDateTime(job.completedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
