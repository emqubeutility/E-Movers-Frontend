import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Loader.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Checking your session" />;
  if (status !== 'authenticated')
    return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
