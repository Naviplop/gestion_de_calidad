import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Audit, AuditListItem, AuditChecklist, AuditFinding } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';

type Tab = 'details' | 'checklists' | 'findings';

type AuditStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const AUDIT_LIFECYCLE_ACTIONS: Record<AuditStatus, string[]> = {
  PLANNED: ['start', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  COMPLETED: [],
  CANCELLED: [],
};

const AUDIT_STATUS_PILL: Record<AuditStatus, 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'> = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const ACTION_LABELS: Record<string, string> = {
  start: 'Iniciar',
  complete: 'Completar',
  cancel: 'Cancelar',
};

export function AuditsPage() {
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [detailTab, setDetailTab] = useState<Tab>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<AuditChecklist[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [findingsMeta, setFindingsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; auditId: string } | null>(null);
  const { showToast } = useToast();

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listAudits({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setAudits(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las auditorías');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, statusFilter]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadAudits();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const auditProgramId = formData.get('auditProgramId') as string;
    const processId = formData.get('processId') as string;
    const leadAuditorId = formData.get('leadAuditorId') as string;
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;
    const auditType = formData.get('auditType') as string;
    const plannedStart = formData.get('plannedStart') as string;
    const plannedEnd = formData.get('plannedEnd') as string;
    const scope = formData.get('scope') as string;
    const objective = formData.get('objective') as string;

    try {
      await authApiClient.createAudit({
        auditProgramId: auditProgramId || undefined,
        processId: processId || undefined,
        leadAuditorId: leadAuditorId || undefined,
        code,
        title,
        auditType: auditType || undefined,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
        scope: scope || undefined,
        objective: objective || undefined,
      });
      setShowCreateModal(false);
      showToast('Auditoría creada exitosamente', 'success');
      loadAudits();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la auditoría');
    }
  };

  const loadChecklists = async (auditId: string) => {
    try {
      const response = await authApiClient.listChecklists(auditId);
      setChecklists(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las listas de verificación');
    }
  };

  const loadFindings = async (auditId: string) => {
    try {
      const response = await authApiClient.listFindings(auditId, {
        page: findingsMeta.page,
        pageSize: findingsMeta.pageSize,
      });
      setFindings(response.data);
      setFindingsMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los hallazgos');
    }
  };

  const openDetail = async (auditId: string) => {
    try {
      const response = await authApiClient.getAudit(auditId);
      setSelectedAudit(response.data);
      setDetailTab('details');
      await loadChecklists(auditId);
      await loadFindings(auditId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el detalle de la auditoría');
    }
  };

  const handleLifecycleAction = async (action: string, auditId: string) => {
    setActionLoading(action);
    setPendingAction({ action, auditId });
  };

  const handleConfirmedAction = async () => {
    if (!pendingAction) return;
    const { action, auditId } = pendingAction;
    setPendingAction(null);
    setActionLoading(action);
    try {
      switch (action) {
        case 'start':
          await authApiClient.startAudit(auditId, new Date().toISOString());
          showToast('Auditoría iniciada', 'success');
          break;
        case 'complete':
          await authApiClient.completeAudit(auditId, new Date().toISOString());
          showToast('Auditoría completada', 'success');
          break;
        case 'cancel':
          await authApiClient.cancelAudit(auditId, 'Cancelada por el usuario');
          showToast('Auditoría cancelada', 'warning');
          break;
        default:
          break;
      }
      if (selectedAudit && selectedAudit.id === auditId) {
        const updated = await authApiClient.getAudit(auditId);
        setSelectedAudit(updated.data);
      }
      loadAudits();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Error al ${action} la auditoría`;
      setError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const availableActions = (status: string) => AUDIT_LIFECYCLE_ACTIONS[status as AuditStatus] || [];

  return (
    <>
      <PageHeader
        title="Auditorías"
        description="Planifica, ejecuta y haz seguimiento a las auditorías del sistema de gestión."
        breadcrumbs={[{ label: 'Principal', href: '/' }, { label: 'Auditorías' }]}
        actions={
          <Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nueva auditoría</Button>
        }
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por código o título..."
              leftIcon="search"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'PLANNED', label: 'Planificada' },
                { value: 'IN_PROGRESS', label: 'En progreso' },
                { value: 'COMPLETED', label: 'Completada' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando auditorías..." />
        ) : audits.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No hay auditorías registradas"
            description="Crea la primera auditoría para comenzar a gestionar el programa de auditorías."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear auditoría</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(a) => a.id}
              columns={[
                { key: 'code', header: 'Código', width: '140px', render: (a) => <span className="font-mono text-sm font-semibold text-slate-900">{a.code}</span> },
                {
                  key: 'title',
                  header: 'Título',
                  render: (a) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                      <p className="truncate text-xs text-slate-500">{a.auditType || '—'}</p>
                    </div>
                  ),
                },
                { key: 'status', header: 'Estado', width: '160px', render: (a) => <StatusPill status={AUDIT_STATUS_PILL[a.status as AuditStatus] || a.status} /> },
                { key: 'planned', header: 'Inicio planificado', width: '160px', render: (a) => a.plannedStart ? new Date(a.plannedStart).toLocaleDateString('es-ES') : '—' },
                {
                  key: 'actions',
                  header: '',
                  width: '80px',
                  align: 'right',
                  render: (a) => (
                    <Button variant="ghost" size="sm" onClick={() => openDetail(a.id)} rightIcon="chevron-right">
                      Ver
                    </Button>
                  ),
                },
              ]}
              data={audits}
              onRowClick={(a) => openDetail(a.id)}
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

      {showCreateModal && (
        <Modal
          open={showCreateModal}
          onClose={() => { setShowCreateModal(false); setFormError(null); }}
          title="Crear auditoría"
          description="Registra una nueva auditoría en el sistema."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-audit-form">Crear auditoría</Button>
            </>
          }
        >
          {formError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <form id="create-audit-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Código" name="code" required />
              <Input label="Tipo de auditoría" name="auditType" placeholder="Interna, externa..." />
            </div>
            <Input label="Título" name="title" required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Inicio planificado" name="plannedStart" type="datetime-local" />
              <Input label="Fin planificado" name="plannedEnd" type="datetime-local" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Alcance</label>
              <textarea
                name="scope"
                rows={2}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Objetivo</label>
              <textarea
                name="objective"
                rows={2}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </form>
        </Modal>
      )}

      {selectedAudit && (
        <Modal
          open={!!selectedAudit}
          onClose={() => setSelectedAudit(null)}
          title={selectedAudit.title}
          description={`${selectedAudit.code} · ${selectedAudit.status}`}
          size="xl"
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {availableActions(selectedAudit.status).map((action) => {
                const isDestructive = action === 'cancel';
                const label = ACTION_LABELS[action] || action;
                return (
                  <Button
                    key={action}
                    variant={isDestructive ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      if (isDestructive) {
                        setPendingAction({ action, auditId: selectedAudit.id });
                      } else {
                        handleLifecycleAction(action, selectedAudit.id);
                      }
                    }}
                    disabled={actionLoading === action}
                  >
                    {actionLoading === action ? 'Procesando...' : label}
                  </Button>
                );
              })}
            </div>
          }
        >
          <div className="-mx-1 mb-4">
            <Tabs
              tabs={[
                { id: 'details', label: 'Detalles' },
                { id: 'checklists', label: 'Listas de verificación' },
                { id: 'findings', label: 'Hallazgos' },
              ]}
              activeTab={detailTab}
              onChange={(t) => setDetailTab(t as Tab)}
            />
          </div>

          {detailTab === 'details' && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Código" value={<span className="font-mono">{selectedAudit.code}</span>} />
              <Field label="Estado" value={selectedAudit.status} />
              <Field label="Alcance" value={selectedAudit.scope || '—'} />
              <Field label="Objetivo" value={selectedAudit.objective || '—'} />
            </dl>
          )}

          {detailTab === 'checklists' && (
            checklists.length === 0 ? (
              <p className="text-sm text-slate-500">No hay listas de verificación.</p>
            ) : (
              <Table
                rowKey={(c) => c.id}
                columns={[
                  { key: 'name', header: 'Nombre', render: (c) => <span className="text-sm font-medium text-slate-900">{c.name}</span> },
                  { key: 'items', header: 'Ítems', render: (c) => c.items?.length || 0 },
                ]}
                data={checklists}
              />
            )
          )}

          {detailTab === 'findings' && (
            findings.length === 0 ? (
              <p className="text-sm text-slate-500">No hay hallazgos registrados.</p>
            ) : (
              <Table
                rowKey={(f) => f.id}
                columns={[
                  { key: 'title', header: 'Título', render: (f) => <span className="text-sm font-medium text-slate-900">{f.title}</span> },
                  { key: 'type', header: 'Tipo', render: (f) => f.findingType },
                  { key: 'severity', header: 'Severidad', render: (f) => f.severity },
                  { key: 'status', header: 'Estado', render: (f) => f.status },
                ]}
                data={findings}
              />
            )
          )}
        </Modal>
      )}

      {pendingAction && (
        <ConfirmModal
          action={pendingAction.action}
          resourceCode={selectedAudit?.code || 'esta auditoría'}
          resourceType="auditoría"
          onConfirm={handleConfirmedAction}
          onCancel={() => setPendingAction(null)}
          variant={pendingAction.action === 'cancel' ? 'danger' : 'primary'}
          messages={{
            cancel: {
              title: '¿Cancelar auditoría?',
              message: 'Esto cancelará la auditoría. Esta acción puede afectar los hallazgos y listas de verificación asociados.',
              confirmText: 'Cancelar auditoría',
            },
            complete: {
              title: '¿Completar auditoría?',
              message: 'Esto marcará la auditoría como completada.',
              confirmText: 'Completar',
            },
            start: {
              title: '¿Iniciar auditoría?',
              message: 'Esto cambiará el estado de la auditoría a en progreso.',
              confirmText: 'Iniciar',
            },
          }}
        />
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
