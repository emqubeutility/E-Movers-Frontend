import { z } from 'zod';
import { emailRule, phoneRule } from '../../lib/validation.js';

/** Which parts of the form each service group shows; the API applies the same rules. */
export const GROUP_RULES = {
  HOME_RELOCATION: { residence: true, places: ['Moving From', 'Moving To'] },
  OFFICE_RELOCATION: { places: ['Moving From', 'Moving To'] },
  INTERNATIONAL_RELOCATION: {
    residence: true,
    international: true,
    places: ['Origin', 'Destination'],
  },
  FURNITURE_INSTALLATION: { places: ['Pick From', 'Install At'] },
  STORAGE_SERVICES: { storage: true },
};

export const PLACES = ['from', 'to'];
// A place counts as filled in once any of these has a value (the country may be preset).
const PLACE_FIELDS = ['StateId', 'CityId', 'AreaId', 'AddressText'];
const placeStarted = (values, place) => PLACE_FIELDS.some((name) => values[`${place}${name}`]);

const text = (max) => z.string().trim().max(max, `Use at most ${max} characters`);

const placeFields = Object.fromEntries(
  PLACES.flatMap((place) => [
    [`${place}CountryId`, z.string()],
    [`${place}StateId`, z.string()],
    [`${place}CityId`, z.string()],
    [`${place}AreaId`, z.string()],
    [`${place}AddressText`, text(512)],
  ]),
);

