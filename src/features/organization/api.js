import { api, unwrap } from '../../services/api.js';

export const organizationApi = {
  list: (query) => unwrap(api.get('/organizations', { params: query })),
  options: () => unwrap(api.get('/organizations/options')),
  get: (id) => unwrap(api.get(`/organizations/${id}`)),
  create: (payload) => unwrap(api.post('/organizations', payload)),
  update: (id, payload) => unwrap(api.put(`/organizations/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/organizations/${id}`)),
};
