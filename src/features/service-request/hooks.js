import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';

const BASE = '/service-requests';
const KEY = ['service-requests'];
const STALE = 5 * 60 * 1000;

export const serviceRequestApi = {
  list: (query) => unwrap(api.get(BASE, { params: query })),
  options: (params) => unwrap(api.get(`${BASE}/options`, { params })),
  get: (id) => unwrap(api.get(`${BASE}/${id}`)),
  create: (payload) => unwrap(api.post(BASE, payload)),
  update: (id, payload) => unwrap(api.put(`${BASE}/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`${BASE}/${id}`)),
  logs: (id) => unwrap(api.get(`${BASE}/${id}/logs`)),
  contacted: (id, payload) => unwrap(api.post(`${BASE}/${id}/contacted`, payload)),
  drop: (id, payload) => unwrap(api.post(`${BASE}/${id}/drop`, payload)),
};

/** Dropdown types the form uses; each value is { value: id as text, code, label }. */
export const REQUEST_LOOKUPS = [
  'INTERNATIONAL_SERVICE_TYPE',
  'RESIDENCE_TYPE',
  'ENQUIRY_CHANNEL',
  'REFERRAL',
  'SURVEY_TYPE',
  'REQUEST_STAGE',
  'REQUEST_STATUS',
  'ENQUIRY_DROP_REASON',
];

export function useRequestLookups() {
  return useQuery({
    queryKey: ['dropdowns', ...REQUEST_LOOKUPS],
    queryFn: async () => {
      const data = await unwrap(
        api.get('/dropdowns', { params: { types: REQUEST_LOOKUPS.join(',') } }),
      );
      return Object.fromEntries(
        REQUEST_LOOKUPS.map((type) => [
          type,
          (data[type] ?? []).map((row) => ({
            value: String(row.value),
            code: row.code,
            label: row.label,
            // Stage and status logic uses these (see lib/requestStatus.js).
            parameterValue: row.parameterValue,
            parentValue: row.parentValue,
          })),
        ]),
      );
    },
    staleTime: STALE,
  });
}

/** Executives, services and service groups ({ value: id as text, code, label }). */
export function useRequestOptions() {
  return useQuery({
    queryKey: [...KEY, 'options'],
    queryFn: async () => {
      const data = await serviceRequestApi.options();
      return {
        ...data,
        serviceGroups: data.serviceGroups.map((group) => ({
          value: String(group.id),
          code: group.code,
          label: group.name,
          fileId: group.fileId,
        })),
      };
    },
    staleTime: STALE,
  });
}

/** One organization's executives and country ({ executives, countryId }). */
export function useOfficeExecutives(officeId, enabled) {
  return useQuery({
    queryKey: [...KEY, 'office', officeId],
    queryFn: async () => {
      const data = await serviceRequestApi.options({ organizationId: officeId });
      return { executives: data.executives, countryId: data.countryId, cityId: data.cityId };
    },
    enabled: Boolean(enabled && officeId),
    staleTime: STALE,
  });
}

/** Customers to choose from (the first 100, searched in the dropdown). */
export function useCustomerChoices() {
  return useQuery({
    queryKey: ['customers', 'choices'],
    queryFn: async () =>
      (
        await unwrap(
          api.get('/customers', { params: { limit: 100, sortBy: 'name', sortOrder: 'asc' } }),
        )
      ).items.map((row) => ({
        value: row.id,
        label: row.code ? `${row.name} (${row.code})` : row.name,
        customer: row,
      })),
    staleTime: STALE,
  });
}

export function useServiceRequests(query) {
  return useQuery({
    queryKey: [...KEY, 'list', query],
    queryFn: () => serviceRequestApi.list(query),
  });
}

export function useServiceRequest(id) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => serviceRequestApi.get(id),
    enabled: Boolean(id),
  });
}

/** The request's history, newest first (loaded when the timeline opens). */
export function useRequestLogs(id, enabled) {
  return useQuery({
    queryKey: [...KEY, id, 'logs'],
    queryFn: () => serviceRequestApi.logs(id),
    enabled: Boolean(id && enabled),
  });
}

function useRequestMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export const useCreateServiceRequest = () => useRequestMutation(serviceRequestApi.create);
export const useUpdateServiceRequest = () =>
  useRequestMutation(({ id, payload }) => serviceRequestApi.update(id, payload));
export const useDeleteServiceRequest = () => useRequestMutation(serviceRequestApi.remove);
export const useMarkContacted = () =>
  useRequestMutation(({ id, payload }) => serviceRequestApi.contacted(id, payload));
export const useDropRequest = () =>
  useRequestMutation(({ id, payload }) => serviceRequestApi.drop(id, payload));
