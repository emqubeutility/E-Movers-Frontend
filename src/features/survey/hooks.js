import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';

// Under the service-request key, so request changes refresh the survey too (and back).
const keyOf = (id) => ['service-requests', id, 'survey'];
const url = (id) => `/service-requests/${id}/survey`;

export const surveyApi = {
  get: (id) => unwrap(api.get(url(id))),
  save: (id, payload) => unwrap(api.put(url(id), payload)),
  complete: (id, payload) => unwrap(api.post(`${url(id)}/complete`, payload)),
  drop: (id, payload) => unwrap(api.post(`${url(id)}/drop`, payload)),
};

/** { request, survey, volumeUnit, furnitureUnit } of a request in the survey stage. */
export function useSurvey(id) {
  return useQuery({ queryKey: keyOf(id), queryFn: () => surveyApi.get(id), enabled: Boolean(id) });
}

/** Dropdowns the survey page uses ({ value: id as text, label }). */
export const SURVEY_LOOKUPS = ['SPECIAL_REQUISITE', 'SURVEY_DROP_REASON', 'RESIDENCE_TYPE'];
export function useSurveyLookups() {
  return useQuery({
    queryKey: ['dropdowns', ...SURVEY_LOOKUPS],
    queryFn: async () => {
      const data = await unwrap(
        api.get('/dropdowns', { params: { types: SURVEY_LOOKUPS.join(',') } }),
      );
      return Object.fromEntries(
        SURVEY_LOOKUPS.map((type) => [
          type,
          (data[type] ?? []).map((row) => ({ value: String(row.value), label: row.label })),
        ]),
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useSurveyMutation(call) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => call(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-requests'] }),
  });
}

export const useSaveSurvey = () => useSurveyMutation(surveyApi.save);
export const useCompleteSurvey = () => useSurveyMutation(surveyApi.complete);
export const useDropSurvey = () => useSurveyMutation(surveyApi.drop);
