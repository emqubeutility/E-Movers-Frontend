import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionKeys } from '../auth/permissions.js';
import { roleKeys } from '../role/hooks.js';
import { menuAccessApi } from './api.js';

export const menuAccessKeys = {
  all: ['menu-access'],
  role: (roleId) => ['menu-access', 'role', roleId],
  functions: ['menu-access', 'functions'],
  function: (functionId) => ['menu-access', 'function', functionId],
};

export function useRoleMenuAccess(roleId) {
  return useQuery({
    queryKey: menuAccessKeys.role(roleId),
    queryFn: () => menuAccessApi.roleMenus(roleId),
    enabled: Boolean(roleId),
  });
}

export function useMenuFunctions() {
  return useQuery({ queryKey: menuAccessKeys.functions, queryFn: menuAccessApi.functions });
}

export function useFunctionMenuAccess(functionId) {
  return useQuery({
    queryKey: menuAccessKeys.function(functionId),
    queryFn: () => menuAccessApi.functionMenus(functionId),
    enabled: Boolean(functionId),
  });
}

function useMenuAccessMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuAccessKeys.all });
      // Role rows carry the action flags, and the sidebar/buttons read the resolved grants.
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

export const useSaveRoleMenuAccess = () =>
  useMenuAccessMutation(({ roleId, grants }) => menuAccessApi.saveRoleMenus(roleId, grants));

export const useSaveFunctionMenuAccess = () =>
  useMenuAccessMutation(({ functionId, menuItemIds }) =>
    menuAccessApi.saveFunctionMenus(functionId, menuItemIds),
  );
