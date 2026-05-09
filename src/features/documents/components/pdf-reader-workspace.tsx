import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { ChevronsDownIcon } from "lucide-react";
import {
  EventBus,
  PDFFindController,
  PDFLinkService,
  PDFViewer as PdfJsViewer,
  ScrollMode,
  SpreadMode,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { readUserPreferences } from "@/features/settings/lib/user-preferences";
import type { ReaderViewMode } from "@/features/settings/types/user-preferences.types";
import {
  useDocumentBookmarksQuery,
  useDeleteDocumentNoteMutation,
  useDownloadDocumentPdfMutation,
  useDocumentNotesQuery,
  useSaveDocumentNoteMutation,
  useToggleDocumentBookmarkMutation,
  useUpdateDocumentReadingPositionMutation,
} from "../queries/documents.queries";
import type {
  DocumentJobSummary,
  DocumentLinearizationStatus,
} from "../types/document.types";
import { getPdfDownloadFileName, saveBlobAsFile } from "../lib/pdf-download";
import { PdfReaderToolbar } from "./pdf-reader-toolbar";
import { PdfNotesPanel } from "./pdf-notes-panel";
import { PdfThumbnailRail } from "./pdf-thumbnail-rail";
import { PdfViewerStage } from "./pdf-viewer-stage";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const PDF_RANGE_CHUNK_SIZE = 1024 * 1024;

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

interface PageChangingEvent {
  pageNumber: number;
}

interface ScaleChangingEvent {
  scale: number;
}

interface PageRenderedEvent {
  cssTransform?: boolean;
  error?: unknown;
  isDetailView?: boolean;
}

interface PdfLoadingProgress {
  loaded: number;
  total: number;
}

interface ViewerState {
  pdfViewer: PdfJsViewer;
  eventBus: EventBus;
}

export type PdfViewMode = ReaderViewMode;

function applyReaderViewMode(
  pdfViewer: PdfJsViewer,
  nextViewMode: ReaderViewMode,
) {
  if (nextViewMode === "continuous-scroll") {
    pdfViewer.scrollMode = ScrollMode.VERTICAL;
    pdfViewer.spreadMode = SpreadMode.NONE;
    return;
  }

  if (nextViewMode === "single-page") {
    pdfViewer.scrollMode = ScrollMode.PAGE;
    pdfViewer.spreadMode = SpreadMode.NONE;
    return;
  }

  pdfViewer.scrollMode = ScrollMode.VERTICAL;
  pdfViewer.spreadMode = SpreadMode.ODD;
}

function clampPageNumber(pageNumber: number, pageCount: number) {
  if (pageCount < 1) {
    return 1;
  }

  return Math.min(pageCount, Math.max(1, pageNumber));
}

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const viewerStateRef = useRef<ViewerState | null>(null);
  const lastWheelPageChangeAtRef = useRef(0);
  const initialPageNumberRef = useRef(initialPageNumber);
  const currentPageRef = useRef(initialPageNumber);
  const hasLoadedDocumentRef = useRef(false);
  const lastPersistedPageNumberRef = useRef(initialPageNumber);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [failedViewUrl, setFailedViewUrl] = useState<string | null>(null);
  const [loadedViewUrl, setLoadedViewUrl] = useState<string | null>(null);
  const [loadingProgressPercent, setLoadingProgressPercent] = useState<number | null>(
    null,
  );
  const [isViewerReadyForDisplay, setIsViewerReadyForDisplay] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => readUserPreferences().readerOpenThumbnailsByDefault,
  );
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [notesPanelWidth, setNotesPanelWidth] = useState(360);
  const [isToolbarVisible, setIsToolbarVisible] = useState(
    () => readUserPreferences().readerShowToolbarByDefault,
  );
  const [viewMode, setViewMode] = useState<PdfViewMode>(
    () => readUserPreferences().readerDefaultViewMode,
  );
  const bookmarksQuery = useDocumentBookmarksQuery(documentId);
  const notesQuery = useDocumentNotesQuery(documentId);
  const downloadDocumentPdfMutation = useDownloadDocumentPdfMutation();
  const toggleBookmarkMutation = useToggleDocumentBookmarkMutation();
  const saveNoteMutation = useSaveDocumentNoteMutation();
  const deleteNoteMutation = useDeleteDocumentNoteMutation();
  const { mutate: updateReadingPosition } =
    useUpdateDocumentReadingPositionMutation();

  useEffect(() => {
    initialPageNumberRef.current = initialPageNumber;
    currentPageRef.current = initialPageNumber;
    lastPersistedPageNumberRef.current = initialPageNumber;
  }, [documentId, initialPageNumber]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(
    () => () => {
      const latestPage = currentPageRef.current;

      if (latestPage === lastPersistedPageNumberRef.current) {
        return;
      }

      lastPersistedPageNumberRef.current = latestPage;
      updateReadingPosition({ documentId, pageNumber: latestPage });
    },
    [documentId, updateReadingPosition],
  );

  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;

    if (!container || !viewer) {
      return;
    }

    let cancelled = false;
    const restorePageNumber = hasLoadedDocumentRef.current
      ? currentPageRef.current
      : initialPageNumberRef.current;

    setIsViewerReadyForDisplay(false);
    setLoadingProgressPercent(null);
    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });
    const findController = new PDFFindController({ eventBus, linkService });
    const pdfViewer = new PdfJsViewer({
      container,
      viewer,
      eventBus,
      linkService,
      findController,
      maxCanvasPixels: -1,
      maxCanvasDim: -1,
      capCanvasAreaFactor: -1,
      enableDetailCanvas: false,
      removePageBorders: false,
    });
    const loadingTask = getDocument({
      url: viewUrl,
      disableRange: false,
      disableAutoFetch: true,
      enableHWA: true,
      rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
      wasmUrl: "/pdfjs/wasm/",
    });
    loadingTask.onProgress = ({ loaded, total }: PdfLoadingProgress) => {
      if (cancelled || total <= 0) {
        return;
      }

      setLoadingProgressPercent(
        Math.min(99, Math.max(0, Math.round((loaded / total) * 100))),
      );
    };
    const handlePageChanging = (event: PageChangingEvent) => {
      setCurrentPage(event.pageNumber);
    };
    const handleScaleChanging = (event: ScaleChangingEvent) => {
      setScale(event.scale);
    };
    const handleViewerReadyForDisplay = (event?: PageRenderedEvent) => {
      if (event?.cssTransform || event?.isDetailView || event?.error) {
        return;
      }

      setIsViewerReadyForDisplay(true);
    };
    const handlePagesInit = () => {
      const preferences = readUserPreferences();

      applyReaderViewMode(pdfViewer, preferences.readerDefaultViewMode);
      pdfViewer.currentScaleValue = "page-fit";
      const restoredPage = clampPageNumber(restorePageNumber, pdfViewer.pagesCount);

      pdfViewer.currentPageNumber = restoredPage;
      setCurrentPage(restoredPage);
      setViewMode(preferences.readerDefaultViewMode);
      setScale(pdfViewer.currentScale || 1);
    };

    linkService.setViewer(pdfViewer);
    eventBus.on("pagechanging", handlePageChanging);
    eventBus.on("scalechanging", handleScaleChanging);
    eventBus.on("pagesinit", handlePagesInit);
    eventBus.on("pagerendered", handleViewerReadyForDisplay);

    loadingTask.promise
      .then((loadedDocument) => {
        if (cancelled) {
          void loadedDocument.destroy();
          return;
        }

        setFailedViewUrl(null);
        setLoadingProgressPercent(100);
        setCurrentPage(clampPageNumber(restorePageNumber, loadedDocument.numPages));
        setLoadedViewUrl(viewUrl);
        pdfViewer.setDocument(loadedDocument);
        linkService.setDocument(loadedDocument);
        findController.setDocument(loadedDocument);
        viewerStateRef.current = {
          pdfViewer,
          eventBus,
        };
        setPdfDocument(loadedDocument);
        hasLoadedDocumentRef.current = true;
      })
      .catch(() => {
        if (!cancelled) {
          setFailedViewUrl(viewUrl);
          setLoadingProgressPercent(null);
        }
      });

    return () => {
      cancelled = true;
      eventBus.off("pagechanging", handlePageChanging);
      eventBus.off("scalechanging", handleScaleChanging);
      eventBus.off("pagesinit", handlePagesInit);
      eventBus.off("pagerendered", handleViewerReadyForDisplay);
      viewerStateRef.current = null;
      setPdfDocument(null);
      setLoadingProgressPercent(null);
      setIsViewerReadyForDisplay(false);
      void loadingTask.destroy();
      pdfViewer.cleanup();
      viewer.replaceChildren();
    };
  }, [viewUrl]);

  const activePdfDocument = loadedViewUrl === viewUrl ? pdfDocument : null;
  const pageCount = activePdfDocument?.numPages ?? documentPageCount ?? 0;
  const isReady = Boolean(activePdfDocument);
  const isShowingPreviewPage = Boolean(previewUrl) && !isViewerReadyForDisplay;
  const displayedCurrentPage = isReady ? currentPage : 1;
  const bookmarkedPages =
    bookmarksQuery.data?.map((bookmark) => bookmark.pageNumber) ?? [];
  const notes = notesQuery.data ?? [];
  const notedPages = notes.map((note) => note.pageNumber);

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

  const handlePageChange = (pageNumber: number) => {
    const viewerState = viewerStateRef.current;

    if (!viewerState) {
      return;
    }

    viewerState.pdfViewer.currentPageNumber = pageNumber;
  };

  const handleScaleChange = (direction: "in" | "out") => {
    const viewerState = viewerStateRef.current;

    if (!viewerState) {
      return;
    }

    const currentScale = viewerState.pdfViewer.currentScale || 1;
    const nextScale =
      direction === "in"
        ? Math.min(2.5, currentScale + 0.1)
        : Math.max(0.5, currentScale - 0.1);

    viewerState.pdfViewer.currentScale = nextScale;
    setScale(nextScale);
  };

  const handleScaleValueChange = (nextScale: number) => {
    const viewerState = viewerStateRef.current;

    if (!viewerState) {
      return;
    }

    const clampedScale = Math.min(2.5, Math.max(0.5, nextScale));

    viewerState.pdfViewer.currentScale = clampedScale;
    setScale(clampedScale);
  };

  const handleSearch = () => {
    const viewerState = viewerStateRef.current;

    if (!viewerState || searchQuery.length === 0) {
      return;
    }

    viewerState.eventBus.dispatch("find", {
      source: window,
      type: "",
      query: searchQuery,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });
  };

  const handleToggleBookmark = () => {
    if (!isReady) {
      return;
    }

    toggleBookmarkMutation.mutate({
      documentId,
      pageNumber: currentPage,
      isBookmarked: bookmarkedPages.includes(currentPage),
    });
  };

  const handleDownload = () => {
    downloadDocumentPdfMutation.mutate(documentId, {
      onSuccess: (blob) => {
        saveBlobAsFile(blob, getPdfDownloadFileName({ title, originalFileName }));
        toast.success("PDF download started");
      },
      onError: (error) => {
        toast.error("Download failed", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      },
    });
  };

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
        const pageStep = viewMode === "two-pages" ? 2 : 1;

        handlePageChange(Math.max(1, currentPage - pageStep));
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        const pageStep = viewMode === "two-pages" ? 2 : 1;

        handlePageChange(Math.min(pageCount, currentPage + pageStep));
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
  }, [currentPage, isReady, pageCount, viewMode]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !isReady || viewMode !== "single-page") {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < 8) {
        return;
      }

      event.preventDefault();

      const now = Date.now();

      if (now - lastWheelPageChangeAtRef.current < 260) {
        return;
      }

      const nextPage =
        event.deltaY > 0
          ? Math.min(pageCount, currentPage + 1)
          : Math.max(1, currentPage - 1);

      if (nextPage === currentPage) {
        return;
      }

      lastWheelPageChangeAtRef.current = now;
      handlePageChange(nextPage);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [currentPage, isReady, pageCount, viewMode]);

  const handleViewModeChange = (nextViewMode: PdfViewMode) => {
    const viewerState = viewerStateRef.current;

    setViewMode(nextViewMode);

    if (!viewerState) {
      return;
    }

    applyReaderViewMode(viewerState.pdfViewer, nextViewMode);
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
    <main className="flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {isToolbarVisible ? (
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
          isCurrentPageBookmarked={bookmarkedPages.includes(displayedCurrentPage)}
          hasCurrentPageNote={notedPages.includes(displayedCurrentPage)}
          onBack={onBack}
          isDownloading={downloadDocumentPdfMutation.isPending}
          onHideToolbar={() => setIsToolbarVisible(false)}
          onToggleSidebar={() => setIsSidebarOpen((value) => !value)}
          onToggleNotesPanel={() => setIsNotesPanelOpen((value) => !value)}
          onToggleBookmark={handleToggleBookmark}
          onDownload={handleDownload}
          onPageChange={handlePageChange}
          onScaleChange={handleScaleChange}
          onScaleValueChange={handleScaleValueChange}
          onViewModeChange={handleViewModeChange}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
        />
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
          isOpen={isSidebarOpen}
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
            isSaving={saveNoteMutation.isPending}
            isDeleting={deleteNoteMutation.isPending}
            width={notesPanelWidth}
            onWidthChange={setNotesPanelWidth}
            onSaveNote={saveNoteMutation.mutate}
            onDeleteNote={deleteNoteMutation.mutate}
          />
        ) : null}
      </div>
    </main>
  );
}
