import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type MobilePageListView = "pages" | "bookmarks";

interface MobileReaderPageListProps {
  open: boolean;
  pageCount: number;
  currentPage: number;
  bookmarkedPages: number[];
  bookmarkedPageSet: ReadonlySet<number>;
  notedPageSet: ReadonlySet<number>;
  onOpenChange: (open: boolean) => void;
  onPageChange: (pageNumber: number) => void;
}

function getWindowedPageNumbers(currentPage: number, pageCount: number) {
  if (pageCount <= 120) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  const addRange = (start: number, end: number) => {
    for (let page = Math.max(1, start); page <= Math.min(pageCount, end); page += 1) {
      pages.add(page);
    }
  };

  addRange(1, 5);
  addRange(currentPage - 25, currentPage + 25);
  addRange(pageCount - 4, pageCount);

  return Array.from(pages).sort((firstPage, secondPage) => firstPage - secondPage);
}

export function MobileReaderPageList({
  open,
  pageCount,
  currentPage,
  bookmarkedPages,
  bookmarkedPageSet,
  notedPageSet,
  onOpenChange,
  onPageChange,
}: MobileReaderPageListProps) {
  const [view, setView] = useState<MobilePageListView>("pages");
  const pageNumbers = useMemo(
    () =>
      open
        ? view === "bookmarks"
          ? bookmarkedPages
          : getWindowedPageNumbers(currentPage, pageCount)
        : [],
    [bookmarkedPages, currentPage, open, pageCount, view],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75svh] gap-0 p-0">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Pages</SheetTitle>
          <SheetDescription>Jump to a page or saved bookmark.</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-1 border-b p-2">
          <button
            type="button"
            className={[
              "h-9 rounded-md text-sm font-medium transition",
              view === "pages"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            onClick={() => setView("pages")}
          >
            All pages
          </button>
          <button
            type="button"
            className={[
              "h-9 rounded-md text-sm font-medium transition",
              view === "bookmarks"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            onClick={() => setView("bookmarks")}
          >
            Bookmarks
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {pageNumbers.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {pageNumbers.map((pageNumber) => {
                const isActive = pageNumber === currentPage;
                const isBookmarked = bookmarkedPageSet.has(pageNumber);
                const hasNote = notedPageSet.has(pageNumber);

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    className={[
                      "relative flex h-12 items-center justify-center rounded-md border text-sm font-semibold tabular-nums transition",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted",
                    ].join(" ")}
                    onClick={() => onPageChange(pageNumber)}
                  >
                    {pageNumber}
                    {isBookmarked || hasNote ? (
                      <span className="absolute right-1 top-1 flex gap-0.5">
                        {isBookmarked ? (
                          <span className="size-1.5 rounded-full bg-current" />
                        ) : null}
                        {hasNote ? (
                          <span className="size-1.5 rounded-full bg-current opacity-60" />
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bookmarked pages.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
