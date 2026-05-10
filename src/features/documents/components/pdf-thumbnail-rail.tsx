import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { BookmarkIcon, StickyNoteIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { PdfOutlineItem } from "../hooks/use-pdf-outline";
import { PdfOutlineList } from "./pdf-outline-list";

type ThumbnailRailTab = "pages" | "outline" | "notes" | "bookmarks";

interface PdfThumbnailRailProps {
  pdfDocument: PDFDocumentProxy | null;
  currentPage: number;
  bookmarkedPages: number[];
  notedPages: number[];
  outlineItems: PdfOutlineItem[];
  isLoadingOutline: boolean;
  isOpen: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onPageChange: (pageNumber: number) => void;
}

interface PdfThumbnailProps {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  isBookmarked: boolean;
  hasNote: boolean;
  onPageChange: (pageNumber: number) => void;
}

const MIN_RAIL_WIDTH = 200;
const MAX_RAIL_WIDTH = 480;

function clampRailWidth(width: number) {
  return Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, width));
}

function isRenderingCancelledException(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "RenderingCancelledException" ||
      error.message.startsWith("Rendering cancelled"))
  );
}

function PdfThumbnail({
  pdfDocument,
  pageNumber,
  isActive,
  isBookmarked,
  hasNote,
  onPageChange,
}: PdfThumbnailProps) {
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = useState(pageNumber <= 3);

  useEffect(() => {
    const item = itemRef.current;

    if (!item || shouldRender) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(item);

    return () => {
      observer.disconnect();
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    itemRef.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !shouldRender) {
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | null = null;

    void pdfDocument.getPage(pageNumber).then((page) => {
      if (cancelled) {
        page.cleanup();
        return;
      }

      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = 104;
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");

      if (!context) {
        page.cleanup();
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
      });

      void renderTask.promise
        .catch((error: unknown) => {
          if (!isRenderingCancelledException(error)) {
            throw error;
          }
        })
        .finally(() => {
          page.cleanup();
        });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, shouldRender]);

  return (
    <button
      ref={itemRef}
      type="button"
      className={[
        "flex w-full flex-col items-center gap-1 rounded-md p-2 text-xs font-semibold transition",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
      onClick={() => onPageChange(pageNumber)}
    >
      <span className="relative flex h-36 w-28 items-center justify-center overflow-hidden rounded bg-background">
        <canvas ref={canvasRef} />
        {isBookmarked ? (
          <span className="absolute right-1 top-1 rounded-sm bg-primary p-1 text-primary-foreground">
            <BookmarkIcon className="size-3" />
          </span>
        ) : null}
        {hasNote ? (
          <span className="absolute bottom-1 right-1 rounded-sm bg-background/90 p-1 text-foreground shadow-sm">
            <StickyNoteIcon className="size-3" />
          </span>
        ) : null}
      </span>
      <span className="tabular-nums">{pageNumber}</span>
    </button>
  );
}

export function PdfThumbnailRail({
  pdfDocument,
  currentPage,
  bookmarkedPages,
  notedPages,
  outlineItems,
  isLoadingOutline,
  isOpen,
  width,
  onWidthChange,
  onPageChange,
}: PdfThumbnailRailProps) {
  const [activeTab, setActiveTab] = useState<ThumbnailRailTab>("pages");

  if (!isOpen) {
    return null;
  }

  const pageNumbers =
    activeTab === "pages" && pdfDocument
      ? Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1)
      : activeTab === "notes"
        ? notedPages
        : activeTab === "bookmarks"
          ? bookmarkedPages
          : [];

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = width;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      onWidthChange(clampRailWidth(startWidth + moveEvent.clientX - startX));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <aside
      className="relative hidden shrink-0 border-r bg-sidebar p-3 md:block"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize page sidebar"
        className="absolute inset-y-0 right-0 z-10 w-2 translate-x-1 cursor-col-resize"
        onPointerDown={handleResizeStart}
      />
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="rounded-md border bg-background/70 p-1">
          <div
            role="tablist"
            aria-label="Page rail views"
            className="grid grid-cols-2 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "pages"}
              className={cn(
                "flex h-8 items-center justify-center gap-1 rounded-sm px-2 text-xs font-semibold transition",
                activeTab === "pages"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("pages")}
            >
              Pages
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "outline"}
              className={cn(
                "flex h-8 items-center justify-center gap-1 rounded-sm px-2 text-xs font-semibold transition",
                activeTab === "outline"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("outline")}
            >
              Outline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "notes"}
              className={cn(
                "flex h-8 items-center justify-center gap-1 rounded-sm px-2 text-xs font-semibold transition",
                activeTab === "notes"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("notes")}
            >
              Notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "bookmarks"}
              className={cn(
                "flex h-8 items-center justify-center gap-1 rounded-sm px-2 text-xs font-semibold transition",
                activeTab === "bookmarks"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("bookmarks")}
            >
              Saved
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === "outline" ? (
            outlineItems.length > 0 ? (
              <PdfOutlineList
                items={outlineItems}
                currentPage={currentPage}
                onPageChange={onPageChange}
              />
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                {isLoadingOutline ? "Loading outline..." : "No PDF outline"}
              </p>
            )
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
              {pdfDocument && pageNumbers.length > 0 ? (
                pageNumbers.map((pageNumber) => (
                  <PdfThumbnail
                    key={pageNumber}
                    pdfDocument={pdfDocument}
                    pageNumber={pageNumber}
                    isActive={pageNumber === currentPage}
                    isBookmarked={bookmarkedPages.includes(pageNumber)}
                    hasNote={notedPages.includes(pageNumber)}
                    onPageChange={onPageChange}
                  />
                ))
              ) : pdfDocument && activeTab === "notes" ? (
                <p className="col-span-full px-2 py-3 text-xs text-muted-foreground">
                  No noted pages
                </p>
              ) : pdfDocument && activeTab === "bookmarks" ? (
                <p className="col-span-full px-2 py-3 text-xs text-muted-foreground">
                  No saved pages
                </p>
              ) : (
                <p className="col-span-full px-2 py-3 text-xs text-muted-foreground">
                  Loading thumbnails...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
