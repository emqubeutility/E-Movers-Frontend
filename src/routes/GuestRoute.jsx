import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Loader.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';

/** Sign-in and registration pages are only for visitors who are not signed in. */
export default function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader label="Checking your session" />;
  return status === 'authenticated' ? <Navigate to="/overview" replace /> : <Outlet />;
}
