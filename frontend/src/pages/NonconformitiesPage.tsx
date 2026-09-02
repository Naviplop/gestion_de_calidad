import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Nonconformity, CorrectiveAction, RootCauseAnalysis } from '../lib/auth/auth.service';
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

type Tab = 'details' | 'root-cause' | 'actions';

export function NonconformitiesPage() {
  const [nonconformities, setNonconformities] = useState<Nonconformity[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNonconformity, setSelectedNonconformity] = useState<Nonconformity | null>(null);
  const [detailTab, setDetailTab] = useState<Tab>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [actionsMeta, setActionsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; ncId: string } | null>(null);
  const { showToast } = useToast();

  const loadNonconformities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listNonconformities({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setNonconformities(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las no conformidades');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, statusFilter, severityFilter]);

  useEffect(() => {
    loadNonconformities();
  }, [loadNonconformities]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadNonconformities();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleSeverityFilter = (value: string) => {
    setSeverityFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const severity = formData.get('severity') as string;
    const detectedAt = formData.get('detectedAt') as string;
    const responsibleId = formData.get('responsibleId') as string;

    try {
      await authApiClient.createNonconformity({
        code,
        title,
        description,
        severity,
        detectedAt,
        responsibleId: responsibleId || undefined,
      });
      setShowCreateModal(false);
      showToast('No conformidad creada exitosamente', 'success');
      loadNonconformities();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la no conformidad');
    }
  };

  const loadActions = async (nonconformityId: string) => {
    try {
      const response = await authApiClient.listCorrectiveActions(nonconformityId, {
        page: actionsMeta.page,
        pageSize: actionsMeta.pageSize,
      });
      setActions(response.data);
      setActionsMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las acciones correctivas');
    }
  };

  const loadRootCause = async (nonconformityId: string) => {
    try {
      const response = await authApiClient.getRootCauseAnalysis(nonconformityId);
      setRootCause(response.data);
    } catch {
      setRootCause(null);
    }
  };

  const openDetail = async (nonconformityId: string) => {
    try {
      const response = await authApiClient.getNonconformity(nonconformityId);
      setSelectedNonconformity(response.data);
      setDetailTab('details');
      await loadRootCause(nonconformityId);
      await loadActions(nonconformityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la no conformidad');
    }
  };

  const handleClose = (ncId?: string) => {
    const id = ncId ?? selectedNonconformity?.id;
    if (!id) return;
    setPendingAction({ action: 'close', ncId: id });
  };

  const handleConfirmedClose = async () => {
    if (!pendingAction) return;
    const { ncId } = pendingAction;
    setPendingAction(null);
    setActionLoading('close');
    try {
      await authApiClient.closeNonconformity(ncId);
      showToast('No conformidad cerrada exitosamente', 'success');
      if (selectedNonconformity && selectedNonconformity.id === ncId) {
        const updated = await authApiClient.getNonconformity(ncId);
        setSelectedNonconformity(updated.data);
      }
      loadNonconformities();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar la no conformidad';
      setError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const canClose = (nc: Nonconformity) => nc.status !== 'CLOSED';

  return (
    <>
      <PageHeader
        title="No conformidades"
        description="Gestiona no conformidades, análisis de causa raíz y acciones correctivas."
        breadcrumbs={[{ label: 'Principal', href: '/' }, { label: 'No conformidades' }]}
        actions={
          <Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nueva no conformidad</Button>
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
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'OPEN', label: 'Abierta' },
                { value: 'VERIFICATION', label: 'En verificación' },
                { value: 'CLOSED', label: 'Cerrada' },
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={severityFilter}
              onChange={(e) => handleSeverityFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas las severidades' },
                { value: 'MAJOR', label: 'Mayor' },
                { value: 'MINOR', label: 'Menor' },
                { value: 'CRITICAL', label: 'Crítica' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando no conformidades..." />
        ) : nonconformities.length === 0 ? (
          <EmptyState
            icon="warning"
            title="No hay no conformidades registradas"
            description="Registra la primera no conformidad para iniciar el ciclo de análisis y acciones correctivas."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear no conformidad</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(nc) => nc.id}
              columns={[
                { key: 'code', header: 'Código', width: '140px', render: (nc) => <span className="font-mono text-sm font-semibold text-slate-900">{nc.code}</span> },
                {
                  key: 'title',
                  header: 'Título',
                  render: (nc) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{nc.title}</p>
                      <p className="truncate text-xs text-slate-500">{nc.description}</p>
                    </div>
                  ),
                },
                { key: 'severity', header: 'Severidad', width: '120px', render: (nc) => <StatusPill status={nc.severity} /> },
                { key: 'status', header: 'Estado', width: '160px', render: (nc) => <StatusPill status={nc.status} /> },
                {
                  key: 'actions',
                  header: '',
                  width: '120px',
                  align: 'right',
                  render: (nc) =>
                    canClose(nc) ? (
                      <Button variant="secondary" size="sm" onClick={() => handleClose(nc.id)} loading={actionLoading === 'close'}>
                        Cerrar
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Cerrada</span>
                    ),
                },
              ]}
              data={nonconformities}
              onRowClick={(nc) => openDetail(nc.id)}
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
          title="Crear no conformidad"
          description="Registra una nueva no conformidad en el sistema."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-nc-form">Crear no conformidad</Button>
            </>
          }
        >
          {formError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <form id="create-nc-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Código" name="code" required />
              <Input label="Fecha de detección" name="detectedAt" type="date" required />
            </div>
            <Input label="Título" name="title" required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                name="description"
                rows={3}
                required
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Severidad"
                name="severity"
                required
                defaultValue="MINOR"
                options={[
                  { value: 'MINOR', label: 'Menor' },
                  { value: 'MAJOR', label: 'Mayor' },
                  { value: 'CRITICAL', label: 'Crítica' },
                ]}
              />
              <Input label="ID responsable" name="responsibleId" />
            </div>
          </form>
        </Modal>
      )}

      {selectedNonconformity && (
        <Modal
          open={!!selectedNonconformity}
          onClose={() => setSelectedNonconformity(null)}
          title={selectedNonconformity.title}
          description={`${selectedNonconformity.code} · ${selectedNonconformity.status}`}
          size="xl"
          footer={
            canClose(selectedNonconformity) ? (
              <Button onClick={() => handleClose()} loading={actionLoading === 'close'}>
                Cerrar no conformidad
              </Button>
            ) : null
          }
        >
          <div className="-mx-1 mb-4">
            <Tabs
              tabs={[
                { id: 'details', label: 'Detalles' },
                { id: 'root-cause', label: 'Causa raíz' },
                { id: 'actions', label: 'Acciones correctivas' },
              ]}
              activeTab={detailTab}
              onChange={(t) => setDetailTab(t as Tab)}
            />
          </div>

          {detailTab === 'details' && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Código" value={<span className="font-mono">{selectedNonconformity.code}</span>} />
              <Field label="Estado" value={<StatusPill status={selectedNonconformity.status} />} />
              <Field label="Severidad" value={<StatusPill status={selectedNonconformity.severity} />} />
              <Field label="Fecha de detección" value={selectedNonconformity.detectedAt ? new Date(selectedNonconformity.detectedAt).toLocaleDateString('es-ES') : '—'} />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Descripción</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{selectedNonconformity.description}</dd>
              </div>
            </dl>
          )}

          {detailTab === 'root-cause' && (
            rootCause ? (
              <div className="space-y-3 text-sm">
                <Field label="Metodología" value={rootCause.methodology} />
                <Field label="Conclusión" value={rootCause.conclusion || '—'} />
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">Datos del análisis</p>
                  <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(rootCause.analysisData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hay análisis de causa raíz registrado.</p>
            )
          )}

          {detailTab === 'actions' && (
            actions.length === 0 ? (
              <p className="text-sm text-slate-500">No hay acciones correctivas registradas.</p>
            ) : (
              <Table
                rowKey={(a) => a.id}
                columns={[
                  { key: 'code', header: 'Código', render: (a) => <span className="font-mono text-xs">{a.code}</span> },
                  { key: 'desc', header: 'Descripción', render: (a) => a.description },
                  { key: 'status', header: 'Estado', render: (a) => <StatusPill status={a.status} /> },
                  { key: 'due', header: 'Vencimiento', render: (a) => a.dueDate ? new Date(a.dueDate).toLocaleDateString('es-ES') : '—' },
                ]}
                data={actions}
              />
            )
          )}
        </Modal>
      )}

      {pendingAction && (
        <ConfirmModal
          action="close"
          resourceCode={selectedNonconformity?.code || 'esta no conformidad'}
          resourceType="no conformidad"
          onConfirm={handleConfirmedClose}
          onCancel={() => setPendingAction(null)}
          variant="primary"
          messages={{
            close: {
              title: '¿Cerrar no conformidad?',
              message: 'Asegúrate de que el análisis de causa raíz esté completo y las acciones correctivas estén verificadas.',
              confirmText: 'Cerrar no conformidad',
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
