import { useState } from 'react';

interface MfaChallengeFormProps {
  sessionId: string;
  onSuccess: () => void;
}

export function MfaChallengeForm({ sessionId, onSuccess }: MfaChallengeFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code }),
      });

      if (!response.ok) {
        throw new Error('Código inválido');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la verificación de MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700">
          Código de verificación
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm tracking-widest transition-all focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          placeholder="123456"
          maxLength={6}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Verificando...' : 'Verificar'}
      </button>
    </form>
  );
}
