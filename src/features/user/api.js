import { api, unwrap } from '../../services/api.js';

/** Drops empty values so they are not sent as empty query parameters. */
function compact(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );
}

export const userApi = {
  list: (params) => unwrap(api.get('/users', { params: compact(params) })),
  summary: () => unwrap(api.get('/users/summary')),
  get: (id) => unwrap(api.get(`/users/${id}`)),
  me: () => unwrap(api.get('/users/me')),
  roles: () => unwrap(api.get('/users/roles')),
  crew: (params) => unwrap(api.get('/users/crew', { params: compact(params) })),
  create: (payload) => unwrap(api.post('/users', payload)),
  update: (id, payload) => unwrap(api.put(`/users/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
};
