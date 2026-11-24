import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshSession, setAuthFailureHandler } from '../../services/api.js';
import { tokenStore } from '../../services/tokenStore.js';
import { Spinner } from '../../components/ui/Loader.jsx';
import { authApi } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [signingOut, setSigningOut] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
    setSigningOut(false);
  }, [queryClient]);

  const startSession = useCallback((session) => {
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  // On first load the access token is gone (memory only); the refresh cookie restores the session.
  useEffect(() => {
    let cancelled = false;
    setAuthFailureHandler(clearSession);
    refreshSession()
      .then((session) => !cancelled && startSession(session))
      .catch(() => !cancelled && setStatus('unauthenticated'));
    return () => {
      cancelled = true;
    };
  }, [clearSession, startSession]);

  const login = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  );
  /** Makes another organization the active one; every screen then reloads its data. */
  const switchOrganization = useCallback(
    async (organizationId, name = '') => {
      setSwitchingTo(name || 'organization');
      try {
        const session = await authApi.switchOrganization(organizationId);
        tokenStore.set(session.accessToken);
        setUser(session.user);
        // Everything cached belongs to the old organization, except the person's own menu access.
        // Waiting for the reload keeps the loader up until the new data is ready.
        await queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== 'permissions' });
      } finally {
        setSwitchingTo(null);
      }
    },
    [queryClient],
  );
  const logout = useCallback(async () => {
    setSigningOut(true);
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      switchOrganization,
      setUser,
    }),
    [user, status, login, logout, switchOrganization],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {switchingTo && !signingOut && (
        <div className="signout-overlay" role="status" aria-live="polite">
          <Spinner />
          <span>Switching to {switchingTo}…</span>
        </div>
      )}
      {signingOut && (
        <div className="signout-overlay" role="status" aria-live="polite">
          <Spinner />
          <span>Signing out…</span>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
