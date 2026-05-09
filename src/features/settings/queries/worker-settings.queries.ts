import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorkerSettings,
  updateWorkerSettings,
} from "./worker-settings.api";

export const workerSettingsQueryKeys = {
  all: ["worker-settings"] as const,
  detail: () => [...workerSettingsQueryKeys.all, "detail"] as const,
};

export function useWorkerSettingsQuery() {
  return useQuery({
    queryKey: workerSettingsQueryKeys.detail(),
    queryFn: getWorkerSettings,
  });
}

export function useUpdateWorkerSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkerSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(workerSettingsQueryKeys.detail(), settings);
      await queryClient.invalidateQueries({
        queryKey: workerSettingsQueryKeys.detail(),
      });
    },
  });
}

