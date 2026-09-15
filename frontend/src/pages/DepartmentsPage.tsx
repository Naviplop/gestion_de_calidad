import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Department, DepartmentListItem } from '../lib/auth/auth.service';
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

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listDepartments({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
      });
      setDepartments(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los departamentos');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadDepartments();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const parentDepartmentId = formData.get('parentDepartmentId') as string;

    try {
      await authApiClient.createDepartment({
        name,
        description: description || undefined,
        parentDepartmentId: parentDepartmentId || undefined,
      });
      setShowCreateModal(false);
      loadDepartments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el departamento');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const isActive = formData.get('isActive') === 'true';

    try {
      await authApiClient.updateDepartment(selectedDepartment.id, {
        name,
        description: description || undefined,
        isActive,
      });
      setSelectedDepartment(null);
      loadDepartments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar el departamento');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await authApiClient.deactivateDepartment(id);
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar el departamento');
    }
  };

  return (
    <>
      <PageHeader
        title="Departamentos"
        description="Estructura organizacional y jerarquía de departamentos."
        breadcrumbs={[{ label: 'Administración' }, { label: 'Departamentos' }]}
        actions={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nuevo departamento</Button>}
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Buscar por nombre..." leftIcon="search" />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando departamentos..." />
        ) : departments.length === 0 ? (
          <EmptyState
            icon="building"
            title="No hay departamentos registrados"
            description="Crea el primer departamento para organizar tu estructura organizacional."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear departamento</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(d) => d.id}
              columns={[
                { key: 'name', header: 'Nombre', render: (d) => <span className="text-sm font-medium text-slate-900">{d.name}</span> },
                { key: 'parent', header: 'Superior', render: (d) => d.parentDepartmentName || '—' },
                { key: 'status', header: 'Estado', width: '120px', render: (d) => <StatusPill status={d.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  key: 'actions', header: '', align: 'right', width: '180px',
                  render: (d) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => authApiClient.getDepartment(d.id).then((r) => setSelectedDepartment(r.data))} leftIcon="edit">Editar</Button>
                      {d.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(d.id)}>Desactivar</Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={departments}
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
          title="Crear departamento"
          description="Registra un nuevo departamento en la organización."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-dept-form">Crear departamento</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
           <form id="create-dept-form" onSubmit={handleCreate} className="space-y-4">
             <Input label="Nombre" name="name" required maxLength={150} placeholder="Ej. Control Documental" helperText="Nombre del departamento" />
             <div>
               <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
               <textarea name="description" maxLength={500} rows={3} placeholder="Describe el propósito y alcance del departamento" className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
             </div>
             <Select
               label="Departamento superior"
               name="parentDepartmentId"
               defaultValue=""
               placeholder="Sin departamento superior (raíz)"
               options={[
                 { value: '', label: 'Sin departamento superior' },
                 ...departments.map((d) => ({ value: d.id, label: d.name })),
               ]}
               helperText="Opcional. Selecciona el departamento padre si existe jerarquía."
             />
           </form>
        </Modal>
      )}

      {selectedDepartment && (
        <Modal
          open
          onClose={() => { setSelectedDepartment(null); setFormError(null); }}
          title="Editar departamento"
          description={selectedDepartment.name}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setSelectedDepartment(null); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="edit-dept-form">Guardar cambios</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="edit-dept-form" onSubmit={handleUpdate} className="space-y-4">
            <Input label="Nombre" name="name" required maxLength={150} defaultValue={selectedDepartment.name} helperText="Nombre del departamento" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" maxLength={500} rows={3} defaultValue={selectedDepartment.description || ''} placeholder="Describe el propósito y alcance del departamento" className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <Select
              label="Departamento superior"
              name="parentDepartmentId"
              defaultValue={selectedDepartment.parentDepartmentId || ''}
              placeholder="Sin departamento superior"
              options={[
                { value: '', label: 'Sin departamento superior' },
                ...departments.filter((d) => d.id !== selectedDepartment.id).map((d) => ({ value: d.id, label: d.name })),
              ]}
              helperText="Opcional. Selecciona el departamento padre si existe jerarquía."
            />
            <Select
              label="Estado"
              name="isActive"
              defaultValue={selectedDepartment.isActive ? 'true' : 'false'}
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
