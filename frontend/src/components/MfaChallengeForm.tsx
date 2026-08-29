import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';

interface MfaChallengeFormProps {
  sessionId: string;
  onSuccess: () => void;
}

export function MfaChallengeForm({ sessionId, onSuccess }: MfaChallengeFormProps) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const setLoading = useAuth((state) => state.setLoading);
  const setError = useAuth((state) => state.setError);
  const clearError = useAuth((state) => state.clearError);
  const isLoading = useAuth((state) => state.isLoading);
  const error = useAuth((state) => state.error);
  const completeMfaLogin = useAuth((state) => state.completeMfaLogin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setLoading(true);

    try {
      const response = await authApiClientWithEvents.verifyMfa(sessionId, code);
      completeMfaLogin(response.accessToken, response.user);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MFA verification failed';
      setError(message);
      setLocalError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700">
          Verification code
        </label>
        <input
          id="mfaCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="123456"
        />
      </div>

      {(error || localError) && (
        <p className="text-sm text-red-600">{error || localError}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? 'Verifying...' : 'Verify'}
      </button>
    </form>
  );
}
