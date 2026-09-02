export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 ${className}`} />
  );
}
