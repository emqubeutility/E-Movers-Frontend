import { api, unwrap } from '../../services/api.js';

export const companyApi = {
  list: (query) => unwrap(api.get('/companies', { params: query })),
  options: () => unwrap(api.get('/companies/options')),
  get: (id) => unwrap(api.get(`/companies/${id}`)),
  create: (payload) => unwrap(api.post('/companies', payload)),
  update: (id, payload) => unwrap(api.put(`/companies/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/companies/${id}`)),
};
