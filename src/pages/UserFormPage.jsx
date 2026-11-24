import { Link, useNavigate, useParams } from 'react-router-dom';
import { UserX } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState } from '../components/ui/Display.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import UserForm from '../features/user/UserForm.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { useMenuFunctions } from '../features/menu-access/hooks.js';
import { useOrganizationOptions } from '../features/organization/hooks.js';
import { useSkills } from '../features/user/lookups.js';
import { useCreateUser, useRoleOptions, useUpdateUser, useUser } from '../features/user/hooks.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';
import { fullName } from '../lib/format.js';

const LIST_PATH = '/users';

/** One page for add and edit; the route decides the mode. */
export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const roles = useRoleOptions();
  const { isSuperAdmin } = usePermissions();
  const organizations = useOrganizationOptions(isSuperAdmin);
  const skills = useSkills();
  const functions = useMenuFunctions();
  const record = useUser(id);
  const create = useCreateUser();
  const update = useUpdateUser();
  const mutation = isEdit ? update : create;
  const isSelf = isEdit && currentUser.id === id;

  async function handleSubmit(payload) {
    try {
      if (isEdit) await update.mutateAsync({ id, payload });
      else await create.mutateAsync(payload);
      toast.success(isEdit ? 'User saved' : 'User created');
      navigate(LIST_PATH);
    } catch {
      // The error is shown in the form (field errors and the alert at the top).
    }
  }

  const title = !isEdit
    ? 'New user'
    : record.data
      ? `Edit user · ${fullName(record.data)}`
      : 'Edit user';
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);

  // A super administrator picks from every organization; an organization admin from their own.
  const organizationOptions = isSuperAdmin
    ? (organizations.data ?? []).map((item) => ({ value: String(item.value), label: item.label }))
    : (currentUser.organizations ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      }));
  const defaultOrganizationIds =
    isSuperAdmin || !currentUser.organizationIds?.length
      ? []
      : [String(currentUser.organizationIds[0])];

  return (
    <>
      <Topbar title={title} breadcrumb={['Administration', 'User/Employee']} back={LIST_PATH} />
      {isEdit && record.isPending && <Loader label="Loading user" />}
      {isEdit && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={UserX}
            title="User not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to users
              </Link>
            }
          />
        </div>
      )}
      {(!isEdit || record.isSuccess) && (
        <UserForm
          key={record.data?.updatedAt ?? 'new'}
          // Your own role, status and password are not changed from this screen.
          mode={!isEdit ? 'create' : isSelf ? 'profile' : 'edit'}
          user={record.data}
          roles={roles.data ?? []}
          functionOptions={functions.data ?? []}
          organizationOptions={organizationOptions}
          defaultOrganizationIds={defaultOrganizationIds}
          skillOptions={skills.data ?? []}
          serverErrors={fieldErrors}
          formError={formError}
          submitting={mutation.isPending}
          cancelTo={LIST_PATH}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
