import { z } from 'zod';

export const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const code = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Enter at least 2 characters')
  .max(60, 'Use at most 60 characters')
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    'Use capital letters, numbers and underscores, starting with a letter',
  );
const name = (max) =>
  z.string().trim().min(2, 'Enter at least 2 characters').max(max, `Use at most ${max} characters`);
const description = z.string().trim().max(500, 'Use at most 500 characters');
const order = z.string().regex(/^\d{1,4}$/, 'Enter a number from 0 to 9999');

export const typeSchema = z.object({
  code,
  name: name(150),
  description,
  allowUserValues: z.boolean(),
  isActive: z.string().min(1, 'Select a status'),
});

export const valueSchema = z.object({
  parameterTypeId: z.string().min(1, 'Select the dropdown type'),
  code,
  label: name(250),
  description,
  displayOrder: order,
  colorHex: z
    .string()
    .trim()
    .regex(/^(#[0-9A-Fa-f]{6})?$/, 'Use a colour like #90191C'),
  isDefault: z.boolean(),
  isActive: z.string().min(1, 'Select a status'),
});

const text = (value) => (value === null || value === undefined ? '' : String(value));

export function toValues(resource, row) {
  if (resource === 'parameter-types') {
    return {
      code: text(row?.code),
      name: text(row?.name),
      description: text(row?.description),
      allowUserValues: row?.allowUserValues ?? false,
      isActive: row ? String(row.isActive) : 'true',
    };
  }
  return {
    parameterTypeId: text(row?.parameterTypeId),
    code: text(row?.code),
    label: text(row?.label),
    description: text(row?.description),
    displayOrder: row ? text(row.displayOrder) : '0',
    colorHex: text(row?.colorHex),
    isDefault: row?.isDefault ?? false,
    isActive: row ? String(row.isActive) : 'true',
  };
}

/** The API wants numbers for ids and order, and no empty optional fields. */
export function toPayload(resource, values, editing) {
  const payload = {
    description: values.description || undefined,
    isActive: values.isActive === 'true',
  };
  if (resource === 'parameter-types') {
    payload.name = values.name;
    payload.allowUserValues = values.allowUserValues;
    if (!editing) payload.code = values.code;
  } else {
    payload.displayOrder = Number(values.displayOrder);
    payload.label = values.label;
    payload.isDefault = values.isDefault;
    if (values.colorHex) payload.colorHex = values.colorHex.toUpperCase();
    if (!editing) {
      payload.code = values.code;
      payload.parameterTypeId = Number(values.parameterTypeId);
    }
  }
  return payload;
}
