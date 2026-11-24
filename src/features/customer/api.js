import { api, unwrap } from '../../services/api.js';

export const customerApi = {
  list: (query) => unwrap(api.get('/customers', { params: query })),
  options: () => unwrap(api.get('/customers/options')),
  get: (id) => unwrap(api.get(`/customers/${id}`)),
  create: (payload) => unwrap(api.post('/customers', payload)),
  update: (id, payload) => unwrap(api.put(`/customers/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/customers/${id}`)),
};
