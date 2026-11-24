import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Briefcase, Mail, Phone } from 'lucide-react';
import { ErrorAlert } from '../../components/ui/Display.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import MultiSelect from '../../components/ui/MultiSelect.jsx';
import Field, { IconInput, PasswordInput } from '../../components/ui/Field.jsx';
import { FormBar, FormSection } from '../../components/ui/FormKit.jsx';
import { PASSWORD_HINT, STATUS_OPTIONS } from '../../lib/constants.js';
import { phoneProps } from '../../lib/validation.js';
import CrewPicker from './CrewPicker.jsx';
import { useCities, useContractors, useCountries, useNationalities, useStates } from './lookups.js';
import { ADMIN_ROLE_CODES, buildUserSchema, toUserPayload } from './schemas.js';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  personType: 'SITE_USER',
  canSignIn: true,
  canLogin: true,
  isOutsourced: false,
  contractorCompanyId: '',
  employeeCode: '',
  username: '',
  phone: '',
  designation: '',
  nationality: '',
  countryId: '',
  stateId: '',
  cityId: '',
  addressText: '',
  postalCode: '',
  role: '',
  status: 'ACTIVE',
  password: '',
  organizationIds: [],
  functions: [],
  skills: [],
  crewMemberIds: [],
};

const idText = (value) => (value === null || value === undefined ? '' : String(value));

function toFormValues(user, defaultOrganizationIds) {
  if (!user) return { ...EMPTY, organizationIds: defaultOrganizationIds };
  return {
    ...EMPTY,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    personType: user.personType || 'SITE_USER',
    canSignIn: user.canSignIn ?? true,
    canLogin: user.canLogin ?? true,
    isOutsourced: user.isOutsourced ?? false,
    contractorCompanyId: user.contractor?.id ?? '',
    employeeCode: user.employeeCode || '',
    username: user.username || '',
    phone: user.phone || '',
    designation: user.designation || '',
    nationality: user.nationality?.code ?? '',
    countryId: idText(user.address?.countryId),
    stateId: idText(user.address?.stateId),
    cityId: idText(user.address?.cityId),
    addressText: user.address?.addressText ?? '',
    postalCode: user.address?.postalCode ?? '',
    role: user.role || '',
    status: user.status || 'ACTIVE',
    organizationIds: (user.organizationIds ?? []).map(String),
    functions: user.functions ?? [],
    skills: user.skills ?? [],
    crewMemberIds: (user.crewMembers ?? []).map((member) => member.id),
  };
}

const SAVE_LABELS = { create: 'Create user', edit: 'Save user', profile: 'Save profile' };

/**
 * One form for add, edit and "my profile". The cards follow the database tables:
 * Profile, Employee, Address, Login (app_user) and Organizations and access.
 * In profile mode only the personal cards show, because nobody changes their own access.
 */
