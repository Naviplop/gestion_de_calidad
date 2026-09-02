import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { AuditLogListItem, SecurityEventListItem } from '../lib/auth/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Modal } from '../components/ui/Modal';

type Tab = 'audit-logs' | 'security-events';

const SEVERITY_VALUES: string[] = ['low', 'medium', 'high', 'critical'];
void SEVERITY_VALUES;

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
      setError(err instanceof Error ? err.message : 'Error al cargar los registros de auditoría');
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
      setError(err instanceof Error ? err.message : 'Error al cargar los eventos de seguridad');
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
      return <span className="text-slate-400">Ninguno</span>;
    }
    return (
      <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  const severityToStatus: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'DEFAULT'> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'CRITICAL',
  };

  return (
    <>
      <PageHeader
        title="Registros y eventos"
        description="Revise los registros de auditoría y eventos de seguridad de la organización."
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Auditoría' }]}
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="px-5 pt-4">
            <Tabs
              tabs={[
                { id: 'audit-logs', label: 'Registros de auditoría' },
                { id: 'security-events', label: 'Eventos de seguridad' },
              ]}
              activeTab={activeTab}
              onChange={(t) => { setActiveTab(t as Tab); setMeta((prev) => ({ ...prev, page: 1 })); }}
            />
          </div>

          <div className="border-b border-slate-200 px-5 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {activeTab === 'audit-logs' ? (
                <>
                  <Input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="Acción" />
                  <Input value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} placeholder="Tipo de entidad" />
                  <Input value={actorIdFilter} onChange={(e) => setActorIdFilter(e.target.value)} placeholder="ID de actor" />
                  <Input value={correlationIdFilter} onChange={(e) => setCorrelationIdFilter(e.target.value)} placeholder="ID de correlación" />
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </>
              ) : (
                <>
                  <Input value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} placeholder="Tipo de evento" />
                  <Select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Todas las severidades' },
                      { value: 'low', label: 'Baja' },
                      { value: 'medium', label: 'Media' },
                      { value: 'high', label: 'Alta' },
                      { value: 'critical', label: 'Crítica' },
                    ]}
                  />
                  <Input value={actorIdFilter} onChange={(e) => setActorIdFilter(e.target.value)} placeholder="ID de actor" />
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </>
              )}
              <Button onClick={handleSearch} leftIcon="search">Aplicar</Button>
            </div>
          </div>

          {loading ? (
            <div className="p-5"><LoadingState message="Cargando..." /></div>
          ) : activeTab === 'audit-logs' ? (
            auditLogs.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="clipboard" title="No hay registros" description="No se encontraron registros con los filtros aplicados." />
              </div>
            ) : (
              <>
                <Table
                  rowKey={(l) => l.id}
                  columns={[
                    { key: 'action', header: 'Acción', render: (l) => <span className="font-mono text-xs text-slate-700">{l.action}</span> },
                    { key: 'entity', header: 'Entidad', render: (l) => <span className="text-sm text-slate-700">{l.entityType}:{l.entityId.slice(0, 8)}</span> },
                    { key: 'actor', header: 'Actor', render: (l) => l.actor?.email || l.actorId },
                    { key: 'created', header: 'Fecha', render: (l) => new Date(l.createdAt).toLocaleString('es-ES') },
                    {
                      key: 'actions', header: '', align: 'right', width: '80px',
                      render: (l) => <Button variant="ghost" size="sm" onClick={() => setSelectedAuditLog(l)}>Ver</Button>,
                    },
                  ]}
                  data={auditLogs}
                />
                <Pagination
                  page={meta.page}
                  pageSize={meta.pageSize}
                  total={meta.total}
                  onPageChange={(p) => setMeta((prev) => ({ ...prev, page: p }))}
                  className="rounded-b-lg"
                />
              </>
            )
          ) : securityEvents.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="key" title="No hay eventos" description="No se encontraron eventos de seguridad con los filtros aplicados." />
            </div>
          ) : (
            <>
              <Table
                rowKey={(e) => e.id}
                columns={[
                  { key: 'type', header: 'Tipo de evento', render: (e) => <span className="font-mono text-xs text-slate-700">{e.eventType}</span> },
                  { key: 'severity', header: 'Severidad', width: '120px', render: (e) => <StatusPill status={severityToStatus[e.severity] || 'DEFAULT'} /> },
                  { key: 'desc', header: 'Descripción', render: (e) => <span className="truncate text-sm text-slate-700">{e.description}</span> },
                  { key: 'created', header: 'Fecha', render: (e) => new Date(e.createdAt).toLocaleString('es-ES') },
                  {
                    key: 'actions', header: '', align: 'right', width: '80px',
                    render: (e) => <Button variant="ghost" size="sm" onClick={() => setSelectedSecurityEvent(e)}>Ver</Button>,
                  },
                ]}
                data={securityEvents}
              />
              <Pagination
                page={meta.page}
                pageSize={meta.pageSize}
                total={meta.total}
                onPageChange={(p) => setMeta((prev) => ({ ...prev, page: p }))}
                className="rounded-b-lg"
              />
            </>
          )}
        </div>
      </div>

      {selectedAuditLog && (
        <Modal
          open
          onClose={() => setSelectedAuditLog(null)}
          title="Detalle del registro de auditoría"
          description={selectedAuditLog.action}
          size="lg"
          footer={<Button onClick={() => setSelectedAuditLog(null)}>Cerrar</Button>}
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Acción" value={selectedAuditLog.action} />
            <Field label="Entidad" value={`${selectedAuditLog.entityType}:${selectedAuditLog.entityId}`} />
            <Field label="Actor" value={selectedAuditLog.actor?.email || selectedAuditLog.actorId} />
            <Field label="Fecha" value={new Date(selectedAuditLog.createdAt).toLocaleString('es-ES')} />
            <Field label="IP" value={selectedAuditLog.ipAddress || '—'} />
            <Field label="ID de correlación" value={selectedAuditLog.correlationId || '—'} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Agente de usuario</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{selectedAuditLog.userAgent || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Datos</dt>
              <dd className="mt-0.5">{renderMetadata(selectedAuditLog.payload)}</dd>
            </div>
          </dl>
        </Modal>
      )}

      {selectedSecurityEvent && (
        <Modal
          open
          onClose={() => setSelectedSecurityEvent(null)}
          title="Detalle del evento de seguridad"
          description={selectedSecurityEvent.eventType}
          size="lg"
          footer={<Button onClick={() => setSelectedSecurityEvent(null)}>Cerrar</Button>}
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tipo de evento" value={selectedSecurityEvent.eventType} />
            <Field label="Severidad" value={<StatusPill status={severityToStatus[selectedSecurityEvent.severity] || 'DEFAULT'} />} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Descripción</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{selectedSecurityEvent.description}</dd>
            </div>
            <Field label="IP" value={selectedSecurityEvent.ipAddress || '—'} />
            <Field label="ID de correlación" value={selectedSecurityEvent.correlationId || '—'} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Agente de usuario</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{selectedSecurityEvent.userAgent || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Metadatos</dt>
              <dd className="mt-0.5">{renderMetadata(selectedSecurityEvent.metadata)}</dd>
            </div>
          </dl>
        </Modal>
      )}
    </>
  );
}

function Field({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children ?? value ?? '—'}</dd>
    </div>
  );
}
