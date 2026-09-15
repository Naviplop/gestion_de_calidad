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

const severityStyles: Record<Severity, { container: string; dot: string; label: string; border: string }> = {
  info: { container: 'border-sky-200 bg-sky-50/50', dot: 'bg-sky-500', label: 'text-sky-700', border: 'border-l-sky-500' },
  warning: { container: 'border-amber-200 bg-amber-50/50', dot: 'bg-amber-500', label: 'text-amber-700', border: 'border-l-amber-500' },
  error: { container: 'border-red-200 bg-red-50/50', dot: 'bg-red-500', label: 'text-red-700', border: 'border-l-red-500' },
};

const activityIcons: Record<string, Parameters<typeof Icon>[0]['name']> = {
  document: 'document',
  audit: 'clipboard',
  nonconformity: 'warning',
  risk: 'shield',
  correctiveAction: 'check',
};

const alertActions: Record<string, { href: string; label: string }> = {
  'audit-planned': { href: '/audits', label: 'Ver auditorías' },
  'nc-open': { href: '/nonconformities', label: 'Gestionar NC' },
  'ca-pending': { href: '/nonconformities', label: 'Ver acciones' },
  'ca-verification-pending': { href: '/nonconformities', label: 'Verificar acciones' },
  'risk-without-treatment': { href: '/risks', label: 'Ver riesgos' },
  'document-pending-approval': { href: '/documents', label: 'Ver documentos' },
};

const alertSeverityMap: Record<string, Severity> = {
  'audit-planned': 'info',
  'nc-open': 'error',
  'ca-pending': 'warning',
  'ca-verification-pending': 'warning',
  'risk-without-treatment': 'warning',
  'document-pending-approval': 'info',
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
            <Spinner className="mr-2" aria-hidden="true" />
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
  const docs = summary.documents;
  const audits = summary.audits;
  const ncs = summary.nonconformities;
  const capa = summary.correctiveActions;
  const risks = summary.risks;

  const hasAnyData = docs.total + audits.total + ncs.total + capa.total + risks.total > 0;

  return (
    <>
      <PageHeader
        title="Panel de control"
        description={`Centro operativo del sistema de gestión${firstName ? ` — Bienvenido, ${firstName}` : ''}`}
        metadata={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon name="building" className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{user?.tenant?.name}</span>
          </div>
        }
      />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Resumen</h2>
          <p className="mb-3 text-xs text-slate-400">Métricas clave de la organización</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              title="Documentos"
              value={docs.total}
              subtitle={`${docs.published} vigentes · ${docs.inReview} en revisión · ${docs.approved} aprobados · ${docs.obsolete} obsoletos`}
              href="/documents"
              accent={docs.inReview > 0 || docs.draft > 0 ? 'warning' : 'default'}
              aria-label={`Documentos: ${docs.total} total`}
            />
            <KpiCard
              title="Auditorías"
              value={audits.total}
              subtitle={`${audits.inProgress} en curso · ${audits.planned} planificadas · ${audits.completed} completadas`}
              href="/audits"
              accent={audits.inProgress > 0 ? 'info' : 'default'}
              aria-label={`Auditorías: ${audits.total} total`}
            />
            <KpiCard
              title="No conformidades"
              value={ncs.total}
              subtitle={`${ncs.open} abiertas · ${ncs.closed} cerradas`}
              href="/nonconformities"
              accent={ncs.open > 0 ? 'error' : 'default'}
              aria-label={`No conformidades: ${ncs.total} total`}
            />
            <KpiCard
              title="Acciones correctivas"
              value={capa.total}
              subtitle={`${capa.open + capa.inProgress} pendientes · ${capa.completed} completadas · ${capa.verified} verificadas`}
              href="/nonconformities"
              accent={capa.open + capa.inProgress > 0 ? 'warning' : 'default'}
              aria-label={`Acciones correctivas: ${capa.total} total`}
            />
            <KpiCard
              title="Riesgos"
              value={risks.total}
              subtitle={`${risks.identified} identificados · ${risks.assessed} evaluados · ${risks.underControl} bajo control`}
              href="/risks"
              accent={risks.identified > 0 && risks.underControl === 0 ? 'warning' : 'default'}
              aria-label={`Riesgos: ${risks.total} total`}
            />
          </div>
          {!hasAnyData && (
            <p className="mt-3 text-xs text-slate-400">No hay registros en el sistema. Comienza creando documentos, auditorías o riesgos para ver las métricas.</p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-labelledby="operations-heading">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h3 id="operations-heading" className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
                  <p className="text-xs text-slate-500">Últimos cambios en la organización</p>
                </div>
                <Link to="/audit-logs" className="text-xs font-medium text-slate-600 hover:text-slate-900" aria-label="Ver todo el registro de actividad">
                  Ver todo
                </Link>
              </div>
              <div className="divide-y divide-slate-100" role="list" aria-label="Actividad reciente">
                {summary.recentActivity.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Icon name="file" className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-slate-700">Sin actividad reciente</p>
                    <p className="mt-0.5 text-xs text-slate-500">Cuando se realicen cambios en documentos, auditorías o riesgos aparecerán aquí.</p>
                  </div>
                ) : (
                  summary.recentActivity.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3" role="listitem">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600" aria-hidden="true">
                        <Icon name={activityIcons[item.type] || 'file'} className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      <time className="shrink-0 text-xs text-slate-400" dateTime={item.timestamp}>{formatRelative(item.timestamp)}</time>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Alertas</h3>
                  <p className="text-xs text-slate-500">Elementos que requieren atención</p>
                </div>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white" aria-label={`${summary.alerts.length} alertas`}>
                  {summary.alerts.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100" role="list" aria-label="Alertas del sistema">
                {summary.alerts.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Icon name="bell" className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-slate-700">Sin alertas pendientes</p>
                    <p className="mt-0.5 text-xs text-slate-500">No hay elementos que requieran tu atención en este momento.</p>
                  </div>
                ) : (
                  summary.alerts.map((alert) => {
                    const raw = alert.severity as Severity | undefined;
                    const mappedSeverity = raw && severityStyles[raw] ? raw : (alertSeverityMap[alert.type] || 'info');
                    const sev = severityStyles[mappedSeverity];
                    const action = alertActions[alert.type];
                    return (
                      <div key={alert.id} className={`border-l-2 ${sev.border} ${sev.container} px-4 py-3`} role="listitem">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${sev.label}`}>{alert.title}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{alert.description}</p>
                            {action && (
                              <Link to={action.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
                                {action.label}
                                <Icon name="arrow-right" className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            )}
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
  ariaLabel,
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  accent?: 'default' | 'info' | 'warning' | 'error';
  ariaLabel?: string;
}) {
  const a = accentMap[accent];
  return (
    <Link
      to={href}
      className="group block rounded-lg border border-slate-200 bg-white p-4 qms-transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      aria-label={ariaLabel || `${title}: ${value}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden="true" />
        <p className="text-xs font-medium text-slate-500">{title}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${a.value}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{subtitle}</p>
    </Link>
  );
}
