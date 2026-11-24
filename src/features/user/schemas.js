import { z } from 'zod';
import { PASSWORD_HINT, PASSWORD_RULE } from '../../lib/constants.js';
import { emailRule, phoneRule } from '../../lib/validation.js';

export const ADMIN_ROLE_CODES = ['SUPERADMIN', 'ADMIN'];
export const PERSON_TYPES = [
  { value: 'SITE_USER', label: 'Site user' },
  { value: 'EMPLOYEE', label: 'Employee' },
];
const EMPLOYEE_CODE = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/;

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));

const baseFields = {
  firstName: z.string().trim().min(1, 'Enter the first name').max(100),
  lastName: optionalText(100),
  email: emailRule(),
  phone: phoneRule(),
  designation: optionalText(150),
  nationality: z.string().optional(),
  countryId: z.string().optional(),
  stateId: z.string().optional(),
  cityId: z.string().optional(),
  addressText: optionalText(255),
  postalCode: optionalText(20),
};

/** Once any part of the address is filled in, the country and the street line are needed. */
const addressComplete = (values, ctx) => {
  const started = [
    values.countryId,
    values.stateId,
    values.cityId,
    values.addressText,
    values.postalCode,
  ].some(Boolean);
  if (!started) return;
  if (!values.countryId)
    ctx.addIssue({ code: 'custom', path: ['countryId'], message: 'Select the country' });
  if (!values.addressText)
    ctx.addIssue({ code: 'custom', path: ['addressText'], message: 'Enter the street address' });
};

const USERNAME = /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/;
const usernameField = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || USERNAME.test(value),
    'Use 3-30 letters, numbers, dots, dashes or underscores, no spaces',
  );

const strongPassword = z.string().regex(PASSWORD_RULE, PASSWORD_HINT);
const identityFields = {
  personType: z.enum(['SITE_USER', 'EMPLOYEE']),
  canSignIn: z.boolean(),
  canLogin: z.boolean(),
  isOutsourced: z.boolean(),
  contractorCompanyId: z.string().optional(),
  username: usernameField,
  employeeCode: z
    .string()
    .trim()
    .min(1, 'Enter the employee code')
    .refine((value) => EMPLOYEE_CODE.test(value), 'Use 2-20 letters, numbers or dashes, no spaces'),
};

/** Whoever signs in needs a role (and, below, a password); a site user always signs in. */
const signsIn = (values) => values.personType === 'SITE_USER' || values.canSignIn;

/** A site user always needs an e-mail address; an employee may have none. Everyone needs a role. */
const needsEmail = (values, ctx) => {
  if (!values.role) {
    ctx.addIssue({ code: 'custom', path: ['role'], message: 'Select a role' });
  }
  if (values.personType === 'SITE_USER' && !values.email) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter the email address' });
  }
  addressComplete(values, ctx);
  if (!signsIn(values) && values.isOutsourced && !values.contractorCompanyId) {
    ctx.addIssue({
      code: 'custom',
      path: ['contractorCompanyId'],
      message: 'Select the contractor',
    });
  }
};

const accessFields = {
  role: z.string().optional(),
  status: z.string().min(1, 'Select a status'),
  organizationIds: z.array(z.string()).optional(),
  functions: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  crewMemberIds: z.array(z.string()).optional(),
};

/** mode: 'create' (new user), 'edit' (another user) or 'profile' (own details). */
export function buildUserSchema(mode, { hadSignIn = true } = {}) {
  if (mode === 'create')
    return z
      .object({
        ...baseFields,
        ...identityFields,
        ...accessFields,
        password: strongPassword.optional().or(z.literal('')),
      })
      .superRefine(needsEmail)
      .superRefine((values, ctx) => {
        if (signsIn(values) && !values.password) {
          ctx.addIssue({ code: 'custom', path: ['password'], message: 'Enter a password' });
        }
        if (signsIn(values) && !values.username) {
          ctx.addIssue({ code: 'custom', path: ['username'], message: 'Enter a user name' });
        }
      });
  if (mode === 'edit')
    return z
      .object({
        ...baseFields,
        personType: identityFields.personType,
        canSignIn: identityFields.canSignIn,
        canLogin: identityFields.canLogin,
        isOutsourced: identityFields.isOutsourced,
        contractorCompanyId: identityFields.contractorCompanyId,
        username: z.string().optional(),
        employeeCode: z.string().optional(),
        ...accessFields,
        password: strongPassword.optional().or(z.literal('')),
      })
      .superRefine(needsEmail)
      .superRefine((values, ctx) => {
        // Switching sign-in on for someone who had none needs a first password.
        if (signsIn(values) && !hadSignIn && !values.password) {
          ctx.addIssue({ code: 'custom', path: ['password'], message: 'Enter a password' });
        }
      });
  return z
    .object({ ...baseFields, email: emailRule({ required: true }) })
    .superRefine(addressComplete);
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

/** The address the API expects, or nothing when no country was chosen. */
function toAddress(values) {
  if (!values.countryId) return undefined;
  return {
    countryId: Number(values.countryId),
    ...(values.stateId && { stateId: Number(values.stateId) }),
    ...(values.cityId && { cityId: Number(values.cityId) }),
    addressText: values.addressText,
    ...(values.postalCode && { postalCode: values.postalCode }),
  };
}

/** Removes blank optional values so the API only receives what the user actually set. */
export function toUserPayload(values, mode) {
  const payload = {
    firstName: values.firstName,
    lastName: values.lastName || '',
    designation: values.designation || '',
  };
  if (values.email) payload.email = values.email;
  if (mode !== 'create' || values.phone) payload.phone = values.phone || '';
  if (values.nationality || mode !== 'create') payload.nationality = values.nationality || '';
  const address = toAddress(values);
  if (address) payload.address = address;
  if (mode !== 'profile') {
    const canSignIn = signsIn(values);
    // The role is everyone's only role, whether or not they sign in.
    payload.role = values.role;
    payload.personType = values.personType;
    payload.canSignIn = canSignIn;
    if (canSignIn) payload.canLogin = values.canLogin;
    if (mode === 'create') {
      payload.employeeCode = values.employeeCode.trim().toUpperCase();
      if (canSignIn) payload.username = values.username.trim();
    }
    payload.status = values.status;
    // Outsourcing applies only to people who do not sign in.
    const outsourced = !canSignIn && values.isOutsourced;
    payload.isOutsourced = outsourced;
    payload.contractorCompanyId = outsourced ? values.contractorCompanyId : null;
    if (canSignIn && values.password) payload.password = values.password;
    const isAdminRole = ADMIN_ROLE_CODES.includes(values.role);
    // Administrator roles hold every function, so none are stored for them.
    const functions = isAdminRole || !canSignIn ? [] : (values.functions ?? []);
    if (mode === 'edit' || functions.length > 0) payload.functions = functions;
    // The SUPERADMIN role has no organization; everyone else needs at least one (the first is home).
    if (values.role !== 'SUPERADMIN' && values.organizationIds?.length) {
      payload.organizationIds = values.organizationIds.map(Number);
    }
    payload.skills = values.skills ?? [];
    if (canSignIn && values.role === 'TEAM_LEADER')
      payload.crewMemberIds = values.crewMemberIds ?? [];
  }
  return payload;
}
