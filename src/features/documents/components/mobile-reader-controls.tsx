import {
  BookmarkCheckIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StickyNoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileReaderControlsProps {
  currentPage: number;
  pageCount: number;
  isReady: boolean;
  isBookmarked: boolean;
  hasNote: boolean;
  isNotesPanelOpen: boolean;
  canGoToPreviousPage: boolean;
  canGoToNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onToggleBookmark: () => void;
  onToggleNotesPanel: () => void;
  onOpenPageList: () => void;
}

export function MobileReaderControls({
  currentPage,
  pageCount,
  isReady,
  isBookmarked,
  hasNote,
  isNotesPanelOpen,
  canGoToPreviousPage,
  canGoToNextPage,
  onPreviousPage,
  onNextPage,
  onToggleBookmark,
  onToggleNotesPanel,
  onOpenPageList,
}: MobileReaderControlsProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousPage}
        disabled={!isReady || !canGoToPreviousPage}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant={isBookmarked ? "secondary" : "ghost"}
        size="icon"
        onClick={onToggleBookmark}
        disabled={!isReady}
        aria-label={
          isBookmarked
            ? "Remove bookmark from current page"
            : "Bookmark current page"
        }
      >
        {isBookmarked ? <BookmarkCheckIcon /> : <BookmarkIcon />}
      </Button>
      <button
        type="button"
        className="min-w-0 flex-1 rounded-md px-2 py-2 text-center text-xs font-medium tabular-nums text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        onClick={onOpenPageList}
        disabled={!isReady || pageCount < 1}
        aria-label="Open page list"
      >
        {pageCount > 0 ? `${currentPage} / ${pageCount}` : "Loading"}
      </button>
      <Button
        variant={isNotesPanelOpen || hasNote ? "secondary" : "ghost"}
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
        onClick={onNextPage}
        disabled={!isReady || !canGoToNextPage}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
