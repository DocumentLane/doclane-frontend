export type DocumentStatus =
  | "UPLOAD_PENDING"
  | "UPLOADED"
  | "METADATA_PROCESSING"
  | "READY"
  | "PROCESSING_FAILED"
  | "DELETED";

export type DocumentOcrStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type DocumentJobType =
  | "PDF_METADATA"
  | "PDF_PAGE_DERIVATIVE"
  | "PDF_OCR";

export type DocumentJobStatus =
  | "QUEUED"
  | "ACTIVE"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface DocumentPage {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  hasTextLayer: boolean | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: string | null;
  status: DocumentStatus;
  ocrStatus: DocumentOcrStatus;
  isPublic: boolean;
  pageCount: number | null;
  lastReadPageNumber: number | null;
  hasTextLayer: boolean | null;
  uploadExpiresAt: string | null;
  uploadedAt: string | null;
  metadataExtractedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pages?: DocumentPage[];
}

export interface DocumentUploadSession {
  documentId: string;
  uploadUrl: string;
  method: "PUT";
  storageBucket: string;
  objectKey: string;
  contentType: "application/pdf";
  expiresAt: string;
}

export interface DocumentJobSummary {
  id: string;
  type: DocumentJobType;
  status: DocumentJobStatus;
  attempts: number;
  maxAttempts: number;
  progressPercent: number;
  currentPageNumber: number | null;
  completedPages: number;
  totalPages: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DocumentStatusResponse {
  documentId: string;
  status: DocumentStatus;
  ocrStatus: DocumentOcrStatus;
  pageCount: number | null;
  hasTextLayer: boolean | null;
  jobs: DocumentJobSummary[];
}

export type DocumentLinearizationStatus =
  | "PENDING"
  | "READY"
  | "PROCESSING"
  | "UNAVAILABLE"
  | "FAILED";

export interface DocumentViewResponse {
  documentId: string;
  viewUrl: string;
  expiresIn: number;
  isLinearized: boolean;
  linearizationStatus: DocumentLinearizationStatus;
}

export interface DocumentPreviewResponse {
  documentId: string;
  previewUrl: string;
  contentType: string;
  width: number | null;
  height: number | null;
  expiresIn: number;
}

export interface DocumentBookmark {
  id: string;
  documentId: string;
  pageNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentNote {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentInput {
  file: File;
  title?: string;
  onUploadProgress?: (progressPercent: number) => void;
}

export interface UpdateDocumentReadingPositionInput {
  documentId: string;
  pageNumber: number;
}

export interface SaveDocumentNoteInput {
  documentId: string;
  pageNumber: number;
  content: string;
}

export interface DeleteDocumentNoteInput {
  documentId: string;
  pageNumber: number;
}

export interface UpdateDocumentPublicAccessInput {
  documentId: string;
  isPublic: boolean;
}
