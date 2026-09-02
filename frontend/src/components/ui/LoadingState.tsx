import { Spinner } from './Spinner';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spinner className="mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
