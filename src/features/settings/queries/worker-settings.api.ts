import { apiClient } from "@/lib/api/http-client";
import type {
  UpdateWorkerSettingsInput,
  WorkerSettings,
} from "../types/worker-settings.types";

export async function getWorkerSettings(): Promise<WorkerSettings> {
  const response = await apiClient.get<WorkerSettings>("/worker-settings");

  return response.data;
}

export async function updateWorkerSettings(
  input: UpdateWorkerSettingsInput,
): Promise<WorkerSettings> {
  const response = await apiClient.patch<WorkerSettings>(
    "/worker-settings",
    input,
  );

  return response.data;
}

