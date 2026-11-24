import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';
import { customerApi } from './api.js';

/** Dropdown values of one parameter type as { value: code, label }. */
function useParamOptions(type) {
  return useQuery({
    queryKey: ['dropdowns', type],
    queryFn: async () =>
      (await unwrap(api.get('/dropdowns', { params: { types: type } })))[type].map((row) => ({
        value: row.code,
        label: row.label,
      })),
    staleTime: 5 * 60 * 1000,
  });
}

export const useGenders = () => useParamOptions('GENDER');
export const useAgeGroups = () => useParamOptions('AGE_GROUP');

export const customerKeys = {
  all: ['customers'],
  detail: (id) => ['customers', id],
  options: ['customers', 'options'],
};

export function useCustomers(query) {
  return useQuery({
    queryKey: [...customerKeys.all, 'list', query],
    queryFn: () => customerApi.list(query),
  });
}

export function useCustomerOptions() {
  return useQuery({
    queryKey: customerKeys.options,
    queryFn: customerApi.options,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerApi.get(id),
    enabled: Boolean(id),
  });
}

function useCustomerMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export const useCreateCustomer = () => useCustomerMutation(customerApi.create);
export const useUpdateCustomer = () =>
  useCustomerMutation(({ id, payload }) => customerApi.update(id, payload));
export const useDeleteCustomer = () => useCustomerMutation(customerApi.remove);
