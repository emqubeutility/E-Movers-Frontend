import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UserForm from './UserForm.jsx';

vi.mock('./lookups.js', () => {
  const none = () => ({ data: [], isPending: false });
  return {
    useCountries: none,
    useStates: none,
    useCities: none,
    useNationalities: none,
    useSkills: none,
    useContractors: () => ({
      data: [
        { value: 'c-1', label: 'Swift Movers', organizationId: '1' },
        { value: 'c-2', label: 'Other Org Movers', organizationId: '2' },
      ],
      isPending: false,
    }),
    useCrewCandidates: none,
  };
});

const ROLES = [
  { code: 'ADMIN', name: 'admin', level: 1 },
  { code: 'EXECUTIVE', name: 'Executive', level: 5 },
];

function renderForm(props) {
  return render(
    <MemoryRouter>
      <UserForm roles={ROLES} cancelTo="/users" onSubmit={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('UserForm', () => {
  it('shows inline errors and does not submit an empty form', async () => {
    const onSubmit = vi.fn();
    renderForm({ mode: 'create', onSubmit });

    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Enter the first name')).toBeInTheDocument();
    expect(screen.getByText('Enter the email address')).toBeInTheDocument();
    expect(screen.getByText('Enter the employee code')).toBeInTheDocument();
    expect(screen.getByText('Select a role')).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a weak password', async () => {
    renderForm({ mode: 'create' });

    const password = screen.getByLabelText(/^Password/);
    await userEvent.type(password, '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await vi.waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'));
  });

  it('submits a clean payload when the form is valid', async () => {
    const onSubmit = vi.fn();
    renderForm({ mode: 'create', onSubmit });

    await userEvent.type(screen.getByLabelText(/First name/), 'Sara');
    await userEvent.type(screen.getByLabelText(/Email/), 'sara@example.com');
    await userEvent.type(screen.getByLabelText(/Employee code/), 'emp0007');
    await userEvent.type(screen.getByLabelText(/User name/), 'sara.k');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Role' }));
    await userEvent.click(screen.getByRole('option', { name: 'Executive' }));
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await userEvent.click(screen.getByRole('option', { name: 'Suspended' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      firstName: 'Sara',
      lastName: '',
      email: 'sara@example.com',
      designation: '',
      skills: [],
      personType: 'SITE_USER',
      canSignIn: true,
      canLogin: true,
      isOutsourced: false,
      contractorCompanyId: null,
      employeeCode: 'EMP0007',
      username: 'sara.k',
      role: 'EXECUTIVE',
      status: 'SUSPENDED',
      password: 'Str0ng!Passw0rd',
    });
  });

  it('always shows outsourcing (disabled while sign-in is on), then asks for a contractor', async () => {
    const onSubmit = vi.fn();
    renderForm({
      mode: 'create',
      onSubmit,
      organizationOptions: [
        { value: '1', label: 'Dubai' },
        { value: '2', label: 'Abu Dhabi' },
      ],
      defaultOrganizationIds: ['1'],
    });

    // Sign-in is on by default, so the outsourcing box is visible but disabled.
    expect(screen.getByLabelText(/This is an outsourced employee/)).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Allow this person to sign in/));
    expect(screen.queryByLabelText('Contractor')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/This is an outsourced employee/));
    expect(screen.getByLabelText('Contractor')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/First name/), 'Ravi');
    await userEvent.type(screen.getByLabelText(/Employee code/), 'out1');
    await userEvent.click(screen.getByRole('button', { name: 'Role' }));
    await userEvent.click(screen.getByRole('option', { name: 'Executive' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByText('Select the contractor')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Contractor' }));
    // Only the contractor of the chosen organization is offered.
    expect(screen.queryByRole('option', { name: 'Other Org Movers' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Swift Movers' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      canSignIn: false,
      isOutsourced: true,
      contractorCompanyId: 'c-1',
    });

    // Turning sign-in back on drops the outsourcing.
    await userEvent.click(screen.getByLabelText(/Allow this person to sign in/));
    expect(screen.getByLabelText(/This is an outsourced employee/)).toBeDisabled();
  });

  it('needs a role but no password for an employee without a sign-in', async () => {
    const onSubmit = vi.fn();
    renderForm({ mode: 'create', onSubmit });

    await userEvent.click(screen.getByLabelText(/Allow this person to sign in/));
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/First name/), 'Dan');
    await userEvent.type(screen.getByLabelText(/Employee code/), 'drv9');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByText('Select a role')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Role' }));
    await userEvent.click(screen.getByRole('option', { name: 'Executive' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      employeeCode: 'DRV9',
      personType: 'EMPLOYEE',
      canSignIn: false,
      role: 'EXECUTIVE',
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('password');
  });

  it('hides access and password on the profile form', () => {
    renderForm({
      mode: 'profile',
      user: { firstName: 'Sara', email: 'sara@example.com' },
      cancelTo: undefined,
    });

    expect(screen.queryByText('Access')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    // Nothing changed yet, so there is no save button.
    expect(screen.queryByRole('button', { name: 'Save profile' })).not.toBeInTheDocument();
  });
});
