import Topbar from '../components/layout/Topbar.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import UserForm from '../features/user/UserForm.jsx';
import { useUpdateUser } from '../features/user/hooks.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const update = useUpdateUser();
  const { fieldErrors, formError } = useApiFormErrors(update.error);

  async function handleSubmit(payload) {
    try {
      setUser(await update.mutateAsync({ id: user.id, payload }));
      toast.success('Profile saved');
    } catch {
      // Shown in the form.
    }
  }

  return (
    <>
      <Topbar title="My profile" breadcrumb={['Account']} />
      <UserForm
        key={user.updatedAt}
        mode="profile"
        user={user}
        serverErrors={fieldErrors}
        formError={formError}
        submitting={update.isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}
