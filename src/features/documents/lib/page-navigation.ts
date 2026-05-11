import type { ReaderViewMode } from "@/features/settings/types/user-preferences.types";

function clampPageNumber(pageNumber: number, pageCount: number) {
  if (pageCount < 1) {
    return 1;
  }

  return Math.min(pageCount, Math.max(1, pageNumber));
}

function getTwoPageSpreadStart(pageNumber: number) {
  if (pageNumber <= 1) {
    return 1;
  }

  return pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
}

export function getPreviousReaderPageNumber(
  currentPage: number,
  pageCount: number,
  viewMode: ReaderViewMode,
) {
  if (viewMode !== "two-pages") {
    return clampPageNumber(currentPage - 1, pageCount);
  }

  return clampPageNumber(getTwoPageSpreadStart(currentPage) - 2, pageCount);
}

export function getNextReaderPageNumber(
  currentPage: number,
  pageCount: number,
  viewMode: ReaderViewMode,
) {
  if (viewMode !== "two-pages") {
    return clampPageNumber(currentPage + 1, pageCount);
  }

  return clampPageNumber(getTwoPageSpreadStart(currentPage) + 2, pageCount);
}

export function hasPreviousReaderPage(
  currentPage: number,
  viewMode: ReaderViewMode,
) {
  if (viewMode !== "two-pages") {
    return currentPage > 1;
  }

  return getTwoPageSpreadStart(currentPage) > 1;
}

export function hasNextReaderPage(
  currentPage: number,
  pageCount: number,
  viewMode: ReaderViewMode,
) {
  if (viewMode !== "two-pages") {
    return currentPage < pageCount;
  }

  return getTwoPageSpreadStart(currentPage) + 2 <= pageCount;
}
