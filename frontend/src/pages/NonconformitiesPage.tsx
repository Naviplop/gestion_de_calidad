import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Nonconformity, CorrectiveAction, RootCauseAnalysis } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

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
      setError(err instanceof Error ? err.message : 'Failed to load nonconformities');
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
    loadNonconformities();
  };

  const handleSeverityFilter = (value: string) => {
    setSeverityFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadNonconformities();
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
      setFormError(err instanceof Error ? err.message : 'Failed to create nonconformity');
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
      setError(err instanceof Error ? err.message : 'Failed to load corrective actions');
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
      setError(err instanceof Error ? err.message : 'Failed to load nonconformity detail');
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
      const message = err instanceof Error ? err.message : 'Failed to close nonconformity';
      setError(message);
      if (message.includes('RootCauseRequired') || message.includes('AllActionsMustBeVerified')) {
        showToast('Cannot close: ensure root cause exists and all actions are verified', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const severityColor = (severity: string) => {
    const colors: Record<string, string> = {
      MAJOR: 'bg-orange-100 text-orange-800',
      MINOR: 'bg-yellow-100 text-yellow-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      CLOSED: 'bg-green-100 text-green-800',
      VERIFICATION: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canClose = (nc: Nonconformity) => {
    if (nc.status === 'CLOSED') return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">No conformidades</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona no conformidades y acciones correctivas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Crear no conformidad
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
          placeholder="Buscar no conformidades..."
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
        <option value="OPEN">Abierta</option>
        <option value="VERIFICATION">Verificación</option>
        <option value="CLOSED">Cerrada</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => handleSeverityFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
        <option value="">Todas las severidades</option>
        <option value="MAJOR">Mayor</option>
        <option value="MINOR">Menor</option>
        <option value="CRITICAL">Crítica</option>
        </select>
        <button
          onClick={handleSearch}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-500">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Severidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {nonconformities.map((nc) => (
                <tr key={nc.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <button
                      onClick={() => openDetail(nc.id)}
                      className="hover:underline"
                    >
                      {nc.code}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {nc.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${severityColor(nc.severity)}`}>
                      {nc.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(nc.status)}`}>
                      {nc.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {canClose(nc) ? (
                      <button
                        onClick={() => handleClose(nc.id)}
                        disabled={actionLoading === 'close'}
                        className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        {actionLoading === 'close' ? 'Cerrando...' : 'Cerrar'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Cerrada</span>
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
            <h2 className="text-lg font-semibold">Crear no conformidad</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Severidad</label>
                  <select
                    name="severity"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Detected At</label>
                  <input
                    type="date"
                    name="detectedAt"
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

      {selectedNonconformity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedNonconformity.code} - {selectedNonconformity.title}</h2>
              <button
                onClick={() => setSelectedNonconformity(null)}
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
                onClick={() => setDetailTab('root-cause')}
                className={`pb-2 text-sm font-medium ${detailTab === 'root-cause' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Causa raíz
              </button>
              <button
                onClick={() => setDetailTab('actions')}
                className={`pb-2 text-sm font-medium ${detailTab === 'actions' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'}`}
              >
                Acciones correctivas
              </button>
            </div>
            <div className="mt-4">
              {detailTab === 'details' && (
                <div className="space-y-2 text-sm">
                  <p><strong>Code:</strong> {selectedNonconformity.code}</p>
                  <p><strong>Title:</strong> {selectedNonconformity.title}</p>
                  <p><strong>Description:</strong> {selectedNonconformity.description}</p>
                  <p><strong>Severidad:</strong> {selectedNonconformity.severity}</p>
                  <p><strong>Estado:</strong> {selectedNonconformity.status}</p>
                  <p><strong>Detected At:</strong> {selectedNonconformity.detectedAt ? new Date(selectedNonconformity.detectedAt).toLocaleDateString() : '-'}</p>
                </div>
              )}
              {detailTab === 'root-cause' && (
                <div className="space-y-2 text-sm">
                  {rootCause ? (
                    <>
                      <p><strong>Methodology:</strong> {rootCause.methodology}</p>
                      <p><strong>Conclusion:</strong> {rootCause.conclusion || '-'}</p>
                      <pre className="mt-2 rounded-md bg-gray-50 p-3 text-xs">
                        {JSON.stringify(rootCause.analysisData, null, 2)}
                      </pre>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No root cause analysis found.</div>
                  )}
                </div>
              )}
              {detailTab === 'actions' && (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div key={action.id} className="rounded-md border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{action.code} - {action.description}</div>
                      <div className="text-gray-500">{action.status} - Due: {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '-'}</div>
                    </div>
                  ))}
                  {actions.length === 0 && (
                    <div className="text-sm text-gray-500">No corrective actions found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              {canClose(selectedNonconformity) && (
                <button
                  onClick={() => handleClose()}
                  disabled={actionLoading === 'close'}
                  className="rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  {actionLoading === 'close' ? 'Cerrando...' : 'Cerrar no conformidad'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <ConfirmModal
          action={pendingAction.action}
          resourceCode={selectedNonconformity?.code || 'this nonconformity'}
          resourceType="nonconformity"
          onConfirm={handleConfirmedClose}
          onCancel={() => setPendingAction(null)}
          confirmButtonClassName="bg-green-600 hover:bg-green-500"
          messages={{
            close: {
              title: '¿Cerrar no conformidad?',
              message: `This will close "${selectedNonconformity?.code || 'this nonconformity'}". Ensure all root cause analyses are completed and corrective actions are verified.`,
              confirmText: 'Cerrar',
            },
          }}
        />
      )}
    </div>
  );
}
