import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { DashboardSummary } from '../lib/auth/auth.service';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

type Severity = 'info' | 'warning' | 'error';

const severityStyles: Record<Severity, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

const severityBadge: Record<Severity, string> = {
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
};

const activityIcons: Record<string, string> = {
  document: '📄',
  audit: '🔍',
  nonconformity: '⚠️',
  risk: '🛡️',
  correctiveAction: '✅',
};

export function DashboardPage() {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="mr-2" />
        <span className="text-sm text-slate-500">Cargando panel de control...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Error al cargar el panel</h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button onClick={loadSummary} variant="secondary" className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title="Sin datos disponibles"
        description="Comienza creando registros en el sistema para ver el resumen."
      />
    );
  }

  const hasData =
    summary.documents.total > 0 ||
    summary.audits.total > 0 ||
    summary.nonconformities.total > 0 ||
    summary.correctiveActions.total > 0 ||
    summary.risks.total > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Panel de control</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen del sistema de gestión de calidad</p>
      </div>

      {!hasData && (
        <EmptyState
          title="Sin datos disponibles"
          description="Comienza creando registros en el sistema para ver el resumen."
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Documentos"
          total={summary.documents.total}
          mainStatus={summary.documents.published}
          mainLabel="Publicados"
          href="/documents"
        />
        <KpiCard
          title="Auditorías"
          total={summary.audits.total}
          mainStatus={summary.audits.inProgress}
          mainLabel="En progreso"
          href="/audits"
        />
        <KpiCard
          title="No conformidades"
          total={summary.nonconformities.total}
          mainStatus={summary.nonconformities.open}
          mainLabel="Abiertas"
          href="/nonconformities"
          accent={summary.nonconformities.open > 0 ? 'error' : 'default'}
        />
        <KpiCard
          title="Acciones correctivas"
          total={summary.correctiveActions.total}
          mainStatus={summary.correctiveActions.open}
          mainLabel="Abiertas"
          href="/nonconformities"
          accent={summary.correctiveActions.open > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title="Riesgos"
          total={summary.risks.total}
          mainStatus={summary.risks.identified + summary.risks.assessed}
          mainLabel="Identificados + Evaluados"
          href="/risks"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.recentActivity.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">Sin actividad reciente</div>
              ) : (
                summary.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-6 py-3">
                    <span className="mt-0.5 text-sm">{activityIcons[item.type] || '📋'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <time className="whitespace-nowrap text-xs text-slate-400">{formatDate(item.timestamp)}</time>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Alertas</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.alerts.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">Sin alertas pendientes</div>
              ) : (
                summary.alerts.map((alert) => (
                  <div key={alert.id} className={`px-4 py-3 ${severityStyles[alert.severity as Severity] || severityStyles.info}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityBadge[alert.severity as Severity] || severityBadge.info}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-90">{alert.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  total,
  mainStatus,
  mainLabel,
  href,
  accent = 'default',
}: {
  title: string;
  total: number;
  mainStatus: number;
  mainLabel: string;
  href: string;
  accent?: 'default' | 'error' | 'warning';
}) {
  const accentText = accent === 'error' ? 'text-red-600' : accent === 'warning' ? 'text-amber-600' : 'text-slate-900';

  return (
    <a href={href} className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
      <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${accentText}`}>
        <span className="h-1 w-1 rounded-full bg-current" />
        {mainStatus} {mainLabel}
      </div>
    </a>
  );
}
