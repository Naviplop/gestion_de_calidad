import { useEffect, useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { MfaChallengeForm } from '../components/MfaChallengeForm';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';

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
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white">
            <Icon name="shield-check" className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">QMS Platform</h1>
          <p className="mt-1.5 text-sm text-slate-500">Inicia sesión en tu cuenta</p>
          <p className="mt-0.5 text-xs text-slate-400">Sistema de Gestión de Calidad — Enterprise</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {mfaRequired ? (
            <div>
              <h2 className="mb-1 text-base font-semibold text-slate-900">Verificación en dos pasos</h2>
              <p className="mb-4 text-sm text-slate-500">Ingrese el código de su aplicación autenticadora.</p>
              <MfaChallengeForm sessionId={mfaSessionId!} onSuccess={handleMfaSuccess} />
            </div>
          ) : (
            <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Plataforma segura · ISO 9001 / 27001
        </p>
      </div>
    </div>
  );
}
