import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';

/** The generic CRUD endpoints of one table: parameter types or parameter values. */
export const paramApi = (resource) => ({
  get: (id) => unwrap(api.get(`/${resource}/${id}`)),
  list: (query) => unwrap(api.get(`/${resource}`, { params: query })),
  create: (payload) => unwrap(api.post(`/${resource}`, payload)),
  update: (id, payload) => unwrap(api.put(`/${resource}/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/${resource}/${id}`)),
  options: (params) =>
    unwrap(api.get(`/${resource}/options`, { params: { limit: 100, ...params } })),
});

export function useParamList(resource, query) {
  return useQuery({
    queryKey: ['param', resource, 'list', query],
    queryFn: () => paramApi(resource).list(query),
  });
}

export function useParamRecord(resource, id) {
  return useQuery({
    queryKey: ['param', resource, 'one', id],
    queryFn: () => paramApi(resource).get(id),
    enabled: Boolean(id),
  });
}

/** Parameter types as { value, label } with the id as text, so they match form values. */
export function useTypeOptions(enabled = true) {
  return useQuery({
    queryKey: ['param', 'parameter-types', 'options'],
    queryFn: async () =>
      (await paramApi('parameter-types').options()).map((row) => ({
        value: String(row.value),
        label: row.label,
      })),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useParamMutation(fn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Every dropdown in the app reads these tables.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['param'] });
      queryClient.invalidateQueries({ queryKey: ['dropdowns'] });
    },
  });
}
