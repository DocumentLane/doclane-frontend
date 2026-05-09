import {
  ArrowLeftIcon,
  BookmarkIcon,
  BookmarkCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpIcon,
  DownloadIcon,
  PanelLeftIcon,
  SearchIcon,
  Rows3Icon,
  ZoomInIcon,
  ZoomOutIcon,
  StickyNoteIcon,
} from "lucide-react";
import { FormEvent } from "react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { PdfViewMode } from "./pdf-reader-workspace";
import type {
  DocumentJobStatus,
  DocumentJobSummary,
  DocumentJobType,
  DocumentLinearizationStatus,
} from "../types/document.types";

interface PdfReaderToolbarProps {
  title: string;
  jobs: DocumentJobSummary[];
  currentPage: number;
  pageCount: number;
  scale: number;
  viewMode: PdfViewMode;
  linearizationStatus?: DocumentLinearizationStatus;
  loadingProgressPercent: number | null;
  searchQuery: string;
  isReady: boolean;
  isDownloading: boolean;
  hasVisiblePage: boolean;
  isSidebarOpen: boolean;
  isNotesPanelOpen: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isCurrentPageBookmarked: boolean;
  hasCurrentPageNote: boolean;
  onBack: () => void;
  onHideToolbar: () => void;
  onToggleSidebar: () => void;
  onToggleNotesPanel: () => void;
  onToggleBookmark: () => void;
  onDownload: () => void;
  onPageChange: (pageNumber: number) => void;
  onScaleChange: (direction: "in" | "out") => void;
  onScaleValueChange: (scale: number) => void;
  onViewModeChange: (viewMode: PdfViewMode) => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
}

const jobTypeLabels: Record<DocumentJobType, string> = {
  PDF_METADATA: "Metadata",
  PDF_PAGE_DERIVATIVE: "Pages",
  PDF_OCR: "Text recognition",
};

const toolbarJobTypeLabels: Record<DocumentJobType, string> = {
  PDF_METADATA: "Meta",
  PDF_PAGE_DERIVATIVE: "Pages",
  PDF_OCR: "OCR",
};

