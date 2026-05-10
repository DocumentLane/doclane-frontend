import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGroup, listGroups, updateGroup } from "./groups.api";
import type { GroupItem } from "../types/group.types";

export const groupQueryKeys = {
  all: ["groups"] as const,
  lists: () => [...groupQueryKeys.all, "list"] as const,
};

export function useGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: groupQueryKeys.lists(),
    queryFn: listGroups,
    enabled,
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.lists() });
    },
  });
}

export function useUpdateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGroup,
    onSuccess: async (group) => {
      queryClient.setQueryData<GroupItem[] | undefined>(
        groupQueryKeys.lists(),
        (groups) =>
          groups?.map((item) => (item.id === group.id ? group : item)) ?? groups,
      );
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.lists() });
    },
  });
}
