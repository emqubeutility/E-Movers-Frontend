import { z } from 'zod';
import {
  addressComplete,
  addressDefaults,
  addressFields,
  toAddressPayload,
  toAddressValues,
} from '../address/address.js';
import { emailRule, phoneRule } from '../../lib/validation.js';

const CODE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const optionalText = (max) => z.string().trim().max(max);

const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Enter the name (at least 2 characters)').max(150),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  designation: optionalText(150),
  gender: z.string(),
  ageGroup: z.string(),
  nationality: z.string(),
  email: emailRule(),
  contactNo: phoneRule(),
  altContactNo: phoneRule(),
});

export const emptyContact = {
  name: '',
  status: 'ACTIVE',
  designation: '',
  gender: '',
  ageGroup: '',
  nationality: '',
  email: '',
  contactNo: '',
  altContactNo: '',
};

export const customerSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => CODE.test(value), 'Use letters, numbers or dashes (2–20 characters)'),
    kind: z.enum(['INDIVIDUAL', 'COMPANY']),
    name: z.string().trim().min(1, 'Enter a name').max(250),
    contactName: optionalText(150),
    email: emailRule(),
    contactNo: phoneRule({ required: true, label: 'contact number' }),
    altContactNo: phoneRule(),
    designation: optionalText(150),
    gender: z.string(),
    ageGroup: z.string(),
    nationality: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    agreedToWhatsapp: z.boolean(),
    contacts: z.array(contactSchema).max(50),
    mainContactId: z.string().optional(),
    ...addressFields,
  })
  .superRefine((values, ctx) => {
    // Address is optional for everyone. A company that starts one needs the country and street
    // line; an individual needs only the country (state, city, street and postal code optional).
    if (values.kind === 'COMPANY') {
      addressComplete(values, ctx);
    } else if (
      (values.stateId || values.cityId || values.addressText || values.postalCode) &&
      !values.countryId
    ) {
      ctx.addIssue({ code: 'custom', path: ['countryId'], message: 'Select the country' });
    }
  })
  .superRefine((values, ctx) => {
    // A company needs a named main contact person (at least 2 characters).
    if (values.kind === 'COMPANY' && values.contactName.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['contactName'],
        message: 'Enter the main contact name (at least 2 characters)',
      });
    }
  });

export const customerDefaults = {
  code: '',
  kind: 'INDIVIDUAL',
  name: '',
  contactName: '',
  email: '',
  contactNo: '',
  altContactNo: '',
  designation: '',
  gender: '',
  ageGroup: '',
  nationality: '',
  status: 'ACTIVE',
  agreedToWhatsapp: true,
  contacts: [],
  mainContactId: '',
  ...addressDefaults,
};

export function toCustomerPayload(values, editing) {
  return {
    ...(editing ? {} : { code: values.code, kind: values.kind }),
    name: values.name,
    // An individual is their own contact; a company has a named main contact person.
    contactName: values.kind === 'COMPANY' ? values.contactName : values.name,
    email: values.email,
    contactNo: values.contactNo,
    altContactNo: values.altContactNo,
    designation: values.kind === 'COMPANY' ? values.designation : '',
    gender: values.gender,
    ageGroup: values.ageGroup,
    nationality: values.nationality,
    status: values.status,
    agreedToWhatsapp: values.agreedToWhatsapp,
    // Company: who the main contact is (changes when another contact person is made main).
    ...(editing &&
      values.kind === 'COMPANY' &&
      values.mainContactId && {
        mainContactId: values.mainContactId,
      }),
    ...(values.kind === 'COMPANY' && {
      contacts: values.contacts.map(({ id, ...contact }) => (id ? { id, ...contact } : contact)),
    }),
    ...toAddressPayload(values),
  };
}

export function fromCustomer(record) {
  return {
    code: record.code,
    kind: record.kind,
    name: record.name ?? '',
    contactName: record.contactName ?? '',
    email: record.email ?? '',
    contactNo: record.contactNo ?? '',
    altContactNo: record.altContactNo ?? '',
    designation: record.designation ?? '',
    gender: record.gender ?? '',
    ageGroup: record.ageGroup ?? '',
    nationality: record.nationality ?? '',
    status: record.status,
    agreedToWhatsapp: record.agreedToWhatsapp,
    mainContactId: record.mainContactId ?? '',
    contacts: (record.contacts ?? []).map((contact) => ({
      id: contact.id,
      name: contact.name ?? '',
      status: contact.status ?? 'ACTIVE',
      designation: contact.designation ?? '',
      gender: contact.gender ?? '',
      ageGroup: contact.ageGroup ?? '',
      nationality: contact.nationality ?? '',
      email: contact.email ?? '',
      contactNo: contact.contactNo ?? '',
      altContactNo: contact.altContactNo ?? '',
    })),
    ...toAddressValues(record.address),
  };
}
