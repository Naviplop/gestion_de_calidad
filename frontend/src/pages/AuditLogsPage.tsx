import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { AuditLogListItem, SecurityEventListItem } from '../lib/auth/auth.service';

type Tab = 'audit-logs' | 'security-events';

const SEVERITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical'];

export function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('audit-logs');
  const [auditLogs, setAuditLogs] = useState<AuditLogListItem[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [correlationIdFilter, setCorrelationIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogListItem | null>(null);
  const [selectedSecurityEvent, setSelectedSecurityEvent] = useState<SecurityEventListItem | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listAuditLogs({
        page: meta.page,
        pageSize: meta.pageSize,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        actorId: actorIdFilter || undefined,
        correlationId: correlationIdFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setAuditLogs(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, actionFilter, entityTypeFilter, actorIdFilter, correlationIdFilter, dateFrom, dateTo]);

  const loadSecurityEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listSecurityEvents({
        page: meta.page,
        pageSize: meta.pageSize,
        eventType: eventTypeFilter || undefined,
        severity: severityFilter || undefined,
        actorId: actorIdFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setSecurityEvents(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, eventTypeFilter, severityFilter, actorIdFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === 'audit-logs') {
      loadAuditLogs();
    } else {
      loadSecurityEvents();
    }
  }, [activeTab, loadAuditLogs, loadSecurityEvents]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    if (activeTab === 'audit-logs') {
      loadAuditLogs();
    } else {
      loadSecurityEvents();
    }
  };

  const renderMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return <span className="text-gray-400">None</span>;
    }
    return (
      <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit & Security</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review audit logs and security events for your organization.
          </p>
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          <button
            type="button"
            onClick={() => { setActiveTab('audit-logs'); setMeta((prev) => ({ ...prev, page: 1 })); }}
            className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
              activeTab === 'audit-logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Audit Logs
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('security-events'); setMeta((prev) => ({ ...prev, page: 1 })); }}
            className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
              activeTab === 'security-events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Security Events
          </button>
        </nav>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {activeTab === 'audit-logs' ? (
            <>
              <input
                type="text"
                placeholder="Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Entity type"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Actor ID"
                value={actorIdFilter}
                onChange={(e) => setActorIdFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Correlation ID"
                value={correlationIdFilter}
                onChange={(e) => setCorrelationIdFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Event type"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {SEVERITY_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity || 'All severities'}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Actor ID"
                value={actorIdFilter}
                onChange={(e) => setActorIdFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                  {activeTab === 'audit-logs' ? (
                    <>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Entity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Event Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Severity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {activeTab === 'audit-logs' &&
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{log.id}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{log.action}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                        {log.entityType}:{log.entityId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                        {log.actor?.email || log.actorId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                {activeTab === 'security-events' &&
                  securityEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{event.id}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{event.eventType}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            event.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : event.severity === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : event.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-sm text-gray-900" title={event.description}>
                        {event.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={meta.page <= 1}
            onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedAuditLog && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
            <button
              type="button"
              onClick={() => setSelectedAuditLog(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Action:</span> {selectedAuditLog.action}
            </div>
            <div>
              <span className="font-medium text-gray-700">Entity:</span> {selectedAuditLog.entityType}:{selectedAuditLog.entityId}
            </div>
            <div>
              <span className="font-medium text-gray-700">Actor:</span> {selectedAuditLog.actor?.email || selectedAuditLog.actorId}
            </div>
            <div>
              <span className="font-medium text-gray-700">IP:</span> {selectedAuditLog.ipAddress || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">User Agent:</span> {selectedAuditLog.userAgent || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">Correlation ID:</span> {selectedAuditLog.correlationId || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">Payload:</span>
              {renderMetadata(selectedAuditLog.payload)}
            </div>
          </div>
        </div>
      )}

      {selectedSecurityEvent && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Security Event Details</h3>
            <button
              type="button"
              onClick={() => setSelectedSecurityEvent(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Event Type:</span> {selectedSecurityEvent.eventType}
            </div>
            <div>
              <span className="font-medium text-gray-700">Severity:</span>{' '}
              <span
                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  selectedSecurityEvent.severity === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : selectedSecurityEvent.severity === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : selectedSecurityEvent.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                }`}
              >
                {selectedSecurityEvent.severity}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description:</span> {selectedSecurityEvent.description}
            </div>
            <div>
              <span className="font-medium text-gray-700">IP:</span> {selectedSecurityEvent.ipAddress || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">User Agent:</span> {selectedSecurityEvent.userAgent || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">Correlation ID:</span> {selectedSecurityEvent.correlationId || 'N/A'}
            </div>
            <div>
              <span className="font-medium text-gray-700">Metadata:</span>
              {renderMetadata(selectedSecurityEvent.metadata)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