const jobStatusLabels: Record<DocumentJobStatus, string> = {
  QUEUED: "Waiting",
  ACTIVE: "Running",
  RETRYING: "Retrying",
  COMPLETED: "Complete",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const jobStatusBadgeVariants: Record<
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

const ongoingJobStatuses = new Set<DocumentJobStatus>([
  "QUEUED",
  "ACTIVE",
  "RETRYING",
]);

function getSortedToolbarJobs(jobs: DocumentJobSummary[]) {
  return jobs
    .filter((job) => job.status === "FAILED" || ongoingJobStatuses.has(job.status))
    .sort((first, second) => {
      const firstPriority =
        first.status === "FAILED" ? 0 : ongoingJobStatuses.has(first.status) ? 1 : 2;
      const secondPriority =
        second.status === "FAILED" ? 0 : ongoingJobStatuses.has(second.status) ? 1 : 2;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      return (
        new Date(second.queuedAt).getTime() - new Date(first.queuedAt).getTime()
      );
    });
}

function DocumentJobBadges({ jobs }: { jobs: DocumentJobSummary[] }) {
  const toolbarJobs = getSortedToolbarJobs(jobs);

  if (toolbarJobs.length === 0) {
    return null;
  }

  const visibleJobs = toolbarJobs.slice(0, 2);
  const hiddenJobCount = toolbarJobs.length - visibleJobs.length;

  return (
    <div className="hidden min-w-0 items-center gap-1 self-center sm:flex">
      {visibleJobs.map((job) => (
        <Badge
          key={job.id}
          variant={jobStatusBadgeVariants[job.status]}
          className="h-5 shrink-0 px-1.5 leading-none"
          title={`${jobTypeLabels[job.type]} ${jobStatusLabels[job.status]}`}
        >
          {toolbarJobTypeLabels[job.type]} {jobStatusLabels[job.status]}
        </Badge>
      ))}
      {hiddenJobCount > 0 ? (
        <Badge
          variant="outline"
          className="h-5 shrink-0 px-1.5 leading-none"
          title={`${hiddenJobCount} more tasks`}
        >
          +{hiddenJobCount}
        </Badge>
      ) : null}
    </div>
  );
}

function LinearizationBadge({
  status,
}: {
  status?: DocumentLinearizationStatus;
}) {
  if (status !== "PENDING" && status !== "PROCESSING") {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="hidden h-5 shrink-0 px-1.5 leading-none sm:inline-flex"
      title="Optimizing PDF for faster range loading"
    >
      Optimizing PDF
    </Badge>
  );
}

export function PdfReaderToolbar({
  title,
  jobs,
  currentPage,
  pageCount,
  scale,
  viewMode,
  linearizationStatus,
  loadingProgressPercent,
  searchQuery,
  isReady,
  isDownloading,
  hasVisiblePage,
  isSidebarOpen,
  isNotesPanelOpen,
  searchInputRef,
  isCurrentPageBookmarked,
  hasCurrentPageNote,
  onBack,
  onHideToolbar,
  onToggleSidebar,
  onToggleNotesPanel,
  onToggleBookmark,
  onDownload,
  onPageChange,
  onScaleChange,
  onScaleValueChange,
  onViewModeChange,
  onSearchQueryChange,
  onSearch,
}: PdfReaderToolbarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  const commitPageInput = (input: HTMLInputElement) => {
    const parsedPageNumber = Number.parseInt(input.value, 10);

    if (!Number.isFinite(parsedPageNumber) || pageCount < 1) {
      input.value = String(currentPage);
      return;
    }

    const nextPageNumber = Math.min(pageCount, Math.max(1, parsedPageNumber));
    input.value = String(nextPageNumber);
    onPageChange(nextPageNumber);
  };

  const commitScaleInput = (input: HTMLInputElement) => {
    const parsedScalePercent = Number.parseInt(input.value, 10);

    if (!Number.isFinite(parsedScalePercent)) {
      input.value = String(Math.round(scale * 100));
      return;
    }

    const nextScalePercent = Math.min(250, Math.max(50, parsedScalePercent));
    input.value = String(nextScalePercent);
    onScaleValueChange(nextScalePercent / 100);
  };

  const shouldShowLoadingProgress = !isReady && loadingProgressPercent !== null;
  const canShowPagePosition = hasVisiblePage && pageCount > 0;

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      {shouldShowLoadingProgress ? (
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-linear"
            style={{ width: `${loadingProgressPercent}%` }}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to document list"
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          variant={isSidebarOpen ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleSidebar}
          aria-label="Toggle thumbnail sidebar"
        >
          <PanelLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onHideToolbar}
          aria-label="Hide top toolbar"
        >
          <ChevronsUpIcon />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-h-5 min-w-0 items-center gap-2">
          <h1 className="min-w-0 truncate text-sm font-semibold leading-5">{title}</h1>
          <DocumentJobBadges jobs={jobs} />
          <LinearizationBadge status={linearizationStatus} />
        </div>
        <div className="flex h-4 min-w-0 items-center gap-2">
          <p className="shrink-0 text-xs text-muted-foreground">
            {canShowPagePosition ? `Page ${currentPage} of ${pageCount}` : "Loading"}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={!isReady || currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="flex min-w-24 items-center justify-center gap-1 text-xs tabular-nums text-muted-foreground">
          {canShowPagePosition ? (
            <>
              <Input
                key={currentPage}
                type="number"
                min={1}
                max={pageCount}
                defaultValue={currentPage}
                onBlur={(event) => commitPageInput(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    event.currentTarget.value = String(currentPage);
                    event.currentTarget.blur();
                  }
                }}
                disabled={!isReady}
                aria-label="Current page"
                className="h-7 w-12 px-1 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span>/ {pageCount}</span>
            </>
          ) : (
            "- / -"
          )}
        </span>
        <Button
          variant={isCurrentPageBookmarked ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleBookmark}
          disabled={!isReady}
          aria-label={
            isCurrentPageBookmarked
              ? "Remove bookmark from current page"
              : "Bookmark current page"
          }
        >
          {isCurrentPageBookmarked ? <BookmarkCheckIcon /> : <BookmarkIcon />}
        </Button>
        <Button
          variant={isNotesPanelOpen || hasCurrentPageNote ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleNotesPanel}
          disabled={!isReady}
          aria-label="Toggle page notes"
        >
          <StickyNoteIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={!isReady || currentPage >= pageCount}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          disabled={!isReady || isDownloading}
          aria-label="Download PDF"
        >
          <DownloadIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={!isReady}
                aria-label="View options"
              >
                <Rows3Icon />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={viewMode}
              onValueChange={(value) => onViewModeChange(value as PdfViewMode)}
            >
              <DropdownMenuRadioItem value="continuous-scroll">
                Continuous Scroll
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="single-page">
                Single Page
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="two-pages">
                Two Pages
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onScaleChange("out")}
          disabled={!isReady}
          aria-label="Zoom out"
        >
          <ZoomOutIcon />
        </Button>
        <span className="hidden min-w-16 items-center justify-center gap-1 text-xs tabular-nums text-muted-foreground sm:flex">
          <Input
            key={Math.round(scale * 100)}
            type="number"
            min={50}
            max={250}
            step={10}
            defaultValue={Math.round(scale * 100)}
            onBlur={(event) => commitScaleInput(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                event.currentTarget.value = String(Math.round(scale * 100));
                event.currentTarget.blur();
              }
            }}
            disabled={!isReady}
            aria-label="Zoom percentage"
            className="h-7 w-12 px-1 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span>%</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onScaleChange("in")}
          disabled={!isReady}
          aria-label="Zoom in"
        >
          <ZoomInIcon />
        </Button>
      </div>

      <div className="hidden lg:block">
        <Separator orientation="vertical" />
      </div>

      <form className="hidden w-64 items-center gap-2 lg:flex" onSubmit={handleSubmit}>
        <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search"
          disabled={!isReady}
        />
      </form>
    </header>
  );
}
