export interface ConfirmModalProps {
  action: string;
  resourceCode: string;
  resourceType?: string;
  onConfirm: () => void;
  onCancel: () => void;
  messages?: Record<string, { title: string; message: string; confirmText: string }>;
  confirmButtonClassName?: string;
}

export function ConfirmModal({ action, resourceCode, resourceType, onConfirm, onCancel, messages, confirmButtonClassName = 'bg-red-600 hover:bg-red-500' }: ConfirmModalProps) {
  const defaultMessages: Record<string, { title: string; message: string; confirmText: string }> = {
    ...messages,
  };

  const config = defaultMessages[action] || {
    title: 'Confirmar acción',
    message: resourceType ? `¿Está seguro de que desea ${action} "${resourceCode}"?` : `¿Está seguro de que desea ${action} "${resourceCode}"?`,
    confirmText: action,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
        <p className="mt-2 text-sm text-slate-500">{config.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm ${confirmButtonClassName}`}>
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
