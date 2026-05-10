import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useDeleteDocumentNoteMutation,
  useDownloadDocumentPdfMutation,
  useDocumentBookmarksQuery,
  useDocumentNotesQuery,
  useSaveDocumentNoteMutation,
  useToggleDocumentBookmarkMutation,
} from "../queries/documents.queries";
import { getPdfDownloadFileName, saveBlobAsFile } from "../lib/pdf-download";

interface UsePdfReaderActionsInput {
  documentId: string;
  title: string;
  originalFileName: string;
  currentPage: number;
  shouldLoadNotes: boolean;
}

export function usePdfReaderActions({
  documentId,
  title,
  originalFileName,
  currentPage,
  shouldLoadNotes,
}: UsePdfReaderActionsInput) {
  const bookmarksQuery = useDocumentBookmarksQuery(documentId);
  const notesQuery = useDocumentNotesQuery(documentId, shouldLoadNotes);
  const downloadDocumentPdfMutation = useDownloadDocumentPdfMutation();
  const toggleBookmarkMutation = useToggleDocumentBookmarkMutation();
  const saveNoteMutation = useSaveDocumentNoteMutation();
  const deleteNoteMutation = useDeleteDocumentNoteMutation();
  const bookmarkedPages = useMemo(
    () => bookmarksQuery.data?.map((bookmark) => bookmark.pageNumber) ?? [],
    [bookmarksQuery.data],
  );
  const bookmarkedPageSet = useMemo(
    () => new Set(bookmarkedPages),
    [bookmarkedPages],
  );
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const notedPages = useMemo(
    () => notes.map((note) => note.pageNumber),
    [notes],
  );
  const notedPageSet = useMemo(() => new Set(notedPages), [notedPages]);

  const toggleCurrentPageBookmark = useCallback(() => {
    toggleBookmarkMutation.mutate({
      documentId,
      pageNumber: currentPage,
      isBookmarked: bookmarkedPageSet.has(currentPage),
    });
  }, [bookmarkedPageSet, currentPage, documentId, toggleBookmarkMutation]);

  const downloadPdf = useCallback(() => {
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
  }, [documentId, downloadDocumentPdfMutation, originalFileName, title]);

  return {
    bookmarkedPages,
    bookmarkedPageSet,
    notes,
    notedPages,
    notedPageSet,
    isDownloading: downloadDocumentPdfMutation.isPending,
    isSavingNote: saveNoteMutation.isPending,
    isDeletingNote: deleteNoteMutation.isPending,
    toggleCurrentPageBookmark,
    downloadPdf,
    saveNote: saveNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
  };
}
