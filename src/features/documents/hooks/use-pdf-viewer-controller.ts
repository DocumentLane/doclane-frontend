import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import {
  EventBus,
  PDFFindController,
  PDFLinkService,
  PDFViewer as PdfJsViewer,
  ScrollMode,
  SpreadMode,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { readUserPreferences } from "@/features/settings/lib/user-preferences";
import type { ReaderViewMode } from "@/features/settings/types/user-preferences.types";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const PDF_RANGE_CHUNK_SIZE = 1024 * 1024;
const MIN_READER_SCALE = 0.5;
const MAX_READER_SCALE = 2.5;
const MOBILE_MAX_CANVAS_PIXELS = 12_000_000;
const MOBILE_MAX_CANVAS_DIM = 4096;
const MOBILE_CANVAS_AREA_FACTOR = 2;
const MOBILE_VIEWER_PADDING_X = 0;
const MOBILE_VIEWER_PADDING_Y = 12;
const DESKTOP_VIEWER_PADDING_X = 32;
const DESKTOP_VIEWER_PADDING_Y = 24;
const DESKTOP_BREAKPOINT_WIDTH = 768;

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

interface UsePdfViewerControllerInput {
  viewUrl: string;
  documentPageCount: number | null;
  initialPageNumber: number;
  isMobile: boolean;
}

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

function clampReaderScale(scale: number) {
  return Math.min(MAX_READER_SCALE, Math.max(MIN_READER_SCALE, scale));
}

function resetViewerInsetStyles(viewer: HTMLDivElement) {
  viewer.style.minWidth = "";
  viewer.style.minHeight = "";
  viewer.style.paddingTop = "";
  viewer.style.paddingRight = "";
  viewer.style.paddingBottom = "";
  viewer.style.paddingLeft = "";
  viewer.style.boxSizing = "";
}

export function usePdfViewerController({
  viewUrl,
  documentPageCount,
  initialPageNumber,
  isMobile,
}: UsePdfViewerControllerInput) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewerStateRef = useRef<ViewerState | null>(null);
  const currentPageRef = useRef(initialPageNumber);
  const initialPageNumberRef = useRef(initialPageNumber);
  const isMobileRef = useRef(isMobile);
  const scaleRef = useRef(1);
  const hasLoadedDocumentRef = useRef(false);
  const lastWheelPageChangeAtRef = useRef(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [failedViewUrl, setFailedViewUrl] = useState<string | null>(null);
  const [loadedViewUrl, setLoadedViewUrl] = useState<string | null>(null);
  const [loadingProgressPercent, setLoadingProgressPercent] = useState<number | null>(
    null,
  );
  const [isViewerReadyForDisplay, setIsViewerReadyForDisplay] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState<ReaderViewMode>(
    () => readUserPreferences().readerDefaultViewMode,
  );
  const activePdfDocument = loadedViewUrl === viewUrl ? pdfDocument : null;
  const pageCount = activePdfDocument?.numPages ?? documentPageCount ?? 0;
  const isReady = Boolean(activePdfDocument);

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    initialPageNumberRef.current = initialPageNumber;
    currentPageRef.current = initialPageNumber;
  }, [initialPageNumber, viewUrl]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const centerPageInView = useCallback((pageNumber: number) => {
    const container = containerRef.current;
    const viewer = viewerRef.current;
    const viewerState = viewerStateRef.current;

    if (!container || !viewer) {
      return;
    }

    const isSinglePageMode = viewerState?.pdfViewer.scrollMode === ScrollMode.PAGE;
    const pageElement = viewer.querySelector<HTMLElement>(
      `.page[data-page-number="${pageNumber}"]`,
    );

    if (!pageElement) {
      if (!isSinglePageMode) {
        resetViewerInsetStyles(viewer);
      }
      return;
    }

    if (isSinglePageMode) {
      const isDesktopWidth = container.clientWidth >= DESKTOP_BREAKPOINT_WIDTH;
      const basePaddingX = isDesktopWidth
        ? DESKTOP_VIEWER_PADDING_X
        : MOBILE_VIEWER_PADDING_X;
      const basePaddingY = isDesktopWidth
        ? DESKTOP_VIEWER_PADDING_Y
        : MOBILE_VIEWER_PADDING_Y;
      const centeredPaddingX = Math.max(
        basePaddingX,
        (container.clientWidth - pageElement.offsetWidth) / 2,
      );
      const centeredPaddingY = Math.max(
        basePaddingY,
        (container.clientHeight - pageElement.offsetHeight) / 2,
      );

      viewer.style.minWidth = `${container.clientWidth}px`;
      viewer.style.minHeight = `${container.clientHeight}px`;
      viewer.style.paddingTop = `${centeredPaddingY}px`;
      viewer.style.paddingRight = `${centeredPaddingX}px`;
      viewer.style.paddingBottom = `${centeredPaddingY}px`;
      viewer.style.paddingLeft = `${centeredPaddingX}px`;
      viewer.style.boxSizing = "border-box";
    } else {
      resetViewerInsetStyles(viewer);
    }

    const centeredTop =
      pageElement.offsetTop - (container.clientHeight - pageElement.offsetHeight) / 2;
    const centeredLeft =
      pageElement.offsetLeft - (container.clientWidth - pageElement.offsetWidth) / 2;

    container.scrollTo({
      top: Math.max(0, centeredTop),
      left: Math.max(0, centeredLeft),
      behavior: "auto",
    });
  }, []);

  const handlePageChange = useCallback((pageNumber: number) => {
    const viewerState = viewerStateRef.current;

    if (!viewerState) {
      return;
    }

    const nextPage = clampPageNumber(pageNumber, viewerState.pdfViewer.pagesCount);

    viewerState.pdfViewer.currentPageNumber = nextPage;
    window.requestAnimationFrame(() => {
      centerPageInView(nextPage);
    });
  }, [centerPageInView]);

  const handleScaleValueChange = (nextScale: number) => {
    const viewerState = viewerStateRef.current;

    if (!viewerState) {
      return;
    }

    const clampedScale = clampReaderScale(nextScale);

    viewerState.pdfViewer.currentScale = clampedScale;
    setScale(clampedScale);
    if (viewerState.pdfViewer.scrollMode === ScrollMode.PAGE) {
      window.requestAnimationFrame(() => {
        centerPageInView(currentPageRef.current);
      });
    }
  };

  const handleScaleChange = (direction: "in" | "out") => {
    const currentScale = viewerStateRef.current?.pdfViewer.currentScale || 1;

    handleScaleValueChange(
      direction === "in" ? currentScale + 0.1 : currentScale - 0.1,
    );
  };

  const handleSearch = (searchQuery: string) => {
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

  const handleViewModeChange = (nextViewMode: ReaderViewMode) => {
    const viewerState = viewerStateRef.current;

    setViewMode(nextViewMode);

    if (!viewerState) {
      return;
    }

    applyReaderViewMode(viewerState.pdfViewer, nextViewMode);
    window.requestAnimationFrame(() => {
      centerPageInView(currentPageRef.current);
    });
  };

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
    const canvasOptions = isMobileRef.current
      ? {
          maxCanvasPixels: MOBILE_MAX_CANVAS_PIXELS,
          maxCanvasDim: MOBILE_MAX_CANVAS_DIM,
          capCanvasAreaFactor: MOBILE_CANVAS_AREA_FACTOR,
        }
      : {
          maxCanvasPixels: -1,
          maxCanvasDim: -1,
          capCanvasAreaFactor: -1,
        };
    const pdfViewer = new PdfJsViewer({
      container,
      viewer,
      eventBus,
      linkService,
      findController,
      ...canvasOptions,
      enableDetailCanvas: false,
      removePageBorders: isMobileRef.current,
    });
    const loadingTask = getDocument({
      url: viewUrl,
      disableRange: false,
      disableAutoFetch: true,
      enableHWA: true,
      rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
      wasmUrl: "/pdfjs/wasm/",
    });
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
      if (pdfViewer.scrollMode === ScrollMode.PAGE) {
        window.requestAnimationFrame(() => {
          centerPageInView(currentPageRef.current);
        });
      }
    };
    const handlePagesInit = () => {
      const preferences = readUserPreferences();
      const initialViewMode = isMobileRef.current
        ? "continuous-scroll"
        : preferences.readerDefaultViewMode;

      applyReaderViewMode(pdfViewer, initialViewMode);
      pdfViewer.currentScaleValue = isMobileRef.current ? "page-width" : "page-fit";
      const restoredPage = clampPageNumber(restorePageNumber, pdfViewer.pagesCount);

      pdfViewer.currentPageNumber = restoredPage;
      setCurrentPage(restoredPage);
      setViewMode(initialViewMode);
      setScale(pdfViewer.currentScale || 1);
      window.requestAnimationFrame(() => {
        if (isMobileRef.current) {
          pdfViewer.currentScaleValue = "page-width";
          setScale(pdfViewer.currentScale || 1);
        }
        centerPageInView(restoredPage);
      });
    };

    loadingTask.onProgress = ({ loaded, total }: PdfLoadingProgress) => {
      if (cancelled || total <= 0) {
        return;
      }

      setLoadingProgressPercent(
        Math.min(99, Math.max(0, Math.round((loaded / total) * 100))),
      );
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
  }, [centerPageInView, viewUrl]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const handleResize = () => {
      centerPageInView(currentPageRef.current);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [centerPageInView, isReady]);

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
  }, [currentPage, handlePageChange, isReady, pageCount, viewMode]);

  return {
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
  };
}
