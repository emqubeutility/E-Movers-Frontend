import { api, unwrap } from '../../services/api.js';

export const menuAccessApi = {
  roleMenus: (roleId) => unwrap(api.get(`/menu-access/roles/${roleId}`)),
  saveRoleMenus: (roleId, grants) => unwrap(api.put(`/menu-access/roles/${roleId}`, { grants })),
  functions: () => unwrap(api.get('/menu-access/functions')),
  functionMenus: (functionId) => unwrap(api.get(`/menu-access/functions/${functionId}`)),
  saveFunctionMenus: (functionId, menuItemIds) =>
    unwrap(api.put(`/menu-access/functions/${functionId}`, { menuItemIds })),
};
