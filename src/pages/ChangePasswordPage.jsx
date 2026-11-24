import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorAlert } from '../components/ui/Display.jsx';
import Field, { PasswordInput } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { userApi } from '../features/user/api.js';
import { changePasswordSchema } from '../features/user/schemas.js';
import { PASSWORD_HINT } from '../lib/constants.js';
import { refreshSession } from '../services/api.js';

const DEFAULTS = { currentPassword: '', password: '', confirmPassword: '' };

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: DEFAULTS });

  async function submit({ currentPassword, password }) {
    setFormError('');
    setSubmitting(true);
    try {
      await userApi.update(user.id, { currentPassword, password });
      // Reload the signed-in user so the screen shows the saved account.
      const session = await refreshSession();
      setUser(session.user);
      reset(DEFAULTS);
      toast.success('Password changed');
    } catch (error) {
      if (error.status === 401)
        setError('currentPassword', { type: 'server', message: error.message });
      else setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="Change password" breadcrumb={['Account']} />
      <form
        className="card card-lg"
        style={{ maxWidth: 640 }}
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <div className="form-section-title">Password</div>
        <div className="form-section-sub">
          Use a strong password that you do not use anywhere else.
        </div>
        <div className="col" style={{ gap: 16, marginTop: 20 }}>
          <ErrorAlert message={formError} />
          <Field label="Current password" required error={errors.currentPassword?.message}>
            <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
          </Field>
          <Field
            label="New password"
            required
            error={errors.password?.message}
            help={PASSWORD_HINT}
          >
            <PasswordInput autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
        </div>
        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            <Check />
            {submitting ? 'Saving…' : 'Change password'}
          </Button>
        </div>
      </form>
    </>
  );
}
