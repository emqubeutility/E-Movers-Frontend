import { api, unwrap } from '../../services/api.js';

export const authApi = {
  login: (credentials) => unwrap(api.post('/auth/login', credentials)),
  switchOrganization: (organizationId) =>
    unwrap(api.post('/auth/switch-organization', { organizationId })),
  logout: () => unwrap(api.post('/auth/logout')),
  permissions: () => unwrap(api.get('/permissions')),
};
