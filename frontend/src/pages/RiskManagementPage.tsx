import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Risk, RiskListItem, RiskAssessment, RiskControl, RiskTreatment } from '../lib/auth/auth.service';

type Tab = 'details' | 'assessments' | 'controls' | 'treatments';

const STATUS_OPTIONS = ['IDENTIFIED', 'ASSESSED', 'TREATMENT_PLANNED', 'UNDER_CONTROL', 'CLOSED'];
const RISK_TYPE_OPTIONS = ['INTERNAL', 'EXTERNAL', 'COMPLIANCE', 'OPERATIONAL', 'STRATEGIC', 'FINANCIAL', 'TECHNICAL', 'OTHER'];
const PROBABILITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const IMPACT_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CONTROL_TYPE_OPTIONS = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING', 'OTHER'];
const TREATMENT_STRATEGY_OPTIONS = ['AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT', 'EXPLOIT', 'ENHANCE', 'SHARE'];
const TREATMENT_STATUS_OPTIONS = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function RiskManagementPage() {
  const [risks, setRisks] = useState<RiskListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskTypeFilter, setRiskTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [detailTab, setDetailTab] = useState<Tab>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [assessmentsMeta, setAssessmentsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [controls, setControls] = useState<RiskControl[]>([]);
  const [controlsMeta, setControlsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [treatments, setTreatments] = useState<RiskTreatment[]>([]);
  const [treatmentsMeta, setTreatmentsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showEditTreatmentModal, setShowEditTreatmentModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<RiskTreatment | null>(null);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listRisks({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        riskType: riskTypeFilter || undefined,
      });
      setRisks(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risks');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, statusFilter, riskTypeFilter]);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  const loadDetail = useCallback(async (risk: Risk) => {
    setSelectedRisk(risk);
    setDetailTab('details');
    setAssessments([]);
    setControls([]);
    setTreatments([]);
    setAssessmentsMeta({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
    setControlsMeta({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
    setTreatmentsMeta({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  }, []);

  useEffect(() => {
    if (!selectedRisk) return;
    if (detailTab === 'assessments') {
      authApiClient.listRiskAssessments(selectedRisk.id, { page: assessmentsMeta.page, pageSize: assessmentsMeta.pageSize })
        .then((response) => {
          setAssessments(response.data);
          setAssessmentsMeta(response.meta);
        })
        .catch(() => {});
    } else if (detailTab === 'controls') {
      authApiClient.listRiskControls(selectedRisk.id, { page: controlsMeta.page, pageSize: controlsMeta.pageSize })
        .then((response) => {
          setControls(response.data);
          setControlsMeta(response.meta);
        })
        .catch(() => {});
    } else if (detailTab === 'treatments') {
      authApiClient.listRiskTreatments(selectedRisk.id, { page: treatmentsMeta.page, pageSize: treatmentsMeta.pageSize })
        .then((response) => {
          setTreatments(response.data);
          setTreatmentsMeta(response.meta);
        })
        .catch(() => {});
    }
  }, [selectedRisk, detailTab, assessmentsMeta.page, assessmentsMeta.pageSize, controlsMeta.page, controlsMeta.pageSize, treatmentsMeta.page, treatmentsMeta.pageSize]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const riskType = formData.get('riskType') as string;
    const processId = formData.get('processId') as string;
    const ownerId = formData.get('ownerId') as string;

    try {
      await authApiClient.createRisk({
        code,
        title,
        description,
        riskType,
        processId: processId || undefined,
        ownerId: ownerId || undefined,
      });
      setShowCreateModal(false);
      loadRisks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create risk');
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRisk) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const probability = formData.get('probability') as string;
    const impact = formData.get('impact') as string;

    try {
      await authApiClient.createRiskAssessment(selectedRisk.id, { probability, impact });
      setShowAssessmentModal(false);
      authApiClient.listRiskAssessments(selectedRisk.id, { page: assessmentsMeta.page, pageSize: assessmentsMeta.pageSize })
        .then((response) => {
          setAssessments(response.data);
          setAssessmentsMeta(response.meta);
        });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create assessment');
    }
  };

  const handleCreateControl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRisk) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;
    const controlType = formData.get('controlType') as string;
    const effectiveness = formData.get('effectiveness') as string;

    try {
      await authApiClient.createRiskControl(selectedRisk.id, { description, controlType, effectiveness: effectiveness || undefined });
      setShowControlModal(false);
      authApiClient.listRiskControls(selectedRisk.id, { page: controlsMeta.page, pageSize: controlsMeta.pageSize })
        .then((response) => {
          setControls(response.data);
          setControlsMeta(response.meta);
        });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create control');
    }
  };

  const handleCreateTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRisk) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const strategy = formData.get('strategy') as string;
    const description = formData.get('description') as string;
    const responsibleId = formData.get('responsibleId') as string;
    const dueDate = formData.get('dueDate') as string;

    try {
      await authApiClient.createRiskTreatment(selectedRisk.id, {
        strategy,
        description,
        responsibleId: responsibleId || undefined,
        dueDate: dueDate || undefined,
      });
      setShowTreatmentModal(false);
      authApiClient.listRiskTreatments(selectedRisk.id, { page: treatmentsMeta.page, pageSize: treatmentsMeta.pageSize })
        .then((response) => {
          setTreatments(response.data);
          setTreatmentsMeta(response.meta);
        });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create treatment');
    }
  };

  const handleUpdateTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTreatment) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const strategy = formData.get('strategy') as string;
    const description = formData.get('description') as string;
    const responsibleId = formData.get('responsibleId') as string;
    const dueDate = formData.get('dueDate') as string;
    const status = formData.get('status') as string;
    const completedAt = formData.get('completedAt') as string;

    try {
      await authApiClient.updateRiskTreatment(editingTreatment.id, {
        strategy,
        description,
        responsibleId: responsibleId || undefined,
        dueDate: dueDate || undefined,
        status,
        completedAt: completedAt || undefined,
      });
      setShowEditTreatmentModal(false);
      setEditingTreatment(null);
      authApiClient.listRiskTreatments(selectedRisk!.id, { page: treatmentsMeta.page, pageSize: treatmentsMeta.pageSize })
        .then((response) => {
          setTreatments(response.data);
          setTreatmentsMeta(response.meta);
        });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update treatment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDENTIFIED': return 'bg-gray-100 text-gray-800';
      case 'ASSESSED': return 'bg-blue-100 text-blue-800';
      case 'TREATMENT_PLANNED': return 'bg-yellow-100 text-yellow-800';
      case 'UNDER_CONTROL': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: string | null) => {
    if (!score) return 'text-gray-600';
    const value = parseInt(score, 10);
    if (value >= 12) return 'text-red-600 font-bold';
    if (value >= 6) return 'text-yellow-600 font-bold';
    return 'text-green-600 font-bold';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Gestión de riesgos</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Nuevo riesgo
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Buscar riesgos..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={riskTypeFilter}
          onChange={(e) => { setRiskTypeFilter(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {RISK_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-500">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {risks.map((risk) => (
              <tr key={risk.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{risk.code}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{risk.title}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{risk.riskType}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(risk.status)}`}>
                    {risk.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{risk.owner?.firstName} {risk.owner?.lastName}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => loadDetail(risk as unknown as Risk)}
                    className="text-gray-900 underline hover:text-gray-700"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {selectedRisk && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{selectedRisk.title}</h2>
            <button onClick={() => setSelectedRisk(null)} className="text-sm text-slate-500 hover:text-slate-700">Cerrar</button>
          </div>
          <div className="mt-4 flex gap-2 border-b border-gray-200">
            {(['details', 'assessments', 'controls', 'treatments'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-4 py-2 text-sm font-medium ${
                  detailTab === tab ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {detailTab === 'details' && (
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">Code:</span> {selectedRisk.code}</p>
              <p><span className="font-medium">Description:</span> {selectedRisk.description}</p>
              <p><span className="font-medium">Tipo:</span> {selectedRisk.riskType}</p>
              <p><span className="font-medium">Estado:</span> {selectedRisk.status}</p>
              <p><span className="font-medium">Created:</span> {new Date(selectedRisk.createdAt).toLocaleString()}</p>
            </div>
          )}

          {detailTab === 'assessments' && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Assessments</h3>
                <button onClick={() => setShowAssessmentModal(true)} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">New Assessment</button>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Probability</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Impact</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Score</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Assessed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {assessments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.probability}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{a.impact}</td>
                        <td className={`px-4 py-2 text-sm ${getScoreColor(a.score)}`}>{a.score}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{new Date(a.assessedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detailTab === 'controls' && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Controls</h3>
                <button onClick={() => setShowControlModal(true)} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">New Control</button>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Effectiveness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {controls.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">{c.controlType}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{c.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{c.effectiveness || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detailTab === 'treatments' && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Treatments</h3>
                <button onClick={() => setShowTreatmentModal(true)} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">New Treatment</button>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Strategy</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {treatments.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">{t.strategy}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{t.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{t.status}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          <button
                            onClick={() => { setEditingTreatment(t); setShowEditTreatmentModal(true); }}
                            className="text-gray-900 underline hover:text-gray-700"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Risk</h3>
            {formError && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input name="code" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input name="title" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" required rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Risk Type</label>
                <select name="riskType" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {RISK_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Process (optional)</label>
                <input name="processId" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner (optional)</label>
                <input name="ownerId" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssessmentModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Assessment</h3>
            {formError && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreateAssessment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Probability</label>
                <select name="probability" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {PROBABILITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Impact</label>
                <select name="impact" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {IMPACT_OPTIONS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssessmentModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showControlModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Control</h3>
            {formError && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreateControl} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" required rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Control Type</label>
                <select name="controlType" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {CONTROL_TYPE_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Effectiveness (optional)</label>
                <select name="effectiveness" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">None</option>
                  {['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_EVALUATED'].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowControlModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTreatmentModal && selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Treatment</h3>
            {formError && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreateTreatment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Strategy</label>
                <select name="strategy" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {TREATMENT_STRATEGY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" required rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Responsible (optional)</label>
                <input name="responsibleId" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date (optional)</label>
                <input type="date" name="dueDate" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTreatmentModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTreatmentModal && editingTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Treatment</h3>
            {formError && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleUpdateTreatment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Strategy</label>
                <select name="strategy" defaultValue={editingTreatment.strategy} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {TREATMENT_STRATEGY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" required rows={3} defaultValue={editingTreatment.description} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Responsible (optional)</label>
                <input name="responsibleId" defaultValue={editingTreatment.responsibleId || ''} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date (optional)</label>
                <input type="date" name="dueDate" defaultValue={editingTreatment.dueDate ? editingTreatment.dueDate.split('T')[0] : ''} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" defaultValue={editingTreatment.status} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {TREATMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Completed At (optional)</label>
                <input type="date" name="completedAt" defaultValue={editingTreatment.completedAt ? editingTreatment.completedAt.split('T')[0] : ''} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowEditTreatmentModal(false); setEditingTreatment(null); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
