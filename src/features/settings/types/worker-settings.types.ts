export interface WorkerSettings {
  id: string;
  ocrLanguage: string;
  ocrDpi: number;
  ocrPsm: number;
  ocrPdfOutputEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkerSettingsInput {
  ocrLanguage?: string;
  ocrDpi?: number;
  ocrPsm?: number;
  ocrPdfOutputEnabled?: boolean;
}

