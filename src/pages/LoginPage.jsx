import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import AuthShell from '../components/layout/AuthShell.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorAlert } from '../components/ui/Display.jsx';
import Field, { IconInput, PasswordInput } from '../components/ui/Field.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { loginSchema } from '../features/auth/schemas.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function submit(values) {
    setFormError('');
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/overview', { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account"
      footer="Forgot your user name or password? Ask your administrator."
    >
      <form className="lg-form" onSubmit={handleSubmit(submit)} noValidate>
        <ErrorAlert message={formError} />
        <Field label="User name" required error={errors.username?.message}>
          <IconInput
            icon={BadgeCheck}
            autoComplete="username"
            placeholder="Your user name"
            {...register('username')}
          />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <PasswordInput
            autoComplete="current-password"
            placeholder="Your password"
            {...register('password')}
          />
        </Field>
        <Button type="submit" className="lg-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  );
}