const issue = (ctx, path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

/** `groupCodeOf` maps a service group id to its code, so the checks follow the chosen group. */
export function makeRequestSchema(groupCodeOf) {
  return z
    .object({
      organizationId: z.string(),
      customerKind: z.enum(['INDIVIDUAL', 'COMPANY']),
      customerId: z.string(),
      // The company customer's contact person for this request.
      customerProfileId: z.string(),
      // A new individual customer, typed in when none is picked.
      newName: z.string().trim().max(150, 'Use at most 150 characters'),
      newContactNo: z.string().trim(),
      newAltContactNo: phoneRule({ label: 'alternate number' }),
      newEmail: emailRule(),
      executiveId: z.string().min(1, 'Select the executive'),
      serviceGroupId: z.string().min(1, 'Select the service group'),
      serviceTypeId: z.string().min(1, 'Select the service'),
      internationalServiceTypeId: z.string(),
      title: z
        .string()
        .trim()
        .min(2, 'Enter at least 2 characters')
        .max(250, 'Use at most 250 characters'),
      residenceTypeId: z.string(),
      moveDate: z.string(),
      volumeCbm: z
        .string()
        .trim()
        .regex(/^(\d{1,8}(\.\d{1,2})?)?$/, 'Use a number with up to 2 decimals'),
      ...placeFields,
      enquiryChannelId: z.string(),
      referralId: z.string(),
      surveyRequired: z.boolean(),
      surveyTypeId: z.string(),
      surveyDate: z.string(),
      surveyTime: z.string(),
      storageStartDate: z.string(),
      storageEndDate: z.string(),
      pickAndPack: z.boolean(),
      remarks: text(2000),
    })
    .superRefine((values, ctx) => {
      // A company customer is always picked; an individual is picked or entered here.
      if (!values.customerId) {
        if (values.customerKind === 'COMPANY') issue(ctx, 'customerId', 'Select the customer');
        else {
          if (values.newName.length < 2)
            issue(ctx, 'newName', 'Enter the customer name (at least 2 characters)');
          const phone = phoneRule({ required: true, label: 'contact number' }).safeParse(
            values.newContactNo,
          );
          if (!phone.success) issue(ctx, 'newContactNo', phone.error.issues[0].message);
        }
      } else if (values.customerKind === 'COMPANY' && !values.customerProfileId) {
        issue(ctx, 'customerProfileId', 'Select the contact person');
      }
      const rules = GROUP_RULES[groupCodeOf(values.serviceGroupId)] ?? {};
      if (rules.places) {
        PLACES.forEach((place) => {
          if (!placeStarted(values, place)) return;
          if (!values[`${place}CountryId`]) issue(ctx, `${place}CountryId`, 'Select the country');
          if (!values[`${place}AddressText`])
            issue(ctx, `${place}AddressText`, 'Enter the address');
        });
      }
      if (rules.storage) {
        if (!values.storageStartDate) issue(ctx, 'storageStartDate', 'Enter the start date');
        if (values.storageEndDate && values.storageEndDate < values.storageStartDate)
          issue(ctx, 'storageEndDate', 'The end date cannot be before the start date');
        // Pick and pack: the goods are collected from one address.
        if (values.pickAndPack) {
          if (!values.fromAddressText) issue(ctx, 'fromAddressText', 'Enter the pick-up address');
          if (!values.fromCityId) issue(ctx, 'fromCityId', 'Select the city');
        }
      }
      if (values.surveyRequired) {
        if (!values.surveyDate) issue(ctx, 'surveyDate', 'Enter the survey date');
        if (!values.surveyTime) issue(ctx, 'surveyTime', 'Enter the survey time');
        if (!values.surveyTypeId) issue(ctx, 'surveyTypeId', 'Select the survey type');
        if (values.surveyDate && values.moveDate && values.surveyDate > values.moveDate)
          issue(ctx, 'surveyDate', 'The survey date must be on or before the move date');
      }
    });
}

export const requestDefaults = {
  organizationId: '',
  customerKind: 'INDIVIDUAL',
  customerId: '',
  customerProfileId: '',
  newName: '',
  newContactNo: '',
  newAltContactNo: '',
  newEmail: '',
  executiveId: '',
  serviceGroupId: '',
  serviceTypeId: '',
  internationalServiceTypeId: '',
  title: '',
  residenceTypeId: '',
  moveDate: '',
  volumeCbm: '',
  ...Object.fromEntries(Object.keys(placeFields).map((name) => [name, ''])),
  enquiryChannelId: '',
  referralId: '',
  surveyRequired: false,
  surveyTypeId: '',
  surveyDate: '',
  surveyTime: '',
  storageStartDate: '',
  storageEndDate: '',
  pickAndPack: false,
  remarks: '',
};

export const REQUEST_FIELD_NAMES = Object.keys(requestDefaults);

const idText = (value) => (value === null || value === undefined ? '' : String(value));

export function fromServiceRequest(record) {
  const values = { ...requestDefaults };
  Object.keys(requestDefaults).forEach((name) => {
    if (name === 'customerKind') return;
    if (name in record && typeof requestDefaults[name] !== 'boolean')
      values[name] = idText(record[name]);
  });
  values.surveyRequired = record.surveyRequired;
  values.pickAndPack = record.pickAndPack;
  PLACES.forEach((place) => {
    const address = record[`${place}Address`];
    values[`${place}CountryId`] = idText(address?.countryId);
    values[`${place}StateId`] = idText(address?.stateId);
    values[`${place}CityId`] = idText(address?.cityId);
    values[`${place}AreaId`] = idText(address?.areaId);
    values[`${place}AddressText`] = address?.addressText ?? '';
  });
  return values;
}

const number = (value) => (value ? Number(value) : undefined);
const textOrNothing = (value) => value || undefined;

/** The body the API expects: numbers for ids, nothing for empty or hidden fields. */
export function toServiceRequestPayload(values, groupCode) {
  const rules = GROUP_RULES[groupCode] ?? {};
  const survey = values.surveyRequired;
  const payload = {
    organizationId: number(values.organizationId),
    customerId: values.customerId,
    customerProfileId:
      values.customerKind === 'COMPANY' ? textOrNothing(values.customerProfileId) : undefined,
    executiveId: values.executiveId,
    serviceGroupId: Number(values.serviceGroupId),
    serviceTypeId: Number(values.serviceTypeId),
    internationalServiceTypeId: rules.international
      ? number(values.internationalServiceTypeId)
      : undefined,
    title: values.title,
    residenceTypeId: rules.residence ? number(values.residenceTypeId) : undefined,
    moveDate: textOrNothing(values.moveDate),
    volumeCbm: values.volumeCbm ? Number(values.volumeCbm) : undefined,
    enquiryChannelId: number(values.enquiryChannelId),
    referralId: number(values.referralId),
    surveyRequired: survey,
    surveyTypeId: survey ? number(values.surveyTypeId) : undefined,
    surveyDate: survey ? textOrNothing(values.surveyDate) : undefined,
    surveyTime: survey ? textOrNothing(values.surveyTime) : undefined,
    storageStartDate: rules.storage ? textOrNothing(values.storageStartDate) : undefined,
    storageEndDate: rules.storage ? textOrNothing(values.storageEndDate) : undefined,
    pickAndPack: rules.storage ? values.pickAndPack : false,
    remarks: textOrNothing(values.remarks),
  };
  const places = rules.places ? PLACES : rules.storage && values.pickAndPack ? ['from'] : [];
  places.forEach((place) => {
    if (!values[`${place}CountryId`] || !placeStarted(values, place)) return;
    payload[`${place}Address`] = {
      countryId: Number(values[`${place}CountryId`]),
      stateId: number(values[`${place}StateId`]),
      cityId: number(values[`${place}CityId`]),
      areaId: number(values[`${place}AreaId`]),
      addressText: values[`${place}AddressText`],
    };
  });
  return JSON.parse(JSON.stringify(payload));
}

/** The new individual customer typed into the service request form. */
export function toNewCustomerPayload(values) {
  return {
    kind: 'INDIVIDUAL',
    name: values.newName.trim(),
    contactName: values.newName.trim(),
    contactNo: values.newContactNo.trim(),
    ...(values.newAltContactNo && { altContactNo: values.newAltContactNo.trim() }),
    ...(values.newEmail && { email: values.newEmail.trim() }),
  };
}

/** Customer API field -> the matching new-customer field on this form. */
export const NEW_CUSTOMER_FIELDS = {
  name: 'newName',
  contactName: 'newName',
  contactNo: 'newContactNo',
  altContactNo: 'newAltContactNo',
  email: 'newEmail',
};
