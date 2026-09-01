import { useEffect, useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { MfaChallengeForm } from '../components/MfaChallengeForm';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';

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
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

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
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">QMS Platform</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {mfaRequired ? (
            <div>
              <h2 className="mb-4 text-lg font-medium text-gray-900">Two-factor authentication</h2>
              <MfaChallengeForm sessionId={mfaSessionId!} onSuccess={handleMfaSuccess} />
            </div>
          ) : (
            <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Quality Management System — Enterprise
        </p>
      </div>
    </div>
  );
}
