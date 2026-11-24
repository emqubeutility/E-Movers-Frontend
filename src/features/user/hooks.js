import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from './api.js';

const OPTIONS_STALE_MS = 5 * 60_000;

export const userKeys = {
  all: ['users'],
  list: (params) => ['users', 'list', params],
  summary: ['users', 'summary'],
  detail: (id) => ['users', id],
  roleOptions: ['users', 'role-options'],
};

export function useUsers(params) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.list(params),
    placeholderData: keepPreviousData, // old rows stay visible while the next page loads
  });
}

export function useUserSummary() {
  return useQuery({ queryKey: userKeys.summary, queryFn: userApi.summary });
}

export function useUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.get(id),
    enabled: Boolean(id),
  });
}

/** Roles a user can be given, for the role dropdown in the user form. */
export function useRoleOptions() {
  return useQuery({
    queryKey: userKeys.roleOptions,
    queryFn: userApi.roles,
    staleTime: OPTIONS_STALE_MS,
  });
}

function useUserMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export const useCreateUser = () => useUserMutation((payload) => userApi.create(payload));
export const useUpdateUser = () =>
  useUserMutation(({ id, payload }) => userApi.update(id, payload));
export const useDeleteUser = () => useUserMutation((id) => userApi.remove(id));