export default function UserForm({
  mode,
  user,
  roles = [],
  organizationOptions = [],
  defaultOrganizationIds = [],
  functionOptions = [],
  skillOptions = [],
  serverErrors = [],
  formError,
  submitting = false,
  cancelTo,
  onSubmit,
}) {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(buildUserSchema(mode, { hadSignIn: user?.canSignIn ?? true })),
    defaultValues: toFormValues(user, defaultOrganizationIds),
  });

  // Field errors from the API are shown next to the matching field.
  useEffect(() => {
    serverErrors.forEach(({ field, message }) => {
      if (field in EMPTY) setError(field, { type: 'server', message });
    });
  }, [serverErrors, setError]);

  const role = watch('role');
  const countryId = watch('countryId');
  const stateId = watch('stateId');
  const countries = useCountries();
  const isOutsourced = watch('isOutsourced');
  const contractors = useContractors(mode !== 'profile' && isOutsourced);
  const chosenOrganizations = watch('organizationIds');
  // Only contractors of the organizations picked above can be chosen.
  const contractorOptions = (contractors.data ?? []).filter((item) =>
    chosenOrganizations.includes(item.organizationId),
  );
  const contractorId = watch('contractorCompanyId');
  const contractorsReady = contractors.data !== undefined;
  const contractorStillValid = contractorOptions.some((item) => item.value === contractorId);

  // Changing the organizations can leave the chosen contractor outside them, so it is cleared.
  // (Runs after the contractor list is known, so editing a saved person does not wipe theirs.)
  useEffect(() => {
    if (contractorsReady && contractorId && !contractorStillValid)
      setValue('contractorCompanyId', '');
  }, [contractorsReady, contractorId, contractorStillValid, setValue]);
  const states = useStates(countryId);
  const cities = useCities(countryId, stateId);
  const nationalities = useNationalities();

  const showAccess = mode !== 'profile';
  const personType = watch('personType');
  const emailRequired = mode === 'profile' || personType === 'SITE_USER';
  const signIn = personType === 'SITE_USER' || watch('canSignIn');
  // A site user must always be able to sign in, so that choice is locked for them.
  const signInLocked = personType === 'SITE_USER' && mode === 'edit';
  const adminRole = ADMIN_ROLE_CODES.includes(role);
  const showLogin = showAccess && signIn;
  const showFunctions = showLogin && functionOptions.length > 0 && !adminRole;
  const showOrganizations = showAccess && organizationOptions.length > 0 && role !== 'SUPERADMIN';
  const showCrew = showLogin && role === 'TEAM_LEADER';
  // An outsourced person belongs to exactly one organization.
  const outsourced = showAccess && !signIn && isOutsourced;
  useEffect(() => {
    if (outsourced && chosenOrganizations.length > 1)
      setValue('organizationIds', chosenOrganizations.slice(0, 1), { shouldDirty: true });
  }, [outsourced, chosenOrganizations, setValue]);
  const roleOptions = roles.map((item) => ({ value: item.code, label: item.name }));
  const passwordHelp =
    mode === 'create'
      ? PASSWORD_HINT
      : `Leave blank to keep the current password. ${PASSWORD_HINT}`;

  let number = 0;
  const next = () => (number += 1);

  return (
    <form
      className="form-layout"
      onSubmit={handleSubmit((values) => {
        if (showOrganizations && values.organizationIds.length === 0) {
          setError('organizationIds', {
            type: 'required',
            message: 'Select at least one organization',
          });
          return;
        }
        onSubmit(toUserPayload(values, mode));
      })}
      noValidate
    >
      <div className="form-main form-pairs">
        <div className="span-pair">
          <ErrorAlert message={formError} />
        </div>

        <FormSection
          number={next()}
          title="Profile"
          sub="Name, contact and home address. Saved in the profile and address tables."
          columns={2}
        >
          <Field label="First name" required error={errors.firstName?.message}>
            <input className="input" autoComplete="given-name" {...register('firstName')} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <input className="input" autoComplete="family-name" {...register('lastName')} />
          </Field>
          <Field
            label="Phone"
            error={errors.phone?.message}
            help="International format, e.g. +971501234567"
          >
            <IconInput icon={Phone} {...phoneProps(register('phone'))} />
          </Field>
          <Field
            label="Email"
            required={emailRequired}
            error={errors.email?.message}
            help={emailRequired ? undefined : 'Optional for employees'}
          >
            <IconInput icon={Mail} type="email" autoComplete="email" {...register('email')} />
          </Field>
          <Field label="Nationality" error={errors.nationality?.message}>
            <Controller
              control={control}
              name="nationality"
              render={({ field }) => (
                <Dropdown
                  search
                  clearable
                  placeholder="Select nationality"
                  options={nationalities.data ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  aria-label="Nationality"
                />
              )}
            />
          </Field>
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
          <Field label="Address" error={errors.addressText?.message}>
            <input className="input" autoComplete="street-address" {...register('addressText')} />
          </Field>
        </FormSection>

        <FormSection
          number={next()}
          title="Employee"
          sub="Work details. Saved in the employee and profile tables."
          columns={2}
        >
          {showAccess && (
            <Field
              label="Employee code"
              required
              error={errors.employeeCode?.message}
              help={mode === 'create' ? 'Unique. Cannot be changed later.' : 'Cannot be changed.'}
            >
              <input
                className="input"
                autoComplete="off"
                disabled={mode !== 'create'}
                style={{ textTransform: 'uppercase' }}
                {...register('employeeCode')}
              />
            </Field>
          )}
          <Field label="Designation" error={errors.designation?.message} help="Job title">
            <IconInput icon={Briefcase} {...register('designation')} />
          </Field>
          {showOrganizations && (
            <Field
              label={outsourced ? 'Organization' : 'Organizations'}
              required
              error={errors.organizationIds?.message}
              help={
                outsourced
                  ? 'An outsourced person works for one organization only.'
                  : 'First one picked is the home organization.'
              }
            >
              <Controller
                control={control}
                name="organizationIds"
                render={({ field }) =>
                  outsourced ? (
                    <Dropdown
                      search
                      placeholder="Select organization"
                      options={organizationOptions}
                      value={field.value?.[0] ?? ''}
                      onChange={(value) => field.onChange(value ? [value] : [])}
                      aria-label="Organization"
                    />
                  ) : (
                    <MultiSelect
                      placeholder="Select organizations"
                      options={organizationOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )
                }
              />
            </Field>
          )}
          {showAccess && (
            <Field label="Skills" help="Used when picking crew members.">
              <Controller
                control={control}
                name="skills"
                render={({ field }) => (
                  <MultiSelect
                    placeholder="Select skills"
                    options={skillOptions}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          )}
          {showAccess && (
            <Field
              label="Sign-in"
              help={
                signInLocked
                  ? 'A site user always signs in.'
                  : 'Turn on for log in to the application.'
              }
            >
              <label className="switch switch-form">
                <input
                  type="checkbox"
                  role="switch"
                  disabled={signInLocked}
                  {...register('canSignIn', {
                    // Someone who signs in needs an email (site user); one who does not is a plain employee.
                    onChange: (event) => {
                      if (mode === 'create')
                        setValue('personType', event.target.checked ? 'SITE_USER' : 'EMPLOYEE');
                      // Outsourcing only applies to people who do not sign in.
                      if (event.target.checked) {
                        setValue('isOutsourced', false);
                        setValue('contractorCompanyId', '');
                      }
                    },
                  })}
                />
                <span className="switch-track" aria-hidden="true" />
                <span>Allow this person to sign in</span>
              </label>
            </Field>
          )}
          {showAccess && (
            <Field label="Role" required error={errors.role?.message}>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Dropdown
                    search
                    placeholder="Select role"
                    options={roleOptions}
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Role"
                  />
                )}
              />
            </Field>
          )}
          {showAccess && (
            <Field label="Status" required error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Dropdown
                    options={STATUS_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select status"
                    aria-label="Status"
                  />
                )}
              />
            </Field>
          )}
          {showAccess && (
            <Field
              label="Outsourced"
              help={
                signIn
                  ? 'Not available for people who sign in.'
                  : 'Turn on for staff supplied by a contractor company.'
              }
            >
              <label className="switch switch-form">
                <input
                  type="checkbox"
                  role="switch"
                  disabled={signIn}
                  {...register('isOutsourced', {
                    onChange: (event) => {
                      if (!event.target.checked) setValue('contractorCompanyId', '');
                    },
                  })}
                />
                <span className="switch-track" aria-hidden="true" />
                <span>This is an outsourced employee</span>
              </label>
            </Field>
          )}
          {showAccess && !signIn && isOutsourced && (
            <Field label="Contractor" required error={errors.contractorCompanyId?.message}>
              <Controller
                control={control}
                name="contractorCompanyId"
                render={({ field }) => (
                  <Dropdown
                    search
                    placeholder={
                      chosenOrganizations.length
                        ? 'Select contractor'
                        : 'Select organizations first'
                    }
                    options={contractorOptions}
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Contractor"
                  />
                )}
              />
            </Field>
          )}
        </FormSection>

        {showLogin && (
          <FormSection
            number={next()}
            title="Login"
            sub="Sign-in account and what it can open. Saved in app_user."
            action={
              <label
                className="switch"
                title="Untick to restrict this person from logging in. Status is not checked at login."
              >
                <span>Login allowed</span>
                <input type="checkbox" role="switch" {...register('canLogin')} />
                <span className="switch-track" aria-hidden="true" />
              </label>
            }
            columns={2}
            full
          >
            <Field
              label="User name"
              required
              error={errors.username?.message}
              help={
                mode === 'create'
                  ? 'What they type to sign in. Unique. Cannot be changed later.'
                  : 'Cannot be changed.'
              }
            >
              <input
                className="input"
                autoComplete="off"
                disabled={mode !== 'create'}
                {...register('username')}
              />
            </Field>
            <Field
              label={mode === 'create' ? 'Password' : 'New password'}
              required={mode === 'create'}
              error={errors.password?.message}
              help={passwordHelp}
            >
              <PasswordInput autoComplete="new-password" {...register('password')} />
            </Field>
            {showFunctions && (
              <Field
                label="Functions"

                help="Saved in employee_function. They only see screens owned by these functions."
              >
                <Controller
                  control={control}
                  name="functions"
                  render={({ field }) => (
                    <MultiSelect
                      placeholder="Select functions"
                      options={functionOptions.map((item) => ({
                        value: item.code,
                        label: item.name,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            )}
            {showCrew && (
              <Field
                label="Crew members"
                span="all"
                help="Saved in team_member. Employees with a skill who work under this team leader; a person can be in several teams."
              >
                <Controller
                  control={control}
                  name="crewMemberIds"
                  render={({ field }) => (
                    <CrewPicker
                      value={field.value}
                      onChange={field.onChange}
                      known={user?.crewMembers}
                      exclude={user?.profileId}
                      skillOptions={skillOptions}
                    />
                  )}
                />
              </Field>
            )}
          </FormSection>
        )}
      </div>

      <FormBar
        cancelTo={cancelTo}
        submitLabel={SAVE_LABELS[mode]}
        submitting={submitting}
        changed={mode === 'create' || isDirty}
      />
    </form>
  );
}
