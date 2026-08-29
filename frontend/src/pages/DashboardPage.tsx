import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { DashboardSummary } from '../lib/auth/auth.service';

type Severity = 'info' | 'warning' | 'error';

const severityStyles: Record<Severity, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

const severityBadge: Record<Severity, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
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
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
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
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Error loading dashboard</h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={loadSummary}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No data available</h2>
          <p className="mt-2 text-sm text-gray-500">Start by creating records in the system.</p>
        </div>
      </div>
    );
  }

  const hasData =
    summary.documents.total > 0 ||
    summary.audits.total > 0 ||
    summary.nonconformities.total > 0 ||
    summary.correctiveActions.total > 0 ||
    summary.risks.total > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Quality Management System overview</p>
      </div>

      {!hasData && (
        <div className="mb-8 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No data available</h2>
          <p className="mt-2 text-sm text-gray-500">Start by creating records in the system.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Documents"
          total={summary.documents.total}
          mainStatus={summary.documents.published}
          mainLabel="Published"
          href="/documents"
        />
        <KpiCard
          title="Audits"
          total={summary.audits.total}
          mainStatus={summary.audits.inProgress}
          mainLabel="In Progress"
          href="/audits"
        />
        <KpiCard
          title="Nonconformities"
          total={summary.nonconformities.total}
          mainStatus={summary.nonconformities.open}
          mainLabel="Open"
          href="/nonconformities"
          accent={summary.nonconformities.open > 0 ? 'error' : 'default'}
        />
        <KpiCard
          title="CAPA"
          total={summary.correctiveActions.total}
          mainStatus={summary.correctiveActions.open}
          mainLabel="Open"
          href="/nonconformities"
          accent={summary.correctiveActions.open > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title="Risks"
          total={summary.risks.total}
          mainStatus={summary.risks.identified + summary.risks.assessed}
          mainLabel="Identified + Assessed"
          href="/risks"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {summary.recentActivity.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500">No recent activity</div>
              ) : (
                summary.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-6 py-3">
                    <span className="mt-0.5 text-lg">{activityIcons[item.type] || '📋'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <time className="whitespace-nowrap text-xs text-gray-400">{formatDate(item.timestamp)}</time>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Alerts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {summary.alerts.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500">No pending alerts</div>
              ) : (
                summary.alerts.map((alert) => (
                  <div key={alert.id} className={`px-4 py-3 ${severityStyles[alert.severity as Severity] || severityStyles.info}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[alert.severity as Severity] || severityBadge.info}`}>
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
  const accentBorder = accent === 'error' ? 'border-red-200' : accent === 'warning' ? 'border-yellow-200' : 'border-gray-200';
  const accentText = accent === 'error' ? 'text-red-600' : accent === 'warning' ? 'text-yellow-600' : 'text-gray-900';

  return (
    <a href={href} className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
      <div className={`mt-3 inline-flex items-center rounded-md border ${accentBorder} px-2.5 py-0.5 text-xs font-medium ${accentText}`}>
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
        {mainStatus} {mainLabel}
      </div>
    </a>
  );
}
