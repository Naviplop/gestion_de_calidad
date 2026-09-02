import { useEffect, useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { MfaChallengeForm } from '../components/MfaChallengeForm';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const login = useAuth((state) => state.login);
  const setMfaSessionId = useAuth((state) => state.setMfaSessionId);
  const mfaSessionId = useAuth((state) => state.mfaSessionId);
  const setLoading = useAuth((state) => state.setLoading);
  const setError = useAuth((state) => state.setError);
  const clearError = useAuth((state) => state.clearError);
  const isLoading = useAuth((state) => state.isLoading);
  const error = useAuth((state) => state.error);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (email: string, password: string) => {
    clearError();
    setLoading(true);

    try {
      const response = await authApiClientWithEvents.login(email, password);
      const data = response.data;
      if (data.mfaRequired) {
        setMfaSessionId(data.sessionId);
        setMfaRequired(true);
        setLoading(false);
        return;
      }
      login(data.accessToken, data.user);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de inicio de sesión';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded bg-slate-900 text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">QMS Platform</h1>
          <p className="mt-2 text-sm text-slate-500">Inicia sesión en tu cuenta</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {mfaRequired ? (
            <div>
              <h2 className="mb-4 text-base font-medium text-slate-900">Autenticación de dos factores</h2>
              <MfaChallengeForm sessionId={mfaSessionId!} onSuccess={handleMfaSuccess} />
            </div>
          ) : (
            <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sistema de Gestión de Calidad — Enterprise
        </p>
      </div>
    </div>
  );
}
