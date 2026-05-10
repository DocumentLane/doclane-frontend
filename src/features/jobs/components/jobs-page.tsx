import Link from "next/link";
import { RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  isOngoingDocumentJob,
  useDocumentJobSummaries,
} from "@/features/jobs/queries/jobs.queries";
import { useRestartDocumentJobMutation } from "@/features/documents/queries/documents.queries";
import type {
  DocumentItem,
  DocumentJobStatus,
  DocumentJobSummary,
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

const statusBadgeVariants: Record<
  DocumentJobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  QUEUED: "outline",
  ACTIVE: "default",
  RETRYING: "secondary",
  COMPLETED: "secondary",
  FAILED: "destructive",
  CANCELLED: "outline",
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

function getMutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function canRestartJob(job: DocumentJobSummary) {
  return (
    (job.type === "PDF_METADATA" || job.type === "PDF_OCR") &&
    (job.status === "FAILED" || job.status === "CANCELLED")
  );
}

export function JobsPage() {
  const { rows, isLoading } = useDocumentJobSummaries();
  const activeJobs = rows.filter(({ job }) =>
    isOngoingDocumentJob(job.status),
  ).length;
  const failedJobs = rows.filter(({ job }) => job.status === "FAILED").length;

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track document processing progress.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <JobMetric label="Total tasks" value={rows.length} />
        <JobMetric label="Active tasks" value={activeJobs} />
        <JobMetric label="Failed tasks" value={failedJobs} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task list</CardTitle>
          <CardDescription>Recent document processing activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading tasks.
            </p>
          ) : rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Done</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ job, document }) => (
                  <JobTableRow key={job.id} document={document} job={job} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tasks to display yet.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function JobTableRow({
  document,
  job,
}: {
  document: DocumentItem;
  job: DocumentJobSummary;
}) {
  const restartJobMutation = useRestartDocumentJobMutation();
  const isRestarting = restartJobMutation.isPending;
  const isRestartable = canRestartJob(job);

  const handleRestart = () => {
    restartJobMutation.mutate(
      {
        documentId: document.id,
        jobId: job.id,
      },
      {
        onSuccess: () => {
          toast.success("Task restarted");
        },
        onError: (error) => {
          toast.error("Restart failed", {
            description: getMutationErrorMessage(error),
          });
        },
      },
    );
  };

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/documents/${document.id}`}
          className="font-medium hover:underline"
        >
          {document.title}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          {document.originalFileName}
        </p>
      </TableCell>
      <TableCell>{jobTypeLabels[job.type]}</TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariants[job.status]}>
          {jobStatusLabels[job.status]}
        </Badge>
        {job.errorMessage ? (
          <p className="mt-1 max-w-56 truncate text-xs text-destructive">
            {job.errorMessage}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="min-w-36">
        <div className="flex items-center gap-2">
          <Progress value={job.progressPercent} className="w-24" />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
            {job.progressPercent}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {formatPages(job)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(job.queuedAt)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(job.completedAt)}
      </TableCell>
      <TableCell className="text-right">
        {isRestartable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={isRestarting}
          >
            <RefreshCcwIcon />
            Restart
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function JobMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "danger" && value > 0 ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
