import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="code"
        label="Código de verificación"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        maxLength={6}
        className="font-mono tracking-widest"
        required
      />
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" loading={loading}>
        Verificar
      </Button>
    </form>
  );
}
