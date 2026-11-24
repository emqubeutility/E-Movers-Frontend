import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';
import { userApi } from './api.js';

const STALE = 10 * 60 * 1000;
const LIMIT = 100;
const get = (path, params) => unwrap(api.get(path, { params }));
const asOptions = (rows) => rows.map((row) => ({ value: String(row.value), label: row.label }));

/** Dropdown lists for the user form. Ids are strings so they match the form's values. */
export function useCountries() {
  return useQuery({
    queryKey: ['geo', 'countries'],
    queryFn: async () => asOptions(await get('/countries/options', { limit: LIMIT })),
    staleTime: STALE,
  });
}

/** States of one country; nothing is fetched until a country is chosen. */
export function useStates(countryId) {
  return useQuery({
    queryKey: ['geo', 'states', countryId],
    queryFn: async () => asOptions(await get('/states/options', { countryId, limit: LIMIT })),
    enabled: Boolean(countryId),
    staleTime: STALE,
  });
}

/** Areas of a city. */
export function useAreas(cityId) {
  return useQuery({
    queryKey: ['geo', 'areas', cityId],
    queryFn: async () => asOptions(await get('/areas/options', { cityId, limit: LIMIT })),
    enabled: Boolean(cityId),
    staleTime: STALE,
  });
}

/** Cities of a country, narrowed to the state when one is chosen. */
export function useCities(countryId, stateId) {
  return useQuery({
    queryKey: ['geo', 'cities', countryId, stateId ?? ''],
    queryFn: async () =>
      asOptions(
        await get('/cities/options', { countryId, ...(stateId && { stateId }), limit: LIMIT }),
      ),
    enabled: Boolean(countryId),
    staleTime: STALE,
  });
}

/** Active contractor companies; the contractor of an outsourced employee is picked from these. */
export function useContractors(enabled = true) {
  return useQuery({
    queryKey: ['companies', 'contractors'],
    queryFn: async () => {
      const page = await get('/companies', {
        companyType: 'CONTRACTOR',
        status: 'ACTIVE',
        limit: LIMIT,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      // The organization comes along so the form can list only the contractors of the chosen ones.
      return page.items.map((row) => ({
        value: row.id,
        label: row.name,
        organizationId: String(row.organizationId),
      }));
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Nationalities are sent by code (e.g. IN), so the option value is the code. */
export function useNationalities() {
  return useQuery({
    queryKey: ['geo', 'nationalities'],
    queryFn: async () => {
      const page = await get('/nationalities', { limit: LIMIT, sortBy: 'name', sortOrder: 'asc' });
      return page.items.map((row) => ({ value: row.code, label: row.name }));
    },
    staleTime: STALE,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ['dropdowns', 'SKILL'],
    queryFn: async () =>
      (await get('/dropdowns', { types: 'SKILL' })).SKILL.map((row) => ({
        value: row.code,
        label: row.label,
      })),
    staleTime: STALE,
  });
}

/** Employees who can be picked as crew (active, with a skill). */
export function useCrewCandidates(params) {
  return useQuery({
    queryKey: ['users', 'crew', params],
    queryFn: () => userApi.crew(params),
    staleTime: 30 * 1000,
  });
}
