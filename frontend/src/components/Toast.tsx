import { useState, createContext, useContext, useCallback, useRef } from 'react';
import { Icon } from './ui/Icon';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles: Record<ToastType, { container: string; iconColor: string; iconName: Parameters<typeof Icon>[0]['name'] }> = {
  success: {
    container: 'border-emerald-200 bg-white text-slate-800',
    iconColor: 'text-emerald-600 bg-emerald-50',
    iconName: 'check',
  },
  error: {
    container: 'border-red-200 bg-white text-slate-800',
    iconColor: 'text-red-600 bg-red-50',
    iconName: 'exclamation',
  },
  warning: {
    container: 'border-amber-200 bg-white text-slate-800',
    iconColor: 'text-amber-600 bg-amber-50',
    iconName: 'warning',
  },
  info: {
    container: 'border-sky-200 bg-white text-slate-800',
    iconColor: 'text-sky-600 bg-sky-50',
    iconName: 'bell',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++idRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const cfg = styles[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm shadow-md animate-slide-in-right ${cfg.container}`}
            >
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.iconColor}`}>
                <Icon name={cfg.iconName} className="h-3.5 w-3.5" />
              </span>
              <p className="flex-1 leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar notificación"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
