import { Badge } from './Badge';

const STATUSES = {
  DRAFT: { label: 'Borrador', variant: 'default' as const },
  IN_REVIEW: { label: 'En revisión', variant: 'info' as const },
  REJECTED: { label: 'Rechazado', variant: 'danger' as const },
  PENDING_APPROVAL: { label: 'Pendiente de aprobación', variant: 'warning' as const },
  APPROVED: { label: 'Aprobado', variant: 'success' as const },
  PUBLISHED: { label: 'Publicado', variant: 'info' as const },
  CURRENT: { label: 'Vigente', variant: 'success' as const },
  OBSOLETE: { label: 'Obsoleto', variant: 'default' as const },
  CANCELLED: { label: 'Cancelado', variant: 'danger' as const },

  PLANNED: { label: 'Planificada', variant: 'info' as const },
  IN_PROGRESS: { label: 'En progreso', variant: 'warning' as const },
  COMPLETED: { label: 'Completada', variant: 'success' as const },

  OPEN: { label: 'Abierta', variant: 'warning' as const },
  VERIFICATION: { label: 'En verificación', variant: 'info' as const },
  CLOSED: { label: 'Cerrada', variant: 'success' as const },

  IDENTIFIED: { label: 'Identificado', variant: 'default' as const },
  ASSESSED: { label: 'Evaluado', variant: 'info' as const },
  TREATED: { label: 'Tratado', variant: 'success' as const },
  MITIGATED: { label: 'Mitigado', variant: 'success' as const },

  ACTIVE: { label: 'Activo', variant: 'success' as const },
  INACTIVE: { label: 'Inactivo', variant: 'default' as const },
  LOCKED: { label: 'Bloqueado', variant: 'danger' as const },
  PENDING: { label: 'Pendiente', variant: 'warning' as const },

  ENABLED: { label: 'Habilitado', variant: 'success' as const },
  DISABLED: { label: 'Deshabilitado', variant: 'default' as const },

  LOW: { label: 'Baja', variant: 'default' as const },
  MEDIUM: { label: 'Media', variant: 'info' as const },
  HIGH: { label: 'Alta', variant: 'warning' as const },
  CRITICAL: { label: 'Crítica', variant: 'danger' as const },

  MAJOR: { label: 'Mayor', variant: 'danger' as const },
  MINOR: { label: 'Menor', variant: 'warning' as const },

  INTERNAL: { label: 'Interno', variant: 'default' as const },
  CONFIDENTIAL: { label: 'Confidencial', variant: 'warning' as const },
  RESTRICTED: { label: 'Restringido', variant: 'danger' as const },
  PUBLIC: { label: 'Público', variant: 'default' as const },
} as const;

type StatusKey = keyof typeof STATUSES;

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const key = status as StatusKey;
  const config = STATUSES[key] || { label: status, variant: 'default' as const };
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}

export { STATUSES };
