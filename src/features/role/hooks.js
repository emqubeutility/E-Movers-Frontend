import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionKeys } from '../auth/permissions.js';
import { userKeys } from '../user/hooks.js';
import { roleApi } from './api.js';

export const roleKeys = {
  all: ['roles'],
  detail: (id) => ['roles', id],
  menus: ['roles', 'menus'],
};

export function useRoles() {
  return useQuery({ queryKey: roleKeys.all, queryFn: roleApi.list });
}

export function useRoleMenus() {
  return useQuery({ queryKey: roleKeys.menus, queryFn: roleApi.listMenus });
}

export function useRole(id) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleApi.get(id),
    enabled: Boolean(id),
  });
}

function useRoleMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      // The user form's role dropdown is built from this list.
      queryClient.invalidateQueries({ queryKey: userKeys.roleOptions });
      // Grants can change the screens and buttons the signed-in administrator sees.
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

export const useCreateRole = () => useRoleMutation(roleApi.create);
export const useUpdateRole = () =>
  useRoleMutation(({ id, payload }) => roleApi.update(id, payload));
