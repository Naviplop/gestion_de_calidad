import { ConfirmDialog } from './ui/ConfirmDialog';

export interface ConfirmModalProps {
  action: string;
  resourceCode: string;
  resourceType?: string;
  onConfirm: () => void;
  onCancel: () => void;
  messages?: Record<string, { title: string; message: string; confirmText: string }>;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  open?: boolean;
}

export function ConfirmModal({
  action,
  resourceCode,
  resourceType,
  onConfirm,
  onCancel,
  messages,
  variant = 'danger',
  loading,
  open = true,
}: ConfirmModalProps) {
  const config = messages?.[action] || {
    title: 'Confirmar acción',
    message: resourceType
      ? `¿Está seguro de que desea ${action} ${resourceType} "${resourceCode}"?`
      : `¿Está seguro de que desea ${action} "${resourceCode}"?`,
    confirmText: action,
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      variant={variant}
      loading={loading}
    />
  );
}
