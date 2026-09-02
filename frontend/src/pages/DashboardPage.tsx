import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authApiClient } from '../lib/auth/auth.service';
import type { DashboardSummary } from '../lib/auth/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';

type Severity = 'info' | 'warning' | 'error';

const severityStyles: Record<Severity, { container: string; dot: string; label: string }> = {
  info: { container: 'border-sky-200 bg-sky-50/50', dot: 'bg-sky-500', label: 'text-sky-700' },
  warning: { container: 'border-amber-200 bg-amber-50/50', dot: 'bg-amber-500', label: 'text-amber-700' },
  error: { container: 'border-red-200 bg-red-50/50', dot: 'bg-red-500', label: 'text-red-700' },
};

const activityIcons: Record<string, Parameters<typeof Icon>[0]['name']> = {
  document: 'document',
  audit: 'clipboard',
  nonconformity: 'warning',
  risk: 'shield',
  correctiveAction: 'check',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.getDashboardSummary();
      setSummary(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el panel de control');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const formatRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(date);
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Panel de control" description="Resumen del sistema de gestión de calidad" />
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Spinner className="mr-2" />
            <span className="text-sm">Cargando panel de control...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Panel de control" description="Resumen del sistema de gestión de calidad" />
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="text-base font-semibold text-red-900">Error al cargar el panel</h2>
            <p className="mt-1.5 text-sm text-red-700">{error}</p>
            <Button onClick={loadSummary} variant="secondary" className="mt-4">
              Reintentar
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!summary) {
    return (
      <>
        <PageHeader title="Panel de control" />
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <EmptyState
            title="Sin datos disponibles"
            description="Comienza creando registros en el sistema para ver el resumen."
            icon="file"
          />
        </div>
      </>
    );
  }

  const firstName = user?.firstName || '';
  const totalNC = summary.nonconformities.open;
  const totalCAPA = summary.correctiveActions.open + summary.correctiveActions.inProgress;
  const totalAuditsActive = summary.audits.inProgress + summary.audits.planned;

  return (
    <>
      <PageHeader
        title="Panel de control"
        description={`Centro operativo del sistema de gestión${firstName ? ` — Bienvenido, ${firstName}` : ''}`}
        metadata={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon name="building" className="h-3.5 w-3.5" />
            <span>{user?.tenant?.name}</span>
          </div>
        }
      />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPIs compactos */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pendientes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              title="Documentos"
              value={summary.documents.total}
              subtitle={`${summary.documents.published} publicados · ${summary.documents.draft} borradores`}
              href="/documents"
            />
            <KpiCard
              title="Auditorías activas"
              value={totalAuditsActive}
              subtitle={`${summary.audits.inProgress} en curso · ${summary.audits.planned} planificadas`}
              href="/audits"
              accent={summary.audits.inProgress > 0 ? 'info' : 'default'}
            />
            <KpiCard
              title="No conformidades"
              value={totalNC}
              subtitle={`${summary.nonconformities.open} abiertas · ${summary.nonconformities.closed} cerradas`}
              href="/nonconformities"
              accent={totalNC > 0 ? 'error' : 'default'}
            />
            <KpiCard
              title="Acciones correctivas"
              value={totalCAPA}
              subtitle={`${summary.correctiveActions.open} abiertas`}
              href="/nonconformities"
              accent={totalCAPA > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              title="Riesgos"
              value={summary.risks.total}
              subtitle={`${summary.risks.assessed} evaluados · ${summary.risks.underControl} bajo control`}
              href="/risks"
            />
          </div>
        </section>

        {/* Centro operativo: dos columnas */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Actividad reciente */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
                  <p className="text-xs text-slate-500">Últimos eventos del sistema</p>
                </div>
                <Link to="/audit-logs" className="text-xs font-medium text-slate-600 hover:text-slate-900">
                  Ver todo
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {summary.recentActivity.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">Sin actividad reciente</div>
                ) : (
                  summary.recentActivity.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <Icon name={activityIcons[item.type] || 'file'} className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{formatRelative(item.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Alertas */}
          <div>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Alertas</h3>
                  <p className="text-xs text-slate-500">Notificaciones del sistema</p>
                </div>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                  {summary.alerts.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {summary.alerts.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">Sin alertas pendientes</div>
                ) : (
                  summary.alerts.map((alert) => {
                    const sev = severityStyles[alert.severity as Severity] || severityStyles.info;
                    return (
                      <div key={alert.id} className={`border-l-2 ${sev.container} px-4 py-3`}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${sev.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{alert.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const accentMap = {
  default: { value: 'text-slate-900', dot: 'bg-slate-400' },
  info: { value: 'text-sky-700', dot: 'bg-sky-500' },
  warning: { value: 'text-amber-700', dot: 'bg-amber-500' },
  error: { value: 'text-red-700', dot: 'bg-red-500' },
};

function KpiCard({
  title,
  value,
  subtitle,
  href,
  accent = 'default',
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  accent?: 'default' | 'info' | 'warning' | 'error';
}) {
  const a = accentMap[accent];
  return (
    <Link
      to={href}
      className="group block rounded-lg border border-slate-200 bg-white p-4 qms-transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
        <p className="text-xs font-medium text-slate-500">{title}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${a.value}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{subtitle}</p>
    </Link>
  );
}
