import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Rows3Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileReaderControls } from "../hooks/use-mobile-reader-controls";
import { useMobileReaderGestures } from "../hooks/use-mobile-reader-gestures";
import { usePdfViewerController } from "../hooks/use-pdf-viewer-controller";
import { useScreenWakeLock } from "../hooks/use-screen-wake-lock";
import {
  getNextReaderPageNumber,
  getPreviousReaderPageNumber,
  hasNextReaderPage,
  hasPreviousReaderPage,
} from "../lib/page-navigation";
import type { DocumentLinearizationStatus } from "../types/document.types";
import { PdfViewerStage } from "./pdf-viewer-stage";

interface PublicPdfReaderWorkspaceProps {
  title: string;
  viewUrl: string;
  previewUrl: string | null;
  documentPageCount: number | null;
  linearizationStatus?: DocumentLinearizationStatus;
}

export function PublicPdfReaderWorkspace({
  title,
  viewUrl,
  previewUrl,
  documentPageCount,
  linearizationStatus,
}: PublicPdfReaderWorkspaceProps) {
  const isMobile = useIsMobile();
  const {
    containerRef,
    viewerRef,
    currentPageRef,
    scaleRef,
    currentPage,
    failedViewUrl,
    isReady,
    isViewerReadyForDisplay,
    loadingProgressPercent,
    pageCount,
    scale,
    viewMode,
    handlePageChange,
    handleScaleChange,
    handleScaleValueChange,
    handleViewModeChange,
  } = usePdfViewerController({
    viewUrl,
    documentPageCount,
    initialPageNumber: 1,
    isMobile,
  });
  const { areControlsVisible: areMobileControlsVisible, revealControls } =
    useMobileReaderControls({
      isMobile,
      isPageListOpen: false,
    });
  const displayedCurrentPage = isReady ? currentPage : 1;
  const isShowingPreviewPage = Boolean(previewUrl) && !isViewerReadyForDisplay;
  const canShowPagePosition = (isReady || isShowingPreviewPage) && pageCount > 0;
  const shouldShowLoadingProgress = !isReady && loadingProgressPercent !== null;
  const canGoToPreviousPage = hasPreviousReaderPage(displayedCurrentPage, viewMode);
  const canGoToNextPage = hasNextReaderPage(
    displayedCurrentPage,
    pageCount,
    viewMode,
  );

  useScreenWakeLock(isReady);
  useMobileReaderGestures({
    containerRef,
    isMobile,
    isReady,
    pageCount,
    currentPageRef,
    getScale: () => scaleRef.current,
    setScale: handleScaleValueChange,
    onPageChange: handlePageChange,
    onInteraction: revealControls,
  });

  if (failedViewUrl === viewUrl) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">PDF failed to load.</p>
      </main>
    );
  }

  return (
    <main
      className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground"
      onPointerDown={isMobile ? undefined : revealControls}
    >
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur md:h-14 md:px-4">
        {shouldShowLoadingProgress ? (
          <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-border">
            <div
              className="h-full bg-primary transition-[width] duration-150 ease-linear"
              style={{ width: `${loadingProgressPercent}%` }}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {linearizationStatus === "PENDING" ||
            linearizationStatus === "PROCESSING"
              ? "Optimizing PDF"
              : "Public read-only PDF"}
          </p>
        </div>
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
              onValueChange={(value) =>
                handleViewModeChange(
                  value as "continuous-scroll" | "single-page" | "two-pages",
                )
              }
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
        <div className="hidden items-center gap-1 md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handlePageChange(
                getPreviousReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
              )
            }
            disabled={!isReady || !canGoToPreviousPage}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="w-24 text-center text-xs tabular-nums text-muted-foreground">
            {canShowPagePosition ? `${displayedCurrentPage} / ${pageCount}` : "Loading"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handlePageChange(
                getNextReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
              )
            }
            disabled={!isReady || !canGoToNextPage}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleScaleChange("out")}
            disabled={!isReady || scale <= 0.5}
            aria-label="Zoom out"
          >
            <ZoomOutIcon />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleScaleChange("in")}
            disabled={!isReady || scale >= 2.5}
            aria-label="Zoom in"
          >
            <ZoomInIcon />
          </Button>
        </div>
      </header>
      <PdfViewerStage
        containerRef={containerRef}
        viewerRef={viewerRef}
        isLoaded={isReady}
        isViewerReadyForDisplay={isViewerReadyForDisplay}
        previewUrl={previewUrl}
        title={title}
      />
      {isMobile && areMobileControlsVisible ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handlePageChange(
                getPreviousReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
              )
            }
            disabled={!isReady || !canGoToPreviousPage}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-0 flex-1 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {canShowPagePosition ? `${displayedCurrentPage} / ${pageCount}` : "Loading"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handlePageChange(
                getNextReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
              )
            }
            disabled={!isReady || !canGoToNextPage}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      ) : null}
    </main>
  );
}
