import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { AuditProgram, AuditProgramListItem, AuditListItem, UserListItem } from '../lib/auth/auth.service';
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

type Tab = 'details' | 'audits';

export function AuditProgramsPage() {
  const [programs, setPrograms] = useState<AuditProgramListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<AuditProgram | null>(null);
  const [detailTab, setDetailTab] = useState<Tab>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; label: string }>>([]);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listAuditPrograms({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setPrograms(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los programas de auditoría');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, statusFilter]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await authApiClient.listUsers({ page: 1, pageSize: 100, isActive: true });
        setUsers(res.data.map((u: UserListItem) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` })));
      } catch {
        // ignore
      }
    };
    loadUsers();
  }, []);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadPrograms();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const periodStart = formData.get('periodStart') as string;
    const periodEnd = formData.get('periodEnd') as string;
    const responsibleId = formData.get('responsibleId') as string;

    try {
      await authApiClient.createAuditProgram({
        name,
        description: description || undefined,
        periodStart,
        periodEnd,
        responsibleId: responsibleId || undefined,
      });
      setShowCreateModal(false);
      loadPrograms();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el programa de auditoría');
    }
  };

  const loadAudits = async (programId: string) => {
    try {
      const response = await authApiClient.listAudits({
        page: 1,
        pageSize: 25,
        auditProgramId: programId,
      });
      setAudits(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las auditorías');
    }
  };

  const openDetail = async (programId: string) => {
    try {
      const response = await authApiClient.getAuditProgram(programId);
      setSelectedProgram(response.data);
      setDetailTab('details');
      loadAudits(programId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el detalle del programa');
    }
  };

  const handleLifecycleAction = async (action: string, programId: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'start':
          await authApiClient.updateAuditProgram(programId, { status: 'IN_PROGRESS' });
          break;
        case 'complete':
          await authApiClient.updateAuditProgram(programId, { status: 'COMPLETED' });
          break;
        case 'cancel':
          await authApiClient.updateAuditProgram(programId, { status: 'CANCELLED' });
          break;
        default:
          break;
      }
      if (selectedProgram && selectedProgram.id === programId) {
        const updated = await authApiClient.getAuditProgram(programId);
        setSelectedProgram(updated.data);
      }
      loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al ${action} el programa`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Programas de auditoría"
        description="Planifica y agrupa auditorías dentro de un programa anual o por proceso."
        breadcrumbs={[{ label: 'Principal', href: '/' }, { label: 'Programas' }]}
        actions={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nuevo programa</Button>}
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
              placeholder="Buscar por nombre..."
              leftIcon="search"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'PLANNED', label: 'Planificado' },
                { value: 'IN_PROGRESS', label: 'En progreso' },
                { value: 'COMPLETED', label: 'Completado' },
                { value: 'CANCELLED', label: 'Cancelado' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando programas..." />
        ) : programs.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No hay programas registrados"
            description="Crea el primer programa para agrupar las auditorías del período."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear programa</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(p) => p.id}
              columns={[
                {
                  key: 'name',
                  header: 'Nombre',
                  render: (p) => <span className="text-sm font-medium text-slate-900">{p.name}</span>,
                },
                {
                  key: 'period',
                  header: 'Período',
                  render: (p) => <span className="text-sm text-slate-600">{p.periodStart} — {p.periodEnd}</span>,
                },
                { key: 'status', header: 'Estado', width: '160px', render: (p) => <StatusPill status={p.status} /> },
                { key: 'responsible', header: 'Responsable', render: (p) => p.responsible ? `${p.responsible.firstName} ${p.responsible.lastName}` : '—' },
                {
                  key: 'actions', header: '', width: '80px', align: 'right',
                  render: (p) => <Button variant="ghost" size="sm" onClick={() => openDetail(p.id)} rightIcon="chevron-right">Ver</Button>,
                },
              ]}
              data={programs}
              onRowClick={(p) => openDetail(p.id)}
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
          open
          onClose={() => { setShowCreateModal(false); setFormError(null); }}
          title="Crear programa de auditoría"
          description="Define un nuevo programa para agrupar auditorías."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-program-form">Crear programa</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-program-form" onSubmit={handleCreate} className="space-y-4">
            <Input label="Nombre" name="name" required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                name="description"
                rows={3}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Inicio del período" name="periodStart" type="date" required />
              <Input label="Fin del período" name="periodEnd" type="date" required />
            </div>
            <Select
              label="Responsable"
              name="responsibleId"
              defaultValue=""
              placeholder="Selecciona una persona"
              options={[{ value: '', label: 'Selecciona una persona' }, ...users.map((u) => ({ value: u.id, label: u.label }))]}
              helperText="Persona que liderará el programa de auditoría"
            />
          </form>
        </Modal>
      )}

      {selectedProgram && (
        <Modal
          open
          onClose={() => setSelectedProgram(null)}
          title={selectedProgram.name}
          description={`${selectedProgram.periodStart} — ${selectedProgram.periodEnd}`}
          size="xl"
          footer={
            <div className="flex gap-2">
              {selectedProgram.status === 'PLANNED' && (
                <Button onClick={() => handleLifecycleAction('start', selectedProgram.id)} loading={actionLoading === 'start'}>Iniciar</Button>
              )}
              {selectedProgram.status === 'IN_PROGRESS' && (
                <>
                  <Button variant="secondary" onClick={() => handleLifecycleAction('complete', selectedProgram.id)} loading={actionLoading === 'complete'}>Completar</Button>
                  <Button variant="danger" onClick={() => handleLifecycleAction('cancel', selectedProgram.id)} loading={actionLoading === 'cancel'}>Cancelar</Button>
                </>
              )}
            </div>
          }
        >
          <div className="-mx-1 mb-4">
            <Tabs
              tabs={[
                { id: 'details', label: 'Detalles' },
                { id: 'audits', label: 'Auditorías' },
              ]}
              activeTab={detailTab}
              onChange={(t) => setDetailTab(t as Tab)}
            />
          </div>

          {detailTab === 'details' && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Estado" value={<StatusPill status={selectedProgram.status} />} />
              <Field label="Responsable" value={selectedProgram.responsible ? `${selectedProgram.responsible.firstName} ${selectedProgram.responsible.lastName}` : '—'} />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Descripción</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{selectedProgram.description || '—'}</dd>
              </div>
            </dl>
          )}

          {detailTab === 'audits' && (
            audits.length === 0 ? (
              <p className="text-sm text-slate-500">No hay auditorías asociadas a este programa.</p>
            ) : (
              <Table
                rowKey={(a) => a.id}
                columns={[
                  { key: 'code', header: 'Código', render: (a) => <span className="font-mono text-xs">{a.code}</span> },
                  { key: 'title', header: 'Título', render: (a) => <span className="text-sm text-slate-900">{a.title}</span> },
                  { key: 'status', header: 'Estado', render: (a) => <StatusPill status={a.status} /> },
                ]}
                data={audits}
              />
            )
          )}
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
