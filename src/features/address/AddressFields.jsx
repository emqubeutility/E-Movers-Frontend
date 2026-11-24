import { Controller } from 'react-hook-form';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import { useCities, useCountries, useStates } from '../user/lookups.js';

/**
 * Country, state, city, street and postal code. Put it inside a FormSection with four columns:
 * the street line covers `streetSpan` (2 or 3) of them.
 */
export default function AddressFields({
  control,
  register,
  errors,
  setValue,
  watch,
  streetSpan = 3,
  multiline = false,
}) {
  const countryId = watch('countryId');
  const stateId = watch('stateId');
  const countries = useCountries();
  const states = useStates(countryId);
  const cities = useCities(countryId, stateId);

  return (
    <>
      <Field label="Country" error={errors.countryId?.message}>
        <Controller
          control={control}
          name="countryId"
          render={({ field }) => (
            <Dropdown
              search
              clearable
              placeholder="Select country"
              options={countries.data ?? []}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                // States and cities belong to one country, so a new country clears them.
                setValue('stateId', '');
                setValue('cityId', '');
              }}
              aria-label="Country"
            />
          )}
        />
      </Field>
      <Field label="State / emirate" error={errors.stateId?.message}>
        <Controller
          control={control}
          name="stateId"
          render={({ field }) => (
            <Dropdown
              search
              clearable
              disabled={!countryId}
              placeholder={countryId ? 'Select state' : 'Select a country first'}
              options={states.data ?? []}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                setValue('cityId', '');
              }}
              aria-label="State"
            />
          )}
        />
      </Field>
      <Field label="City" error={errors.cityId?.message}>
        <Controller
          control={control}
          name="cityId"
          render={({ field }) => (
            <Dropdown
              search
              clearable
              disabled={!countryId}
              placeholder={countryId ? 'Select city' : 'Select a country first'}
              options={cities.data ?? []}
              value={field.value}
              onChange={field.onChange}
              aria-label="City"
            />
          )}
        />
      </Field>
      <Field label="Postal code" error={errors.postalCode?.message}>
        <input className="input" autoComplete="postal-code" {...register('postalCode')} />
      </Field>
      <Field
        label="Address"
        error={errors.addressText?.message}
        className={streetSpan === 2 ? 'span-2' : 'span-3'}
      >
        {multiline ? (
          <textarea className="input" rows={6} maxLength={512} {...register('addressText')} />
        ) : (
          <input className="input" autoComplete="street-address" {...register('addressText')} />
        )}
      </Field>
    </>
  );
}
