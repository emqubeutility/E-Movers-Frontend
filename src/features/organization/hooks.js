import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';
import { organizationApi } from './api.js';

const ALL = ['organizations'];

export const useOrganizations = (query) =>
  useQuery({ queryKey: [...ALL, 'list', query], queryFn: () => organizationApi.list(query) });

/** Organizations for a dropdown: [{ value, label }]. */
export const useOrganizationOptions = (enabled = true) =>
  useQuery({
    queryKey: [...ALL, 'options'],
    queryFn: organizationApi.options,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

/** Lookups the organization form needs: [{ value, label }]. */
export const useVolumeUoms = () =>
  useQuery({
    queryKey: ['dropdowns', 'VOLUME_UOM'],
    queryFn: async () =>
      (await unwrap(api.get('/dropdowns', { params: { types: 'VOLUME_UOM' } }))).VOLUME_UOM.map(
        (row) => ({ value: row.code, label: row.label }),
      ),
    staleTime: 5 * 60 * 1000,
  });

const useCrudOptions = (path) =>
  useQuery({
    queryKey: [path, 'options'],
    queryFn: async () =>
      (await unwrap(api.get(`/${path}/options`, { params: { limit: 500 } }))).map((row) => ({
        value: String(row.value),
        label: row.label,
      })),
    staleTime: 5 * 60 * 1000,
  });

export const useCurrencies = () => useCrudOptions('currencies');
export const useTimeZones = () => useCrudOptions('time-zones');

export const useOrganization = (id) =>
  useQuery({
    queryKey: [...ALL, id],
    queryFn: () => organizationApi.get(id),
    enabled: Boolean(id),
  });

function useOrganizationMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALL }),
  });
}

export const useCreateOrganization = () => useOrganizationMutation(organizationApi.create);
export const useUpdateOrganization = () =>
  useOrganizationMutation(({ id, payload }) => organizationApi.update(id, payload));
export const useDeleteOrganization = () => useOrganizationMutation(organizationApi.remove);
