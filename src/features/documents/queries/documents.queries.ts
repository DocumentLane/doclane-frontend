import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkUpdateDocumentFolder,
  deleteDocument,
  deleteDocumentNote,
  getDocument,
  getDocumentPdfBlob,
  getDocumentPreviewImage,
  listDocumentPermissions,
  getPublicDocument,
  getPublicDocumentPreviewImage,
  getPublicDocumentViewUrl,
  getDocumentStatus,
  getDocumentStatuses,
  getDocumentViewUrl,
  listDocuments,
  listDocumentBookmarks,
  listDocumentNotes,
  reprocessDocumentOcr,
  restartDocumentJob,
  removeDocumentBookmark,
  removeDocumentPermission,
  saveDocumentNote,
  saveDocumentBookmark,
  saveDocumentPermission,
  updateDocumentFolder,
  updateDocumentTitle,
  updateDocumentReadingPosition,
  updateDocumentPublicAccess,
  uploadDocument,
  uploadDocumentThumbnail,
} from "./documents.api";
import type {
  DocumentBookmark,
  DocumentItem,
  DocumentJobStatus,
  DocumentNote,
  DocumentPreviewResponse,
  DocumentStatusResponse,
  DocumentViewResponse,
} from "../types/document.types";

export const documentQueryKeys = {
  all: ["documents"] as const,
  lists: () => [...documentQueryKeys.all, "list"] as const,
  list: (folderId?: string | null) =>
    [
      ...documentQueryKeys.lists(),
      folderId === undefined ? "all" : folderId === null ? "unfiled" : folderId,
    ] as const,
  detail: (documentId: string) =>
    [...documentQueryKeys.all, "detail", documentId] as const,
  statuses: () => [...documentQueryKeys.all, "statuses"] as const,
  status: (documentId: string) =>
    [...documentQueryKeys.all, "status", documentId] as const,
  view: (documentId: string) =>
    [...documentQueryKeys.all, "view", documentId] as const,
  preview: (documentId: string) =>
    [...documentQueryKeys.all, "preview", documentId] as const,
  publicDetail: (documentId: string) =>
    [...documentQueryKeys.all, "public", "detail", documentId] as const,
  publicView: (documentId: string) =>
    [...documentQueryKeys.all, "public", "view", documentId] as const,
  publicPreview: (documentId: string) =>
    [...documentQueryKeys.all, "public", "preview", documentId] as const,
  bookmarks: (documentId: string) =>
    [...documentQueryKeys.all, "bookmarks", documentId] as const,
  notes: (documentId: string) =>
    [...documentQueryKeys.all, "notes", documentId] as const,
  permissions: (documentId: string) =>
    [...documentQueryKeys.all, "permissions", documentId] as const,
};

export function isDocumentProcessing(status: DocumentStatusResponse["status"]) {
  return status === "METADATA_PROCESSING";
}

export function isDocumentOcrProcessing(
  ocrStatus: DocumentStatusResponse["ocrStatus"],
) {
  return ocrStatus === "PROCESSING";
}

const ongoingJobStatuses = new Set<DocumentJobStatus>([
  "QUEUED",
  "ACTIVE",
  "RETRYING",
]);

function hasOngoingDocumentJob(status: DocumentStatusResponse) {
  return status.jobs.some((job) => ongoingJobStatuses.has(job.status));
}

function shouldPollDocumentStatus(status: DocumentStatusResponse) {
  return (
    isDocumentProcessing(status.status) ||
    isDocumentOcrProcessing(status.ocrStatus) ||
    hasOngoingDocumentJob(status)
  );
}

function isDocumentViewLinearizationProcessing(view: DocumentViewResponse) {
  return (
    view.linearizationStatus === "PENDING" ||
    view.linearizationStatus === "PROCESSING"
  );
}

export function useDocumentsQuery(folderId?: string | null) {
  return useQuery({
    queryKey: documentQueryKeys.list(folderId),
    queryFn: () => listDocuments(folderId),
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

export function usePublicDocumentQuery(
  documentId: string | null,
  initialData?: DocumentItem,
) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.publicDetail(documentId)
      : [...documentQueryKeys.all, "public", "detail", "missing"],
    queryFn: () => getPublicDocument(documentId as string),
    enabled: Boolean(documentId),
    initialData,
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

      return data && shouldPollDocumentStatus(data) ? 1500 : false;
    },
  });
}

