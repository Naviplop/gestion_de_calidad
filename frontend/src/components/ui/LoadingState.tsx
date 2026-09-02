import { Spinner } from './Spinner';

interface LoadingStateProps {
  message?: string;
  variant?: 'inline' | 'block';
}

export function LoadingState({ message = 'Cargando...', variant = 'block' }: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Spinner className="h-4 w-4 border-slate-200 border-t-slate-600" />
        {message}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Spinner className="mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
