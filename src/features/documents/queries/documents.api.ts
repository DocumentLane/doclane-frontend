import axios from "axios";
import { apiClient } from "@/lib/api/http-client";
import type {
  BulkDocumentPermissionsItem,
  BulkRemoveDocumentPermissionInput,
  BulkSaveDocumentPermissionInput,
  DocumentBookmark,
  DocumentItem,
  DocumentNote,
  DocumentPreviewResponse,
  DocumentStatusResponse,
  DocumentThumbnailUploadSession,
  DocumentUploadSession,
  DocumentViewResponse,
  BulkUpdateDocumentFolderInput,
  DeleteDocumentNoteInput,
  RestartDocumentJobInput,
  SaveDocumentNoteInput,
  UpdateDocumentTitleInput,
  UpdateDocumentFolderInput,
  UpdateDocumentPublicAccessInput,
  UpdateDocumentReadingPositionInput,
  UploadDocumentThumbnailInput,
  UploadDocumentInput,
} from "../types/document.types";
import type {
  DocumentPermissions,
  RemoveResourcePermissionInput,
  ResourcePermissionItem,
  SaveResourcePermissionInput,
} from "@/features/folders/types/folder.types";

export async function listDocuments(
  folderId?: string | null,
): Promise<DocumentItem[]> {
  const params =
    folderId === undefined
      ? undefined
      : { folderId: folderId === null ? "null" : folderId };
  const response = await apiClient.get<DocumentItem[]>("/documents", {
    params,
  });

  return response.data;
}

export async function getDocument(documentId: string): Promise<DocumentItem> {
  const response = await apiClient.get<DocumentItem>(`/documents/${documentId}`);

  return response.data;
}

export async function getPublicDocument(
  documentId: string,
): Promise<DocumentItem> {
  const response = await apiClient.get<DocumentItem>(
    `/public/documents/${documentId}`,
  );

  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}

export async function updateDocumentTitle(
  input: UpdateDocumentTitleInput,
): Promise<DocumentItem> {
  const response = await apiClient.patch<DocumentItem>(
    `/documents/${input.documentId}`,
    {
      title: input.title,
    },
  );

  return response.data;
}

export async function updateDocumentFolder(
  input: UpdateDocumentFolderInput,
): Promise<DocumentItem> {
  const response = await apiClient.patch<DocumentItem>(
    `/documents/${input.documentId}`,
    {
      folderId: input.folderId,
    },
  );

  return response.data;
}

export async function bulkUpdateDocumentFolder(
  input: BulkUpdateDocumentFolderInput,
): Promise<DocumentItem[]> {
  return Promise.all(
    input.documentIds.map((documentId) =>
      updateDocumentFolder({
        documentId,
        folderId: input.folderId,
      }),
    ),
  );
}

export async function reprocessDocumentOcr(
  documentId: string,
): Promise<DocumentStatusResponse> {
  const response = await apiClient.post<DocumentStatusResponse>(
    `/documents/${documentId}/ocr/reprocess`,
  );

  return response.data;
}

export async function restartDocumentJob(
  input: RestartDocumentJobInput,
): Promise<DocumentStatusResponse> {
  const response = await apiClient.post<DocumentStatusResponse>(
    `/documents/${input.documentId}/jobs/${input.jobId}/restart`,
  );

  return response.data;
}

export async function getDocumentStatus(
  documentId: string,
): Promise<DocumentStatusResponse> {
  const response = await apiClient.get<DocumentStatusResponse>(
    `/documents/${documentId}/status`,
  );

  return response.data;
}

export async function getDocumentStatuses(): Promise<DocumentStatusResponse[]> {
  const response =
    await apiClient.get<DocumentStatusResponse[]>("/documents/statuses");

  return response.data;
}

export async function getDocumentViewUrl(
  documentId: string,
): Promise<DocumentViewResponse> {
  const response = await apiClient.get<DocumentViewResponse>(
    `/documents/${documentId}/view`,
  );

  return response.data;
}

export async function getPublicDocumentViewUrl(
  documentId: string,
): Promise<DocumentViewResponse> {
  const response = await apiClient.get<DocumentViewResponse>(
    `/public/documents/${documentId}/view`,
  );

  return response.data;
}

export async function getDocumentPdfBlob(documentId: string): Promise<Blob> {
  const view = await getDocumentViewUrl(documentId);
  const response = await axios.get<Blob>(view.viewUrl, {
    responseType: "blob",
  });

  return response.data;
}

export async function getDocumentPreviewImage(
  documentId: string,
): Promise<DocumentPreviewResponse> {
  const response = await apiClient.get<DocumentPreviewResponse>(
    `/documents/${documentId}/preview`,
  );

  return response.data;
}

export async function getPublicDocumentPreviewImage(
  documentId: string,
): Promise<DocumentPreviewResponse> {
  const response = await apiClient.get<DocumentPreviewResponse>(
    `/public/documents/${documentId}/preview`,
  );

  return response.data;
}

export async function listDocumentBookmarks(
  documentId: string,
): Promise<DocumentBookmark[]> {
  const response = await apiClient.get<DocumentBookmark[]>(
    `/documents/${documentId}/bookmarks`,
  );

  return response.data;
}

