import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companyApi } from './api.js';

export const companyKeys = {
  all: ['companies'],
  detail: (id) => ['companies', id],
  options: ['companies', 'options'],
};

export function useCompanies(query) {
  return useQuery({ queryKey: [...companyKeys.all, 'list', query], queryFn: () => companyApi.list(query) });
}

export function useCompanyOptions() {
  return useQuery({ queryKey: companyKeys.options, queryFn: companyApi.options, staleTime: 5 * 60 * 1000 });
}

export function useCompany(id) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companyApi.get(id),
    enabled: Boolean(id),
  });
}

function useCompanyMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.all }),
  });
}

export const useCreateCompany = () => useCompanyMutation(companyApi.create);
export const useUpdateCompany = () =>
  useCompanyMutation(({ id, payload }) => companyApi.update(id, payload));
export const useDeleteCompany = () => useCompanyMutation(companyApi.remove);
