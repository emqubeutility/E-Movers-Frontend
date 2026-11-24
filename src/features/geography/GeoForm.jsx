import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import { ErrorAlert } from '../../components/ui/Display.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useApiFormErrors } from '../../hooks/useApiFormErrors.js';
import { useGeoOptions } from './api.js';

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const name = z
  .string()
  .trim()
  .min(2, 'Enter at least 2 characters')
  .max(100, 'Use at most 100 characters');
const nameText = name.refine(
  (value) => /^[\p{L}][\p{L}\s.'()-]*$/u.test(value),
  'Use letters only',
);
const required = (message) => z.string().min(1, message);

/** Fields of each table's form. `kind` picks the input; ids are kept as text inside the form. */
const FORMS = {
  countries: {
    singular: 'country',
    fields: [
      { name: 'name', label: 'Name', rule: nameText },
      {
        name: 'iso2',
        label: 'Country code',
        rule: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{2}$/, 'Use 2 letters, e.g. AE'),
        upper: true,
        maxLength: 2,
        placeholder: 'AE',
      },
    ],
  },
  states: {
    singular: 'state',
    fields: [
      {
        name: 'countryId',
        label: 'Country',
        kind: 'country',
        rule: required('Select the country'),
      },
      { name: 'name', label: 'Name', rule: nameText },
      {
        name: 'code',
        label: 'Code',
        optional: true,
        rule: z
          .string()
          .trim()
          .max(10, 'Use at most 10 characters')
          .regex(/^[A-Za-z0-9-]*$/, 'Use letters and numbers only'),
      },
    ],
  },
  cities: {
    singular: 'city',
    fields: [
      {
        name: 'countryId',
        label: 'Country',
        kind: 'country',
        rule: required('Select the country'),
      },
      { name: 'stateId', label: 'State', kind: 'state', optional: true, rule: z.string() },
      { name: 'name', label: 'Name', rule: nameText },
    ],
  },
};

const buildSchema = (resource) =>
  z.object({
    ...Object.fromEntries(FORMS[resource].fields.map((field) => [field.name, field.rule])),
    isActive: z.string().min(1, 'Select a status'),
  });

const idText = (value) => (value === null || value === undefined ? '' : String(value));

function toValues(resource, row) {
  const values = { isActive: row ? String(row.isActive) : 'true' };
  FORMS[resource].fields.forEach((field) => {
    values[field.name] = row ? idText(row[field.name]) : '';
  });
  return values;
}

/** The API wants numbers for ids and no empty optional fields. */
function toPayload(resource, values) {
  const payload = { isActive: values.isActive === 'true' };
  FORMS[resource].fields.forEach((field) => {
    const value = values[field.name];
    if (field.kind) {
      if (value) payload[field.name] = Number(value);
    } else if (value || !field.optional) {
      payload[field.name] = value;
    }
  });
  return payload;
}

/** Add / edit popup for one geography row. `row` is null when adding. */
export default function GeoForm({ resource, row, open, onClose, onSubmit, submitting, error }) {
  const config = FORMS[resource];
  const { fieldErrors, formError } = useApiFormErrors(error);
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(buildSchema(resource)),
    defaultValues: toValues(resource, row),
  });

  useEffect(() => {
    if (open) reset(toValues(resource, row));
  }, [open, resource, row, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
  }, [fieldErrors, setError]);

  const countryId = watch('countryId');
  const countries = useGeoOptions(
    'countries',
    {},
    open && config.fields.some((field) => field.kind),
  );
  const states = useGeoOptions(
    'states',
    { countryId },
    open && Boolean(countryId) && resource === 'cities',
  );

  const title = `${row ? 'Edit' : 'New'} ${config.singular}`;

  function renderInput(field) {
    if (field.kind === 'country' || field.kind === 'state') {
      const isCountry = field.kind === 'country';
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: bound }) => (
            <Dropdown
              search
              clearable={!isCountry}
              placeholder={
                isCountry ? 'Select country' : countryId ? 'Select state' : 'Select a country first'
              }
              options={(isCountry ? countries.data : states.data) ?? []}
              value={bound.value}
              disabled={!isCountry && !countryId}
              onChange={(value) => {
                bound.onChange(value);
                // A state belongs to one country, so changing the country clears it.
                if (isCountry && resource === 'cities') setValue('stateId', '');
              }}
              aria-label={field.label}
            />
          )}
        />
      );
    }
    return (
      <input
        className="input"
        autoComplete="off"
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        style={field.upper ? { textTransform: 'uppercase' } : undefined}
        {...register(field.name)}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      locked={submitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {(!row || isDirty) && (
            <Button type="submit" form="geo-form" loading={submitting}>
              {row ? 'Save' : 'Create'}
            </Button>
          )}
        </>
      }
    >
      <form
        id="geo-form"
        style={{ display: 'grid', gap: 16 }}
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(toPayload(resource, values)))}
      >
        <ErrorAlert message={formError} />
        {config.fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            required={!field.optional}
            error={errors[field.name]?.message}
          >
            {renderInput(field)}
          </Field>
        ))}
        <Field label="Status" required error={errors.isActive?.message}>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Dropdown
                options={ACTIVE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                aria-label="Status"
              />
            )}
          />
        </Field>
      </form>
    </Modal>
  );
}
