import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, listUsers, updateUser } from "./users.api";
import type { UserItem } from "../types/user.types";

export const userQueryKeys = {
  all: ["users"] as const,
  lists: () => [...userQueryKeys.all, "list"] as const,
  detail: (userId: string) => [...userQueryKeys.all, "detail", userId] as const,
};

export function useUsersQuery(enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.lists(),
    queryFn: listUsers,
    enabled,
  });
}

export function useUserQuery(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? userQueryKeys.detail(userId)
      : [...userQueryKeys.all, "detail", "missing"],
    queryFn: () => getUser(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: async (user) => {
      queryClient.setQueryData<UserItem | undefined>(
        userQueryKeys.detail(user.id),
        user,
      );
      queryClient.setQueryData<UserItem[] | undefined>(
        userQueryKeys.lists(),
        (users) =>
          users?.map((item) => (item.id === user.id ? user : item)) ?? users,
      );
      await queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
  });
}
