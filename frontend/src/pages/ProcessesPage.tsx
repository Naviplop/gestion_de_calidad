import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Process, ProcessListItem } from '../lib/auth/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';

export function ProcessesPage() {
  const [processes, setProcesses] = useState<ProcessListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProcesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listProcesses({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
      });
      setProcesses(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los procesos');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search]);

  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadProcesses();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const processType = formData.get('processType') as string;

    try {
      await authApiClient.createProcess({
        code: '',
        name,
        description: description || undefined,
        processType: processType || undefined,
      });
      setShowCreateModal(false);
      loadProcesses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el proceso');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProcess) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const processType = formData.get('processType') as string;
    const isActive = formData.get('isActive') === 'true';

    try {
      await authApiClient.updateProcess(selectedProcess.id, {
        code,
        name,
        description: description || undefined,
        processType: processType || undefined,
        isActive,
      });
      setSelectedProcess(null);
      loadProcesses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar el proceso');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await authApiClient.deactivateProcess(id);
      loadProcesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar el proceso');
    }
  };

  return (
    <>
      <PageHeader
        title="Procesos"
        description="Catálogo de procesos del sistema de gestión de calidad."
        breadcrumbs={[{ label: 'Administración' }, { label: 'Procesos' }]}
        actions={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nuevo proceso</Button>}
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Buscar por nombre o código..." leftIcon="search" />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando procesos..." />
        ) : processes.length === 0 ? (
          <EmptyState
            icon="cog"
            title="No hay procesos registrados"
            description="Crea el primer proceso del sistema de gestión."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear proceso</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(p) => p.id}
              columns={[
                { key: 'code', header: 'Código', width: '120px', render: (p) => <span className="font-mono text-xs font-semibold text-slate-900">{p.code}</span> },
                { key: 'name', header: 'Nombre', render: (p) => <span className="text-sm font-medium text-slate-900">{p.name}</span> },
                { key: 'type', header: 'Tipo', render: (p) => p.processType || '—' },
                { key: 'status', header: 'Estado', width: '120px', render: (p) => <StatusPill status={p.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  key: 'actions', header: '', align: 'right', width: '180px',
                  render: (p) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => authApiClient.getProcess(p.id).then((r) => setSelectedProcess(r.data))} leftIcon="edit">Editar</Button>
                      {p.isActive && <Button variant="ghost" size="sm" onClick={() => handleDeactivate(p.id)}>Desactivar</Button>}
                    </div>
                  ),
                },
              ]}
              data={processes}
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
          title="Crear proceso"
          description="Registra un nuevo proceso del sistema de gestión."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-process-form">Crear proceso</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-process-form" onSubmit={handleCreate} className="space-y-4">
            <Input label="Tipo de proceso" name="processType" maxLength={50} />
            <Input label="Nombre" name="name" required maxLength={255} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" maxLength={1000} rows={3} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
          </form>
        </Modal>
      )}

      {selectedProcess && (
        <Modal
          open
          onClose={() => { setSelectedProcess(null); setFormError(null); }}
          title="Editar proceso"
          description={`${selectedProcess.code} · ${selectedProcess.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setSelectedProcess(null); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="edit-process-form">Guardar cambios</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="edit-process-form" onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Código" name="code" required maxLength={50} defaultValue={selectedProcess.code} />
              <Input label="Tipo de proceso" name="processType" maxLength={50} defaultValue={selectedProcess.processType || ''} />
            </div>
            <Input label="Nombre" name="name" required maxLength={255} defaultValue={selectedProcess.name} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" maxLength={1000} rows={3} defaultValue={selectedProcess.description || ''} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <Select
              label="Estado"
              name="isActive"
              defaultValue={selectedProcess.isActive ? 'true' : 'false'}
              options={[
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ]}
            />
          </form>
        </Modal>
      )}
    </>
  );
}
