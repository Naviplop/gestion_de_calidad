import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('El correo electrónico y la contraseña son obligatorios.');
      return;
    }
    try {
      await onSubmit(email, password);
    } catch {
      setLocalError('Credenciales inválidas.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="email"
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@empresa.com"
        autoComplete="email"
        required
      />
      <Input
        id="password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••••••"
        autoComplete="current-password"
        required
      />

      {(error || localError) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError || error}
        </div>
      )}

      <Button type="submit" className="w-full" loading={isLoading}>
        Iniciar sesión
      </Button>
    </form>
  );
}
