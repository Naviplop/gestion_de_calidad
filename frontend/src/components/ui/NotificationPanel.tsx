import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApiClient } from '../../lib/auth/auth.service';
import { NotificationListItem } from '../../lib/auth/auth.service';
import { Icon } from './Icon';

interface NotificationPanelProps {
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  DOCUMENT_SUBMITTED: 'Documento enviado',
  DOCUMENT_APPROVED: 'Documento aprobado',
  DOCUMENT_PUBLISHED: 'Documento publicado',
  NC_CREATED: 'No conformidad creada',
  NC_RESOLVED: 'No conformidad resuelta',
  AUDIT_SCHEDULED: 'Auditoría programada',
  AUDIT_COMPLETED: 'Auditoría completada',
};

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await authApiClient.listNotifications({ page: 1, pageSize: 20, unreadOnly: false });
        setNotifications(result.data);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="rounded-md border border-slate-200 bg-white py-1 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Notificaciones</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">Cargando...</div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">Sin notificaciones</div>
      ) : (
        <div className="max-h-80 overflow-auto">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.entityType === 'document' ? `/documents/${n.entityId}` : '/dashboard'}
              onClick={onClose}
              className={`flex gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!n.readAt ? 'bg-blue-50/50' : ''}`}
            >
              <Icon
                name={n.type === 'NC_CREATED' || n.type === 'NC_RESOLVED' ? 'warning' : 'document'}
                className={`mt-0.5 h-4 w-4 shrink-0 ${!n.readAt ? 'text-blue-600' : 'text-slate-400'}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${!n.readAt ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {n.title}
                </p>
                <p className="truncate text-xs text-slate-500">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {typeLabels[n.type] || n.type} · {new Date(n.createdAt).toLocaleString('es-ES')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="border-t border-slate-100 px-4 py-2">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todas las notificaciones
        </Link>
      </div>
    </div>
  );
}
