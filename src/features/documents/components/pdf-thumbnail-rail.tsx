import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { BookmarkIcon, FileTextIcon, StickyNoteIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ThumbnailRailTab = "pages" | "bookmarks";

interface PdfThumbnailRailProps {
  pdfDocument: PDFDocumentProxy | null;
  currentPage: number;
  bookmarkedPages: number[];
  notedPages: number[];
  isOpen: boolean;
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

      void renderTask.promise.finally(() => {
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
  isOpen,
  onPageChange,
}: PdfThumbnailRailProps) {
  const [activeTab, setActiveTab] = useState<ThumbnailRailTab>("pages");

  if (!isOpen) {
    return null;
  }

  const pageNumbers =
    activeTab === "bookmarks"
      ? bookmarkedPages
      : pdfDocument
        ? Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1)
        : [];

  return (
    <aside className="hidden w-44 shrink-0 border-r bg-sidebar p-3 md:block">
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
              <FileTextIcon className="size-3.5" />
              All
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
              <BookmarkIcon className="size-3.5" />
              Saved
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
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
            ) : pdfDocument && activeTab === "bookmarks" ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No saved pages
              </p>
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Loading thumbnails...
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
