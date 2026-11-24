import { z } from 'zod';
import { emailRule, phoneRule } from '../../lib/validation.js';
import {
  addressComplete,
  addressDefaults,
  addressFields,
  toAddressPayload,
  toAddressValues,
} from '../address/address.js';

/** A number typed as text: '' allowed unless required; at most `decimals` decimals. */
function numberText({ required = false, max, decimals = 2, label }) {
  const pattern = decimals ? new RegExp(`^\\d{1,12}(\\.\\d{1,${decimals}})?$`) : /^\d{1,6}$/;
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === '') {
        if (required) ctx.addIssue({ code: 'custom', message: `Enter the ${label}` });
        return;
      }
      if (!pattern.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: decimals ? `Use a number with up to ${decimals} decimals` : 'Use a whole number',
        });
        return;
      }
      if (max !== undefined && Number(value) > max)
        ctx.addIssue({ code: 'custom', message: `Use at most ${max}` });
    });
}

const choice = (message) => z.string().min(1, message);

export const organizationSchema = z
  .object({
    organizationCode: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => /^[A-Z0-9][A-Z0-9-]{1,19}$/.test(value),
        'Use letters, numbers or dashes (2–20 characters)',
      ),
    name: z.string().trim().min(2, 'Enter the organization name').max(150),
    contactNo: phoneRule({ label: 'organization contact number' }),
    contactName: z
      .string()
      .trim()
      .min(2, 'Enter the contact person (at least 2 characters)')
      .max(150, 'Use at most 150 characters'),
    contactEmail: emailRule(),
    contactPhone: phoneRule({ label: 'contact person number' }),
    leadEmail: emailRule({ required: true, label: 'lead send email' }),
    leadCcEmail: emailRule({ required: true, label: 'lead CC email' }),
    logoFileId: z.number().nullable(),
    quoteHeaderFileId: z.number().nullable(),
    volumeUom: choice('Select the total volume unit'),
    furnitureVolumeUom: choice('Select the furniture volume unit'),
    currencyId: choice('Select the currency'),
    timeZoneId: choice('Select the time zone'),
    quoteReviewMinLimit: numberText({ required: true, label: 'quote review minimum' }),
    workloadMin: numberText({ label: 'minimum' }),
    workloadMax: numberText({ label: 'maximum' }),
    jobConfirmMinHours: numberText({ decimals: 0, max: 720, label: 'hours' }),
    employeeCostPerHour: numberText({ label: 'cost' }),
    vehicleCostPerTrip: numberText({ label: 'cost' }),
    employeeWorkingHours: numberText({ decimals: 1, max: 24, label: 'hours' }),
    vatPercent: numberText({ required: true, max: 100, label: 'VAT percentage' }),
    profitPercent: numberText({ required: true, max: 100, label: 'profit percentage' }),
    displayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour'),
    invoiceMaxDelayDays: numberText({ decimals: 0, max: 365, label: 'days' }),
    isHeadOffice: z.boolean(),
    isActive: z.boolean(),
    ...addressFields,
  })
  .superRefine((values, ctx) => {
    addressComplete(values, ctx);
    if (
      values.workloadMin !== '' &&
      values.workloadMax !== '' &&
      Number(values.workloadMin) > Number(values.workloadMax)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['workloadMax'],
        message: 'The maximum cannot be below the minimum',
      });
  });

export const organizationDefaults = {
  organizationCode: '',
  name: '',
  contactNo: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  leadEmail: '',
  leadCcEmail: '',
  logoFileId: null,
  quoteHeaderFileId: null,
  volumeUom: 'CBM',
  furnitureVolumeUom: 'CFT',
  currencyId: '',
  timeZoneId: '',
  quoteReviewMinLimit: '',
  workloadMin: '',
  workloadMax: '',
  jobConfirmMinHours: '',
  employeeCostPerHour: '',
  vehicleCostPerTrip: '',
  employeeWorkingHours: '',
  vatPercent: '',
  profitPercent: '',
  displayColor: '#800000',
  invoiceMaxDelayDays: '',
  isHeadOffice: false,
  isActive: true,
  ...addressDefaults,
};

/** Form fields an API error can point at (API name -> form name). */
export const ORGANIZATION_ERROR_FIELDS = {
  ...Object.fromEntries(Object.keys(organizationDefaults).map((name) => [name, name])),
  'contactPerson.name': 'contactName',
  'contactPerson.email': 'contactEmail',
  'contactPerson.contactNo': 'contactPhone',
  contactPerson: 'contactName',
};

const NUMBER_FIELDS = [
  'quoteReviewMinLimit',
  'workloadMin',
  'workloadMax',
  'jobConfirmMinHours',
  'employeeCostPerHour',
  'vehicleCostPerTrip',
  'employeeWorkingHours',
  'vatPercent',
  'profitPercent',
  'invoiceMaxDelayDays',
];

/** Only a super administrator may send the head office and active flags. */
export function toOrganizationPayload(values, { editing, isSuperAdmin }) {
  const payload = {
    ...(editing ? {} : { organizationCode: values.organizationCode }),
    name: values.name,
    contactNo: values.contactNo,
    contactPerson: {
      name: values.contactName,
      email: values.contactEmail,
      contactNo: values.contactPhone,
    },
    leadEmail: values.leadEmail,
    leadCcEmail: values.leadCcEmail,
    logoFileId: values.logoFileId,
    quoteHeaderFileId: values.quoteHeaderFileId,
    volumeUom: values.volumeUom,
    furnitureVolumeUom: values.furnitureVolumeUom,
    currencyId: Number(values.currencyId),
    timeZoneId: Number(values.timeZoneId),
    displayColor: values.displayColor,
    ...toAddressPayload(values),
    ...(isSuperAdmin ? { isHeadOffice: values.isHeadOffice, isActive: values.isActive } : {}),
  };
  // Empty optional numbers are cleared on edit and left out on create.
  NUMBER_FIELDS.forEach((name) => {
    if (values[name] !== '') payload[name] = Number(values[name]);
    else if (editing) payload[name] = null;
  });
  return payload;
}

const text = (value) => (value === null || value === undefined ? '' : String(value));

export function fromOrganization(record) {
  return {
    ...organizationDefaults,
    organizationCode: record.organizationCode,
    name: record.name,
    contactNo: record.contactNo ?? '',
    contactName: record.contactPerson?.name ?? '',
    contactEmail: record.contactPerson?.email ?? '',
    contactPhone: record.contactPerson?.contactNo ?? '',
    leadEmail: record.leadEmail ?? '',
    leadCcEmail: record.leadCcEmail ?? '',
    logoFileId: record.logoFileId ?? null,
    quoteHeaderFileId: record.quoteHeaderFileId ?? null,
    volumeUom: record.volumeUom ?? '',
    furnitureVolumeUom: record.furnitureVolumeUom ?? '',
    currencyId: text(record.currencyId),
    timeZoneId: text(record.timeZoneId),
    displayColor: record.displayColor ?? '#800000',
    ...Object.fromEntries(NUMBER_FIELDS.map((name) => [name, text(record[name])])),
    isHeadOffice: Boolean(record.isHeadOffice),
    isActive: record.isActive !== false,
    ...toAddressValues(record.address),
  };
}
