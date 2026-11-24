import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
