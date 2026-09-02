import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Audit, AuditListItem, AuditChecklist, AuditFinding } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

type Tab = 'details' | 'checklists' | 'findings';

type AuditStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const AUDIT_LIFECYCLE_ACTIONS: Record<AuditStatus, string[]> = {
  PLANNED: ['start', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  COMPLETED: [],
  CANCELLED: [],
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
    loadAudits();
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
          await authApiClient.cancelAudit(auditId, 'Cancelled by user');
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

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const availableActions = (status: string) => AUDIT_LIFECYCLE_ACTIONS[status as AuditStatus] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Auditorías</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las auditorías de tu organización.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Crear auditoría
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
          placeholder="Buscar auditorías..."
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
        <option value="PLANNED">Planificada</option>
        <option value="IN_PROGRESS">En progreso</option>
        <option value="COMPLETED">Completada</option>
        <option value="CANCELLED">Cancelada</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Planned</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <button
                      onClick={() => openDetail(audit.id)}
                      className="hover:underline"
                    >
                      {audit.code}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {audit.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(audit.status)}`}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {audit.plannedStart ? new Date(audit.plannedStart).toLocaleDateString() : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {availableActions(audit.status).length > 0 && (
                      <div className="flex gap-2">
                        {availableActions(audit.status).map((action) => {
                          const isDestructive = action === 'cancel';
                          const label = action.charAt(0).toUpperCase() + action.slice(1);
                          return (
                            <button
                              key={action}
                              onClick={() => handleLifecycleAction(action, audit.id)}
                              disabled={actionLoading === action}
                              className={`${
                                isDestructive
                                  ? 'text-red-600 hover:text-red-800'
                                  : action === 'start'
                                  ? 'text-blue-600 hover:text-blue-800'
                                  : 'text-green-600 hover:text-green-800'
                              } disabled:opacity-50`}
                            >
                              {actionLoading === action ? 'Processing...' : label}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
            <h2 className="text-lg font-semibold">Crear auditoría</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input
                  type="text"
                  name="code"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Inicio planificado</label>
                  <input
                    type="datetime-local"
                    name="plannedStart"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Planned End</label>
                  <input
                    type="datetime-local"
                    name="plannedEnd"
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

      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedAudit.title} ({selectedAudit.code})</h2>
              <button
                onClick={() => setSelectedAudit(null)}
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
                onClick={() => setDetailTab('checklists')}
                className={`pb-2 text-sm font-medium ${detailTab === 'checklists' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Listas de verificación
              </button>
              <button
                onClick={() => setDetailTab('findings')}
                className={`pb-2 text-sm font-medium ${detailTab === 'findings' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Hallazgos
              </button>
            </div>
            <div className="mt-4">
              {detailTab === 'details' && (
                <div className="space-y-2 text-sm">
                  <p><strong>Code:</strong> {selectedAudit.code}</p>
                  <p><strong>Title:</strong> {selectedAudit.title}</p>
                  <p><strong>Status:</strong> {selectedAudit.status}</p>
                  <p><strong>Scope:</strong> {selectedAudit.scope || '-'}</p>
                  <p><strong>Objective:</strong> {selectedAudit.objective || '-'}</p>
                </div>
              )}
              {detailTab === 'checklists' && (
                <div className="space-y-2">
                  {checklists.map((checklist) => (
                    <div key={checklist.id} className="rounded-md border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{checklist.name}</div>
                      <div className="text-gray-500">{checklist.items?.length || 0} items</div>
                    </div>
                  ))}
                  {checklists.length === 0 && (
                    <div className="text-sm text-gray-500">No checklists found.</div>
                  )}
                </div>
              )}
              {detailTab === 'findings' && (
                <div className="space-y-2">
                  {findings.map((finding) => (
                    <div key={finding.id} className="rounded-md border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{finding.title}</div>
                      <div className="text-gray-500">{finding.findingType} - {finding.severity} - {finding.status}</div>
                    </div>
                  ))}
                  {findings.length === 0 && (
                    <div className="text-sm text-gray-500">No findings found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              {availableActions(selectedAudit.status).map((action) => {
                const isDestructive = action === 'cancel';
                const label = action.charAt(0).toUpperCase() + action.slice(1);
                return (
                  <button
                    key={action}
                    onClick={() => {
                      if (isDestructive) {
                        setPendingAction({ action, auditId: selectedAudit.id });
                      } else {
                        handleLifecycleAction(action, selectedAudit.id);
                      }
                    }}
                    disabled={actionLoading === action}
                    className={`rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                      isDestructive
                        ? 'border-red-300 bg-white text-red-700 hover:bg-red-50'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {actionLoading === action ? 'Processing...' : label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <ConfirmModal
          action={pendingAction.action}
          resourceCode={selectedAudit?.code || 'this audit'}
          resourceType="audit"
          onConfirm={handleConfirmedAction}
          onCancel={() => setPendingAction(null)}
          messages={{
            cancel: {
              title: `Cancel audit?`,
              message: `This will cancel "${selectedAudit?.code || 'this audit'}". This action may affect related workflows.`,
              confirmText: 'Cancel',
            },
            obsolete: {
              title: 'Mark as obsolete?',
              message: `This will mark "${selectedAudit?.code || 'this audit'}" as obsolete. This action may affect active distributions.`,
              confirmText: 'Obsolete',
            },
          }}
        />
      )}
    </div>
  );
}