export async function saveDocumentBookmark(input: {
  documentId: string;
  pageNumber: number;
}): Promise<DocumentBookmark> {
  const response = await apiClient.put<DocumentBookmark>(
    `/documents/${input.documentId}/bookmarks/${input.pageNumber}`,
  );

  return response.data;
}

export async function removeDocumentBookmark(input: {
  documentId: string;
  pageNumber: number;
}): Promise<void> {
  await apiClient.delete(
    `/documents/${input.documentId}/bookmarks/${input.pageNumber}`,
  );
}

export async function listDocumentNotes(
  documentId: string,
): Promise<DocumentNote[]> {
  const response = await apiClient.get<DocumentNote[]>(
    `/documents/${documentId}/notes`,
  );

  return response.data;
}

export async function saveDocumentNote(
  input: SaveDocumentNoteInput,
): Promise<DocumentNote> {
  const response = await apiClient.put<DocumentNote>(
    `/documents/${input.documentId}/notes/${input.pageNumber}`,
    {
      content: input.content,
    },
  );

  return response.data;
}

export async function deleteDocumentNote(
  input: DeleteDocumentNoteInput,
): Promise<void> {
  await apiClient.delete(`/documents/${input.documentId}/notes/${input.pageNumber}`);
}

export async function updateDocumentReadingPosition(
  input: UpdateDocumentReadingPositionInput,
): Promise<void> {
  await apiClient.put(`/documents/${input.documentId}/reading-position`, {
    pageNumber: input.pageNumber,
  });
}

export async function updateDocumentPublicAccess(
  input: UpdateDocumentPublicAccessInput,
): Promise<DocumentItem> {
  const response = await apiClient.patch<DocumentItem>(
    `/documents/${input.documentId}/public-access`,
    {
      isPublic: input.isPublic,
    },
  );

  return response.data;
}

export async function listDocumentPermissions(
  documentId: string,
): Promise<DocumentPermissions> {
  const response = await apiClient.get<DocumentPermissions>(
    `/documents/${documentId}/permissions`,
  );

  return response.data;
}

export async function listBulkDocumentPermissions(
  documentIds: string[],
): Promise<BulkDocumentPermissionsItem[]> {
  return Promise.all(
    documentIds.map(async (documentId) => ({
      documentId,
      permissions: await listDocumentPermissions(documentId),
    })),
  );
}

export async function saveDocumentPermission(
  input: SaveResourcePermissionInput,
): Promise<ResourcePermissionItem> {
  const response = await apiClient.put<ResourcePermissionItem>(
    `/documents/${input.resourceId}/permissions/${input.targetType}/${input.targetId}`,
    {
      permission: input.permission,
    },
  );

  return response.data;
}

export async function bulkSaveDocumentPermission(
  input: BulkSaveDocumentPermissionInput,
): Promise<void> {
  await Promise.all(
    input.documentIds.map((documentId) =>
      saveDocumentPermission({
        resourceId: documentId,
        targetType: input.targetType,
        targetId: input.targetId,
        permission: input.permission,
      }),
    ),
  );
}

export async function removeDocumentPermission(
  input: RemoveResourcePermissionInput,
): Promise<void> {
  await apiClient.delete(
    `/documents/${input.resourceId}/permissions/${input.targetType}/${input.targetId}`,
  );
}

export async function bulkRemoveDocumentPermission(
  input: BulkRemoveDocumentPermissionInput,
): Promise<void> {
  await Promise.all(
    input.documentIds.map((documentId) =>
      removeDocumentPermission({
        resourceId: documentId,
        targetType: input.targetType,
        targetId: input.targetId,
      }),
    ),
  );
}

export async function uploadDocumentThumbnail(
  input: UploadDocumentThumbnailInput,
): Promise<DocumentThumbnailUploadSession> {
  const sessionResponse = await apiClient.post<DocumentThumbnailUploadSession>(
    `/documents/${input.documentId}/thumbnail/upload-session`,
    {
      contentType: input.file.type,
      width: input.width,
      height: input.height,
      sizeBytes: input.file.size,
    },
  );
  const uploadSession = sessionResponse.data;

  await axios.put(uploadSession.uploadUrl, input.file, {
    headers: {
      "Content-Type": input.file.type,
    },
  });

  return uploadSession;
}

export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<DocumentItem> {
  const sessionResponse = await apiClient.post<DocumentUploadSession>(
    "/documents/upload-session",
    {
      originalFileName: input.file.name,
      title: input.title || input.file.name,
      sizeBytes: input.file.size,
      folderId: input.folderId,
    },
  );
  const uploadSession = sessionResponse.data;

  await axios.put(uploadSession.uploadUrl, input.file, {
    headers: {
      "Content-Type": uploadSession.contentType,
    },
    onUploadProgress: (event) => {
      if (!event.total) {
        return;
      }

      input.onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });

  const completeResponse = await apiClient.post<DocumentItem>(
    `/documents/${uploadSession.documentId}/complete`,
    {
      sizeBytes: input.file.size,
    },
  );

  return completeResponse.data;
}
