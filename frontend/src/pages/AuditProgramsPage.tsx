import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { AuditProgram, AuditProgramListItem, AuditListItem } from '../lib/auth/auth.service';

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

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadPrograms();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadPrograms();
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
      setError(err instanceof Error ? err.message : 'Error al crear el programa de auditoría');
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
      setError(err instanceof Error ? err.message : 'Error al cargar el detalle del programa de auditoría');
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
      setError(err instanceof Error ? err.message : `Error al ${action} el programa de auditoría`);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Programas de Auditoría</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestione los programas de auditoría de su organización.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Crear Programa de Auditoría
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar programas de auditoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PLANNED">Planificado</option>
          <option value="IN_PROGRESS">En Progreso</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <button
          onClick={handleSearch}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-gray-500">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                 <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Período</th>
                 <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                 <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Responsable</th>
                 <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {programs.map((program) => (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <button
                      onClick={() => openDetail(program.id)}
                      className="hover:underline"
                    >
                      {program.name}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {program.periodStart} - {program.periodEnd}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(program.status)}`}>
                      {program.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {program.responsible ? `${program.responsible.firstName} ${program.responsible.lastName}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {program.status === 'PLANNED' && (
                        <button
                          onClick={() => handleLifecycleAction('start', program.id)}
                          disabled={actionLoading === 'start'}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Iniciar
                        </button>
                      )}
                      {program.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => handleLifecycleAction('complete', program.id)}
                            disabled={actionLoading === 'complete'}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => handleLifecycleAction('cancel', program.id)}
                            disabled={actionLoading === 'cancel'}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="text-lg font-semibold">Crear Programa de Auditoría</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Inicio del Período</label>
                  <input
                    type="date"
                    name="periodStart"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fin del Período</label>
                  <input
                    type="date"
                    name="periodEnd"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {formError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedProgram.name}</h2>
              <button
                onClick={() => setSelectedProgram(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setDetailTab('details')}
                className={`pb-2 text-sm font-medium ${detailTab === 'details' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Detalles
              </button>
              <button
                onClick={() => setDetailTab('audits')}
                className={`pb-2 text-sm font-medium ${detailTab === 'audits' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Auditorías
              </button>
            </div>
            <div className="mt-4">
              {detailTab === 'details' && (
                <div className="space-y-2 text-sm">
                  <p><strong>Descripción:</strong> {selectedProgram.description || '-'}</p>
                  <p><strong>Período:</strong> {selectedProgram.periodStart} - {selectedProgram.periodEnd}</p>
                  <p><strong>Estado:</strong> {selectedProgram.status}</p>
                </div>
              )}
              {detailTab === 'audits' && (
                <div className="space-y-2">
                  {audits.map((audit) => (
                    <div key={audit.id} className="rounded-md border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{audit.title}</div>
                      <div className="text-gray-500">{audit.code} - {audit.status}</div>
                    </div>
                  ))}
                  {audits.length === 0 && (
                    <div className="text-sm text-gray-500">No se encontraron auditorías.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
