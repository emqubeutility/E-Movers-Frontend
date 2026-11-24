import { api, unwrap } from '../../services/api.js';

export const roleApi = {
  list: () => unwrap(api.get('/roles')),
  listMenus: () => unwrap(api.get('/roles/menus')),
  get: (id) => unwrap(api.get(`/roles/${id}`)),
  create: (payload) => unwrap(api.post('/roles', payload)),
  update: (id, payload) => unwrap(api.put(`/roles/${id}`, payload)),
};