export function useDocumentStatusesQuery() {
  return useQuery({
    queryKey: documentQueryKeys.statuses(),
    queryFn: getDocumentStatuses,
    refetchInterval: (query) => {
      const data = query.state.data;

      return data?.some((status) => shouldPollDocumentStatus(status))
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

export function usePublicDocumentViewQuery(
  documentId: string | null,
  enabled = true,
  initialData?: DocumentViewResponse,
) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.publicView(documentId)
      : [...documentQueryKeys.all, "public", "view", "missing"],
    queryFn: () => getPublicDocumentViewUrl(documentId as string),
    enabled: enabled && Boolean(documentId),
    refetchInterval: (query) => {
      const data = query.state.data;

      return data && isDocumentViewLinearizationProcessing(data) ? 1500 : false;
    },
    staleTime: 60_000,
    initialData,
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

export function usePublicDocumentPreviewQuery(
  documentId: string | null,
  enabled = true,
  initialData?: DocumentPreviewResponse | null,
) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.publicPreview(documentId)
      : [...documentQueryKeys.all, "public", "preview", "missing"],
    queryFn: () => getPublicDocumentPreviewImage(documentId as string),
    enabled: enabled && Boolean(documentId),
    retry: false,
    staleTime: 60_000,
    initialData: initialData ?? undefined,
  });
}

export function useDocumentBookmarksQuery(documentId: string | null) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.bookmarks(documentId)
      : [...documentQueryKeys.all, "bookmarks", "missing"],
    queryFn: () => listDocumentBookmarks(documentId as string),
    enabled: Boolean(documentId),
    staleTime: 60_000,
  });
}

export function useDocumentNotesQuery(documentId: string | null, enabled = true) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.notes(documentId)
      : [...documentQueryKeys.all, "notes", "missing"],
    queryFn: () => listDocumentNotes(documentId as string),
    enabled: enabled && Boolean(documentId),
    staleTime: 60_000,
  });
}

export function useDocumentPermissionsQuery(
  documentId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: documentId
      ? documentQueryKeys.permissions(documentId)
      : [...documentQueryKeys.all, "permissions", "missing"],
    queryFn: () => listDocumentPermissions(documentId as string),
    enabled: enabled && Boolean(documentId),
    retry: false,
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
      queryClient.removeQueries({
        queryKey: documentQueryKeys.permissions(documentId),
      });
      queryClient.removeQueries({
        queryKey: documentQueryKeys.statuses(),
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
          queryKey: documentQueryKeys.statuses(),
        }),
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

export function useRestartDocumentJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restartDocumentJob,
    onSuccess: async (_status, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.statuses(),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(input.documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.status(input.documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.view(input.documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.preview(input.documentId),
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

export function useUpdateDocumentTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentTitle,
    onSuccess: async (document) => {
      queryClient.setQueryData<DocumentItem | undefined>(
        documentQueryKeys.detail(document.id),
        document,
      );
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() });
    },
  });
}

export function useUpdateDocumentFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentFolder,
    onSuccess: async (document) => {
      queryClient.setQueryData<DocumentItem | undefined>(
        documentQueryKeys.detail(document.id),
        document,
      );
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() });
    },
  });
}

export function useBulkUpdateDocumentFolderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateDocumentFolder,
    onSuccess: async (documents) => {
      documents.forEach((document) => {
        queryClient.setQueryData<DocumentItem | undefined>(
          documentQueryKeys.detail(document.id),
          document,
        );
      });

      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() });
    },
  });
}

export function useUpdateDocumentPublicAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentPublicAccess,
    onSuccess: async (document) => {
      queryClient.setQueryData<DocumentItem | undefined>(
        documentQueryKeys.detail(document.id),
        document,
      );
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() });
    },
  });
}

export function useSaveDocumentPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDocumentPermission,
    onSuccess: async (_permission, input) => {
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.permissions(input.resourceId),
      });
    },
  });
}

export function useRemoveDocumentPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDocumentPermission,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: documentQueryKeys.permissions(input.resourceId),
      });
    },
  });
}

export function useUploadDocumentThumbnailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocumentThumbnail,
    onSuccess: async (_session, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.detail(input.documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentQueryKeys.preview(input.documentId),
        }),
        queryClient.invalidateQueries({ queryKey: documentQueryKeys.lists() }),
      ]);
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
          queryKey: documentQueryKeys.statuses(),
        }),
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
