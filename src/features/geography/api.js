import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';

const OPTION_LIMIT = 100;

/** The generic CRUD endpoints of one geography table: countries, states or cities. */
export const geoApi = (resource) => ({
  list: (query) => unwrap(api.get(`/${resource}`, { params: query })),
  create: (payload) => unwrap(api.post(`/${resource}`, payload)),
  update: (id, payload) => unwrap(api.put(`/${resource}/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/${resource}/${id}`)),
  options: (params) => unwrap(api.get(`/${resource}/options`, { params: { limit: OPTION_LIMIT, ...params } })),
});

export function useGeoList(resource, query) {
  return useQuery({ queryKey: ['geo', resource, 'list', query], queryFn: () => geoApi(resource).list(query) });
}

/** Dropdown options as { value, label } with the id as text, so they match form values. */
export function useGeoOptions(resource, params = {}, enabled = true) {
  return useQuery({
    queryKey: ['geo', resource, 'options', params],
    queryFn: async () =>
      (await geoApi(resource).options(params)).map((row) => ({ value: String(row.value), label: row.label })),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGeoMutation(resource, fn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Lists, dropdowns and the user form's country list all read these tables.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geo'] }),
  });
}
