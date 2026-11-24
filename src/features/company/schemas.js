import { z } from 'zod';
import {
  addressComplete,
  addressDefaults,
  addressFields,
  toAddressPayload,
  toAddressValues,
} from '../address/address.js';
import { emailRule, phoneRule, websiteRule } from '../../lib/validation.js';

const CODE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const optionalText = (max) => z.string().trim().max(max);

export const companySchema = z
  .object({
    organizationId: z.string().optional(),
    code: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => CODE.test(value), 'Use letters, numbers or dashes (2–20 characters)'),
    name: z.string().trim().min(1, 'Enter a company name').max(250),
    companyType: z.string().min(1, 'Select a type'),
    contactName: optionalText(250),
    email: emailRule(),
    contactNo: phoneRule(),
    website: websiteRule,
    services: optionalText(2000),
    paymentTerm: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    notes: optionalText(2000),
    ...addressFields,
  })
  .superRefine(addressComplete);

export const companyDefaults = {
  organizationId: '',
  code: '',
  name: '',
  companyType: '',
  contactName: '',
  email: '',
  contactNo: '',
  website: '',
  services: '',
  paymentTerm: '',
  status: 'ACTIVE',
  notes: '',
  ...addressDefaults,
};

export function toCompanyPayload(values, editing) {
  return {
    ...(editing ? {} : { code: values.code }),
    // Only the super administrator picks the organization; everyone else's is set by the server.
    ...(values.organizationId && { organizationId: Number(values.organizationId) }),
    name: values.name,
    companyType: values.companyType,
    contactName: values.contactName,
    email: values.email,
    contactNo: values.contactNo,
    website: values.website,
    services: values.services,
    paymentTerm: values.paymentTerm || undefined,
    status: values.status,
    notes: values.notes,
    ...toAddressPayload(values),
  };
}

export function fromCompany(record) {
  return {
    organizationId: String(record.organizationId ?? ''),
    code: record.code,
    name: record.name,
    companyType: record.companyType,
    contactName: record.contactName ?? '',
    email: record.email ?? '',
    contactNo: record.contactNo ?? '',
    website: record.website ?? '',
    services: record.services ?? '',
    paymentTerm: record.paymentTerm ?? '',
    status: record.status,
    notes: record.notes ?? '',
    ...toAddressValues(record.address),
  };
}
