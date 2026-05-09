import axios from "axios";
import { apiClient } from "@/lib/api/http-client";
import type {
  DocumentBookmark,
  DocumentItem,
  DocumentNote,
  DocumentPreviewResponse,
  DocumentStatusResponse,
  DocumentUploadSession,
  DocumentViewResponse,
  DeleteDocumentNoteInput,
  SaveDocumentNoteInput,
  UpdateDocumentReadingPositionInput,
  UploadDocumentInput,
} from "../types/document.types";

export async function listDocuments(): Promise<DocumentItem[]> {
  const response = await apiClient.get<DocumentItem[]>("/documents");

  return response.data;
}

export async function getDocument(documentId: string): Promise<DocumentItem> {
  const response = await apiClient.get<DocumentItem>(`/documents/${documentId}`);

  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}

export async function reprocessDocumentOcr(
  documentId: string,
): Promise<DocumentStatusResponse> {
  const response = await apiClient.post<DocumentStatusResponse>(
    `/documents/${documentId}/ocr/reprocess`,
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

export async function getDocumentViewUrl(
  documentId: string,
): Promise<DocumentViewResponse> {
  const response = await apiClient.get<DocumentViewResponse>(
    `/documents/${documentId}/view`,
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

export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<DocumentItem> {
  const sessionResponse = await apiClient.post<DocumentUploadSession>(
    "/documents/upload-session",
    {
      originalFileName: input.file.name,
      title: input.title || input.file.name,
      sizeBytes: input.file.size,
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
