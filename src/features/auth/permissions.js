import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ACTION } from '../../lib/permissions.js';
import { authApi } from './api.js';
import { useAuth } from './AuthContext.jsx';

export const permissionKeys = { all: ['permissions'] };

/** A menu is allowed only when the API granted that exact action on it. */
export function allows(menus, code, action = ACTION.VIEW) {
  return menus.some((menu) => menu.code === code && menu[action] === true);
}

/**
 * The signed-in user's grants, as resolved by the server from `menu_role`. Absent menus and
 * actions are denied, so a screen must never assume access before this has loaded.
 */
export function usePermissions() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: permissionKeys.all,
    queryFn: authApi.permissions,
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const menus = useMemo(() => query.data?.menus ?? [], [query.data]);
  const can = useCallback((code, action = ACTION.VIEW) => allows(menus, code, action), [menus]);

  return {
    menus,
    role: query.data?.role ?? null,
    isSuperAdmin: query.data?.isSuperAdmin ?? false,
    isLoading: status === 'authenticated' && query.isPending,
    can,
  };
}
