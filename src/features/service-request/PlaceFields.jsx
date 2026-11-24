import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import { useAreas, useCities, useCountries } from '../user/lookups.js';

/**
 * One end of the move: `place` is 'from' or 'to'.
 * Local moves (`localCountryId` set: the organization's country) pick a city and an area of that
 * country; international moves pick a country and a city.
 */
export default function PlaceFields({
  place,
  title,
  control,
  register,
  errors,
  setValue,
  watch,
  localCountryId = '',
  defaultCityId = '',
  required = false,
}) {
  const name = (field) => `${place}${field}`;
  const local = Boolean(localCountryId);
  const countryId = watch(name('CountryId'));
  const cityId = watch(name('CityId'));
  const countries = useCountries();
  const cities = useCities(countryId, '');
  const areas = useAreas(local ? cityId : '');

  // A local move always happens in the organization's country.
  useEffect(() => {
    if (!local || countryId === localCountryId) return;
    setValue(name('CountryId'), localCountryId);
    if (countryId) {
      setValue(name('CityId'), '');
      setValue(name('AreaId'), '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, localCountryId, countryId]);

  // A local move starts in the organization's city; the user can still change it.
  useEffect(() => {
    if (local && defaultCityId && countryId === localCountryId && !cityId) {
      setValue(name('CityId'), defaultCityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, defaultCityId, countryId, localCountryId]);

  // International moves have no area.
  useEffect(() => {
    if (!local && watch(name('AreaId'))) setValue(name('AreaId'), '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const pick = (field, options, placeholder, disabled, onPicked) => (
    <Controller
      control={control}
      name={name(field)}
      render={({ field: input }) => (
        <Dropdown
          search
          clearable
          disabled={disabled}
          placeholder={placeholder}
          options={options}
          value={input.value}
          onChange={(value) => {
            input.onChange(value);
            onPicked?.();
          }}
          aria-label={`${title} ${field.replace('Id', '').toLowerCase()}`}
        />
      )}
    />
  );

  return (
    <div className="place-card">
      <h4 className="place-title">{title}</h4>
      <Field label="Address" required={required} error={errors[name('AddressText')]?.message}>
        <textarea className="input" rows="2" {...register(name('AddressText'))} />
      </Field>
      {!local && (
        <Field label="Country" error={errors[name('CountryId')]?.message}>
          {pick('CountryId', countries.data ?? [], 'Select country', false, () =>
            setValue(name('CityId'), ''),
          )}
        </Field>
      )}
      <Field label="City" required={required} error={errors[name('CityId')]?.message}>
        {pick(
          'CityId',
          cities.data ?? [],
          countryId ? 'Select city' : 'Select a country first',
          !countryId,
          () => setValue(name('AreaId'), ''),
        )}
      </Field>
      {local && (
        <Field label="Area" error={errors[name('AreaId')]?.message}>
          {pick(
            'AreaId',
            areas.data ?? [],
            cityId ? 'Select area' : 'Select a city first',
            !cityId,
          )}
        </Field>
      )}
    </div>
  );
}
