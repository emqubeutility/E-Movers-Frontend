import { z } from 'zod';

/** The main address of a company or customer: five form fields, saved as one `address` in the API. */
export const addressFields = {
  countryId: z.string().optional(),
  stateId: z.string().optional(),
  cityId: z.string().optional(),
  addressText: z.string().trim().max(512, 'Use at most 512 characters'),
  postalCode: z.string().trim().max(20),
};

export const addressDefaults = {
  countryId: '',
  stateId: '',
  cityId: '',
  addressText: '',
  postalCode: '',
};

export const ADDRESS_FIELD_NAMES = Object.keys(addressDefaults);

/** Once any part of the address is filled in, the country and the street line are needed. */
export function addressComplete(values, ctx) {
  const started = ADDRESS_FIELD_NAMES.some((name) => values[name]);
  if (!started) return;
  if (!values.countryId)
    ctx.addIssue({ code: 'custom', path: ['countryId'], message: 'Select the country' });
  if (!values.addressText)
    ctx.addIssue({ code: 'custom', path: ['addressText'], message: 'Enter the address' });
}

const idText = (value) => (value === null || value === undefined ? '' : String(value));

export function toAddressValues(address) {
  return {
    countryId: idText(address?.countryId),
    stateId: idText(address?.stateId),
    cityId: idText(address?.cityId),
    addressText: address?.addressText ?? '',
    postalCode: address?.postalCode ?? '',
  };
}

/** The address the API expects, or nothing when no country was chosen. */
export function toAddressPayload(values) {
  if (!values.countryId) return {};
  return {
    address: {
      countryId: Number(values.countryId),
      ...(values.stateId && { stateId: Number(values.stateId) }),
      ...(values.cityId && { cityId: Number(values.cityId) }),
      addressText: values.addressText,
      ...(values.postalCode && { postalCode: values.postalCode }),
    },
  };
}
