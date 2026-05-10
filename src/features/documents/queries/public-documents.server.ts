import axios from "axios";
import type {
  DocumentItem,
  DocumentPreviewResponse,
  DocumentViewResponse,
} from "../types/document.types";

function createServerApiClient() {
  return axios.create({
    baseURL: process.env.BACKEND_ORIGIN ?? "http://localhost:3000",
  });
}

export async function getPublicDocumentForSsr(
  documentId: string,
): Promise<DocumentItem> {
  const response = await createServerApiClient().get<DocumentItem>(
    `/public/documents/${documentId}`,
  );

  return response.data;
}

export async function getPublicDocumentViewForSsr(
  documentId: string,
): Promise<DocumentViewResponse> {
  const response = await createServerApiClient().get<DocumentViewResponse>(
    `/public/documents/${documentId}/view`,
  );

  return response.data;
}

export async function getPublicDocumentPreviewForSsr(
  documentId: string,
): Promise<DocumentPreviewResponse | null> {
  try {
    const response = await createServerApiClient().get<DocumentPreviewResponse>(
      `/public/documents/${documentId}/preview`,
    );

    return response.data;
  } catch {
    return null;
  }
}
