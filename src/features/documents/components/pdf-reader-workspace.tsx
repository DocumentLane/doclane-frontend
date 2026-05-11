import { ChevronsDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { readUserPreferences } from "@/features/settings/lib/user-preferences";
import type { ReaderViewMode } from "@/features/settings/types/user-preferences.types";
import { useMobileReaderControls } from "../hooks/use-mobile-reader-controls";
import { useMobileReaderGestures } from "../hooks/use-mobile-reader-gestures";
import { usePdfOutline } from "../hooks/use-pdf-outline";
import { usePdfReaderActions } from "../hooks/use-pdf-reader-actions";
import { usePdfViewerController } from "../hooks/use-pdf-viewer-controller";
import { useScreenWakeLock } from "../hooks/use-screen-wake-lock";
import {
  getNextReaderPageNumber,
  getPreviousReaderPageNumber,
  hasNextReaderPage,
  hasPreviousReaderPage,
} from "../lib/page-navigation";
import { useUpdateDocumentReadingPositionMutation } from "../queries/documents.queries";
import type {
  DocumentJobSummary,
  DocumentLinearizationStatus,
} from "../types/document.types";
import { MobileReaderControls } from "./mobile-reader-controls";
import { MobileReaderPageList } from "./mobile-reader-page-list";
import { PdfNotesPanel } from "./pdf-notes-panel";
import { PdfReaderToolbar } from "./pdf-reader-toolbar";
import { PdfThumbnailRail } from "./pdf-thumbnail-rail";
import { PdfViewerStage } from "./pdf-viewer-stage";

interface PdfReaderWorkspaceProps {
  documentId: string;
  title: string;
  originalFileName: string;
  viewUrl: string;
  previewUrl: string | null;
  documentPageCount: number | null;
  initialPageNumber: number;
  linearizationStatus?: DocumentLinearizationStatus;
  jobs: DocumentJobSummary[];
  onBack: () => void;
}

export type PdfViewMode = ReaderViewMode;

export function PdfReaderWorkspace({
  documentId,
  title,
  originalFileName,
  viewUrl,
  previewUrl,
  documentPageCount,
  initialPageNumber,
  linearizationStatus,
  jobs,
  onBack,
}: PdfReaderWorkspaceProps) {
  const isMobile = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastPersistedPageNumberRef = useRef(initialPageNumber);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => readUserPreferences().readerOpenThumbnailsByDefault,
  );
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [notesPanelWidth, setNotesPanelWidth] = useState(360);
  const [isToolbarVisible, setIsToolbarVisible] = useState(
    () => readUserPreferences().readerShowToolbarByDefault,
  );
  const [isMobilePageListOpen, setIsMobilePageListOpen] = useState(false);
  const { mutate: updateReadingPosition } =
    useUpdateDocumentReadingPositionMutation();
  const {
    containerRef,
    viewerRef,
    currentPageRef,
    scaleRef,
    activePdfDocument,
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
    handleSearch,
    handleViewModeChange,
  } = usePdfViewerController({
    viewUrl,
    documentPageCount,
    initialPageNumber,
    isMobile,
  });
  const { outlineItems, isLoadingOutline } = usePdfOutline(activePdfDocument);
  const displayedCurrentPage = isReady ? currentPage : 1;
  const isShowingPreviewPage = Boolean(previewUrl) && !isViewerReadyForDisplay;
  const canGoToPreviousPage = hasPreviousReaderPage(displayedCurrentPage, viewMode);
  const canGoToNextPage = hasNextReaderPage(
    displayedCurrentPage,
    pageCount,
    viewMode,
  );
  const { areControlsVisible: areMobileControlsVisible, revealControls } =
    useMobileReaderControls({
      isMobile,
      isPageListOpen: isMobilePageListOpen,
    });
  const {
    bookmarkedPages,
    bookmarkedPageSet,
    notes,
    notedPages,
    notedPageSet,
    isDownloading,
    isSavingNote,
    isDeletingNote,
    toggleCurrentPageBookmark,
    downloadPdf,
    saveNote,
    deleteNote,
  } = usePdfReaderActions({
    documentId,
    title,
    originalFileName,
    currentPage,
    shouldLoadNotes: isSidebarOpen || isNotesPanelOpen || isMobilePageListOpen,
  });

  useScreenWakeLock(isReady);

  useEffect(() => {
    lastPersistedPageNumberRef.current = initialPageNumber;
  }, [documentId, initialPageNumber]);

  useEffect(
    () => () => {
      const latestPage = currentPageRef.current;

      if (latestPage === lastPersistedPageNumberRef.current) {
        return;
      }

      lastPersistedPageNumberRef.current = latestPage;
      updateReadingPosition({ documentId, pageNumber: latestPage });
    },
    [currentPageRef, documentId, updateReadingPosition],
  );

  useEffect(() => {
    if (!isReady || currentPage === lastPersistedPageNumberRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastPersistedPageNumberRef.current = currentPage;
      updateReadingPosition({ documentId, pageNumber: currentPage });
    }, 800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentPage, documentId, isReady, updateReadingPosition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsToolbarVisible(true);
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
        return;
      }

      if (!isReady || isEditableTarget) {
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setIsToolbarVisible((value) => !value);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        handlePageChange(
          getPreviousReaderPageNumber(currentPage, pageCount, viewMode),
        );
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        handlePageChange(getNextReaderPageNumber(currentPage, pageCount, viewMode));
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        handlePageChange(1);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        handlePageChange(pageCount);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        handleScaleChange("in");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "-") {
        event.preventDefault();
        handleScaleChange("out");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentPage,
    handlePageChange,
    handleScaleChange,
    isReady,
    pageCount,
    viewMode,
  ]);

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

  const handleMobilePageListPageChange = (pageNumber: number) => {
    handlePageChange(pageNumber);
    setIsMobilePageListOpen(false);
    revealControls();
  };

  if (failedViewUrl === viewUrl) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Alert variant="destructive">
          <AlertTitle>PDF failed to load</AlertTitle>
          <AlertDescription>
            The file link may have expired, or the PDF cannot be read.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main
      className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground"
      onPointerDown={isMobile ? undefined : revealControls}
    >
      {isToolbarVisible && (!isMobile || areMobileControlsVisible) ? (
        <div className={isMobile ? "absolute inset-x-0 top-0 z-20 md:relative" : undefined}>
          <PdfReaderToolbar
            title={title}
            jobs={jobs}
            currentPage={displayedCurrentPage}
            pageCount={pageCount}
            scale={scale}
            searchQuery={searchQuery}
            isReady={isReady}
            hasVisiblePage={isReady || isShowingPreviewPage}
            isSidebarOpen={isSidebarOpen}
            isNotesPanelOpen={isNotesPanelOpen}
            searchInputRef={searchInputRef}
            viewMode={viewMode}
            linearizationStatus={linearizationStatus}
            loadingProgressPercent={loadingProgressPercent}
            isCurrentPageBookmarked={bookmarkedPageSet.has(displayedCurrentPage)}
            hasCurrentPageNote={notedPageSet.has(displayedCurrentPage)}
            onBack={onBack}
            isDownloading={isDownloading}
            onHideToolbar={() => setIsToolbarVisible(false)}
            onToggleSidebar={() => setIsSidebarOpen((value) => !value)}
            onToggleNotesPanel={() => setIsNotesPanelOpen((value) => !value)}
            onToggleBookmark={toggleCurrentPageBookmark}
            onDownload={downloadPdf}
            onPageChange={handlePageChange}
            onScaleChange={handleScaleChange}
            onScaleValueChange={handleScaleValueChange}
            onViewModeChange={handleViewModeChange}
            onSearchQueryChange={setSearchQuery}
            onSearch={() => handleSearch(searchQuery)}
          />
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1">
        {!isToolbarVisible ? (
          <div className="absolute right-4 top-4 z-20">
            <Button
              variant="secondary"
              size="icon"
              className="size-10 rounded-full border border-border bg-background/90 shadow-lg backdrop-blur hover:bg-background"
              onClick={() => setIsToolbarVisible(true)}
              aria-label="Show top toolbar"
            >
              <ChevronsDownIcon />
            </Button>
          </div>
        ) : null}
        <PdfThumbnailRail
          pdfDocument={activePdfDocument}
          currentPage={currentPage}
          bookmarkedPages={bookmarkedPages}
          notedPages={notedPages}
          outlineItems={outlineItems}
          isLoadingOutline={isLoadingOutline}
          isOpen={isSidebarOpen}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          onPageChange={handlePageChange}
        />
        <PdfViewerStage
          containerRef={containerRef}
          viewerRef={viewerRef}
          isLoaded={isReady}
          isViewerReadyForDisplay={isViewerReadyForDisplay}
          previewUrl={previewUrl}
          title={title}
        />
        {isNotesPanelOpen ? (
          <PdfNotesPanel
            documentId={documentId}
            currentPage={displayedCurrentPage}
            notes={notes}
            isReady={isReady}
            isSaving={isSavingNote}
            isDeleting={isDeletingNote}
            width={notesPanelWidth}
            onWidthChange={setNotesPanelWidth}
            onClose={() => setIsNotesPanelOpen(false)}
            onSaveNote={saveNote}
            onDeleteNote={deleteNote}
          />
        ) : null}
      </div>
      {isMobile && areMobileControlsVisible ? (
        <MobileReaderControls
          currentPage={displayedCurrentPage}
          pageCount={pageCount}
          isReady={isReady}
          isBookmarked={bookmarkedPageSet.has(displayedCurrentPage)}
          hasNote={notedPageSet.has(displayedCurrentPage)}
          isNotesPanelOpen={isNotesPanelOpen}
          canGoToPreviousPage={canGoToPreviousPage}
          canGoToNextPage={canGoToNextPage}
          onPreviousPage={() =>
            handlePageChange(
              getPreviousReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
            )
          }
          onNextPage={() =>
            handlePageChange(
              getNextReaderPageNumber(displayedCurrentPage, pageCount, viewMode),
            )
          }
          onToggleBookmark={toggleCurrentPageBookmark}
          onToggleNotesPanel={() => setIsNotesPanelOpen((value) => !value)}
          onOpenPageList={() => setIsMobilePageListOpen(true)}
        />
      ) : null}
      {isMobile ? (
        <MobileReaderPageList
          open={isMobilePageListOpen}
          pageCount={pageCount}
          currentPage={displayedCurrentPage}
          bookmarkedPages={bookmarkedPages}
          bookmarkedPageSet={bookmarkedPageSet}
          notedPageSet={notedPageSet}
          outlineItems={outlineItems}
          isLoadingOutline={isLoadingOutline}
          onOpenChange={setIsMobilePageListOpen}
          onPageChange={handleMobilePageListPageChange}
        />
      ) : null}
    </main>
  );
}
