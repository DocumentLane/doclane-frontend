import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDocument,
  deleteDocumentNote,
  getDocument,
  getDocumentPdfBlob,
  getDocumentPreviewImage,
  getDocumentStatus,
  getDocumentViewUrl,
  listDocuments,
  listDocumentBookmarks,
  listDocumentNotes,
  reprocessDocumentOcr,
  removeDocumentBookmark,
  saveDocumentNote,
  saveDocumentBookmark,
  updateDocumentReadingPosition,
  uploadDocument,
} from "./documents.api";
import type {
  DocumentBookmark,
  DocumentItem,
  DocumentJobStatus,
  DocumentNote,
  DocumentStatusResponse,
  DocumentViewResponse,
} from "../types/document.types";

export const documentQueryKeys = {
  all: ["documents"] as const,
  lists: () => [...documentQueryKeys.all, "list"] as const,
  detail: (documentId: string) =>
    [...documentQueryKeys.all, "detail", documentId] as const,
  status: (documentId: string) =>
    [...documentQueryKeys.all, "status", documentId] as const,
  view: (documentId: string) =>
    [...documentQueryKeys.all, "view", documentId] as const,
  preview: (documentId: string) =>
    [...documentQueryKeys.all, "preview", documentId] as const,
  bookmarks: (documentId: string) =>
    [...documentQueryKeys.all, "bookmarks", documentId] as const,
  notes: (documentId: string) =>
    [...documentQueryKeys.all, "notes", documentId] as const,
};

export function isDocumentProcessing(status: DocumentStatusResponse["status"]) {
  return status === "UPLOAD_PENDING" || status === "METADATA_PROCESSING";
}

export function isDocumentOcrProcessing(
  ocrStatus: DocumentStatusResponse["ocrStatus"],
) {
  return ocrStatus === "PENDING" || ocrStatus === "PROCESSING";
}

const ongoingJobStatuses = new Set<DocumentJobStatus>([
  "QUEUED",
  "ACTIVE",
  "RETRYING",
]);

function hasOngoingDocumentJob(status: DocumentStatusResponse) {
  return status.jobs.some((job) => ongoingJobStatuses.has(job.status));
}

function isDocumentViewLinearizationProcessing(view: DocumentViewResponse) {
  return (
    view.linearizationStatus === "PENDING" ||
    view.linearizationStatus === "PROCESSING"
  );
}

export function useDocumentsQuery() {
  return useQuery({
    queryKey: documentQueryKeys.lists(),
    queryFn: listDocuments,
  });
}

export function useDocumentQuery(documentId: string | null) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.detail(documentId)
      : [...documentQueryKeys.all, "detail", "missing"],
    queryFn: () => getDocument(documentId as string),
    enabled: Boolean(documentId),
  });
}

export function useDocumentStatusQuery(documentId: string | null) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.status(documentId)
      : [...documentQueryKeys.all, "status", "missing"],
    queryFn: () => getDocumentStatus(documentId as string),
    enabled: Boolean(documentId),
    refetchInterval: (query) => {
      const data = query.state.data;

      return data &&
        (isDocumentProcessing(data.status) ||
          isDocumentOcrProcessing(data.ocrStatus) ||
          hasOngoingDocumentJob(data))
        ? 1500
        : false;
    },
  });
}

export function useDocumentViewQuery(documentId: string | null, enabled = true) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.view(documentId)
      : [...documentQueryKeys.all, "view", "missing"],
    queryFn: () => getDocumentViewUrl(documentId as string),
    enabled: enabled && Boolean(documentId),
    refetchInterval: (query) => {
      const data = query.state.data;

      return data && isDocumentViewLinearizationProcessing(data) ? 1500 : false;
    },
    staleTime: 60_000,
  });
}

export function useDocumentPreviewQuery(
  documentId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.preview(documentId)
      : [...documentQueryKeys.all, "preview", "missing"],
    queryFn: () => getDocumentPreviewImage(documentId as string),
    enabled: enabled && Boolean(documentId),
    retry: false,
    staleTime: 60_000,
  });
}

export function useDocumentBookmarksQuery(documentId: string | null) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.bookmarks(documentId)
      : [...documentQueryKeys.all, "bookmarks", "missing"],
    queryFn: () => listDocumentBookmarks(documentId as string),
    enabled: Boolean(documentId),
  });
}

export function useDocumentNotesQuery(documentId: string | null) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.notes(documentId)
      : [...documentQueryKeys.all, "notes", "missing"],
    queryFn: () => listDocumentNotes(documentId as string),
    enabled: Boolean(documentId),
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: async (_result, documentId) => {
      queryClient.removeQueries({
        queryKey: documentQueryKeys.detail(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.status(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.view(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.preview(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.bookmarks(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.notes(documentId),
      });

      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() });
    },
  });
}

export function useReprocessDocumentOcrMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reprocessDocumentOcr,
    onSuccess: async (_status, documentId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.status(documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.view(documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.preview(documentId),
        }),
      ]);
    },
  });
}

export function useDownloadDocumentPdfMutation() {
  return useMutation({
    mutationFn: getDocumentPdfBlob,
  });
}

export function useToggleDocumentBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentBookmark | void,
    Error,
    {
      documentId: string;
      pageNumber: number;
      isBookmarked: boolean;
    }
  >({
    mutationFn: (input: {
      documentId: string;
      pageNumber: number;
      isBookmarked: boolean;
    }) =>
      input.isBookmarked
        ? removeDocumentBookmark(input)
        : saveDocumentBookmark(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.bookmarks(input.documentId),
      });
    },
  });
}

export function useSaveDocumentNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDocumentNote,
    onSuccess: (note, input) => {
      queryClient.setQueryData<DocumentNote[] | undefined>(
        documentQueryKeys.notes(input.documentId),
        (notes) => {
          const existingNotes = notes ?? [];
          const noteIndex = existingNotes.findIndex(
            (item) => item.pageNumber === input.pageNumber,
          );

          if (noteIndex === -1) {
            return [...existingNotes, note].sort(
              (first, second) => first.pageNumber - second.pageNumber,
            );
          }

          return existingNotes.map((item, index) =>
            index === noteIndex ? note : item,
          );
        },
      );
    },
  });
}

export function useDeleteDocumentNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocumentNote,
    onSuccess: (_result, input) => {
      queryClient.setQueryData<DocumentNote[] | undefined>(
        documentQueryKeys.notes(input.documentId),
        (notes) =>
          notes?.filter((note) => note.pageNumber !== input.pageNumber) ?? notes,
      );
    },
  });
}

export function useUpdateDocumentReadingPositionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentReadingPosition,
    onSuccess: (_result, input) => {
      queryClient.setQueryData<DocumentItem | undefined>(
        documentQueryKeys.detail(input.documentId),
        (document) =>
          document
            ? { ...document, lastReadPageNumber: input.pageNumber }
            : document,
      );
    },
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: async (document) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(document.id),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.status(document.id),
        }),
      ]);
    },
  });
}
