import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Risk, RiskListItem, RiskAssessment, RiskControl, RiskTreatment } from '../lib/auth/auth.service';
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

type Tab = 'details' | 'assessments' | 'controls' | 'treatments';

const STATUS_OPTIONS = [
  { value: 'IDENTIFIED', label: 'Identificado' },
  { value: 'ASSESSED', label: 'Evaluado' },
  { value: 'TREATMENT_PLANNED', label: 'Tratamiento planificado' },
  { value: 'UNDER_CONTROL', label: 'Bajo control' },
  { value: 'CLOSED', label: 'Cerrado' },
];
const STATUS_VALUES: string[] = [];
STATUS_OPTIONS.forEach((s) => STATUS_VALUES.push(s.value));
const RISK_TYPE_OPTIONS = [
  { value: 'INTERNAL', label: 'Interno' },
  { value: 'EXTERNAL', label: 'Externo' },
  { value: 'COMPLIANCE', label: 'Cumplimiento' },
  { value: 'OPERATIONAL', label: 'Operacional' },
  { value: 'STRATEGIC', label: 'Estratégico' },
  { value: 'FINANCIAL', label: 'Financiero' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'OTHER', label: 'Otro' },
];
const RISK_TYPE_VALUES = RISK_TYPE_OPTIONS.map((t) => t.value);
const PROBABILITY_OPTIONS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];
const IMPACT_OPTIONS = PROBABILITY_OPTIONS;
const CONTROL_TYPE_OPTIONS = [
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'DETECTIVE', label: 'Detectivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'COMPENSATING', label: 'Compensatorio' },
  { value: 'OTHER', label: 'Otro' },
];
const TREATMENT_STRATEGY_OPTIONS = [
  { value: 'AVOID', label: 'Evitar' },
  { value: 'MITIGATE', label: 'Mitigar' },
  { value: 'TRANSFER', label: 'Transferir' },
  { value: 'ACCEPT', label: 'Aceptar' },
  { value: 'EXPLOIT', label: 'Explotar' },
  { value: 'ENHANCE', label: 'Mejorar' },
  { value: 'SHARE', label: 'Compartir' },
];
const TREATMENT_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planificado' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

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
      setError(err instanceof Error ? err.message : 'Error al cargar los riesgos');
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
      setFormError(err instanceof Error ? err.message : 'Error al crear el riesgo');
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
      setFormError(err instanceof Error ? err.message : 'Error al crear la evaluación');
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
      setFormError(err instanceof Error ? err.message : 'Error al crear el control');
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
      setFormError(err instanceof Error ? err.message : 'Error al crear el tratamiento');
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
      if (selectedRisk) {
        authApiClient.listRiskTreatments(selectedRisk.id, { page: treatmentsMeta.page, pageSize: treatmentsMeta.pageSize })
          .then((response) => {
            setTreatments(response.data);
            setTreatmentsMeta(response.meta);
          });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar el tratamiento');
    }
  };

  const getScoreColor = (score: string | null) => {
    if (!score) return 'text-slate-600';
    const value = parseInt(score, 10);
    if (value >= 12) return 'text-red-600 font-semibold';
    if (value >= 6) return 'text-amber-600 font-semibold';
    return 'text-emerald-600 font-semibold';
  };

  return (
    <>
      <PageHeader
        title="Gestión de riesgos"
        description="Identifique, evalúe, controle y dé tratamiento a los riesgos del sistema de gestión."
        breadcrumbs={[{ label: 'Principal', href: '/' }, { label: 'Riesgos' }]}
        actions={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nuevo riesgo</Button>}
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
              placeholder="Buscar por código o título..."
              leftIcon="search"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
              options={[{ value: '', label: 'Todos los estados' }, ...STATUS_OPTIONS]}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={riskTypeFilter}
              onChange={(e) => { setRiskTypeFilter(e.target.value); setMeta((prev) => ({ ...prev, page: 1 })); }}
              options={[{ value: '', label: 'Todos los tipos' }, ...RISK_TYPE_OPTIONS]}
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Cargando riesgos..." />
        ) : risks.length === 0 ? (
          <EmptyState
            icon="shield"
            title="No hay riesgos registrados"
            description="Identifique el primer riesgo para iniciar el ciclo de evaluación y tratamiento."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear riesgo</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(r) => r.id}
              columns={[
                { key: 'code', header: 'Código', width: '120px', render: (r) => <span className="font-mono text-xs font-semibold text-slate-900">{r.code}</span> },
                { key: 'title', header: 'Título', render: (r) => <span className="text-sm font-medium text-slate-900">{r.title}</span> },
                { key: 'type', header: 'Tipo', render: (r) => <span className="text-sm text-slate-600">{r.riskType}</span> },
                { key: 'status', header: 'Estado', width: '200px', render: (r) => <StatusPill status={r.status} /> },
                { key: 'owner', header: 'Propietario', render: (r) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '—' },
                {
                  key: 'actions', header: '', align: 'right', width: '80px',
                  render: (r) => <Button variant="ghost" size="sm" onClick={() => loadDetail(r as unknown as Risk)} rightIcon="chevron-right">Ver</Button>,
                },
              ]}
              data={risks}
              onRowClick={(r) => loadDetail(r as unknown as Risk)}
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

      {selectedRisk && (
        <Modal
          open
          onClose={() => setSelectedRisk(null)}
          title={selectedRisk.title}
          description={`${selectedRisk.code} · ${selectedRisk.riskType}`}
          size="xl"
          footer={<Button onClick={() => setSelectedRisk(null)}>Cerrar</Button>}
        >
          <div className="-mx-1 mb-4">
            <Tabs
              tabs={[
                { id: 'details', label: 'Detalles' },
                { id: 'assessments', label: 'Evaluaciones' },
                { id: 'controls', label: 'Controles' },
                { id: 'treatments', label: 'Tratamientos' },
              ]}
              activeTab={detailTab}
              onChange={(t) => setDetailTab(t as Tab)}
            />
          </div>

          {detailTab === 'details' && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Código" value={<span className="font-mono">{selectedRisk.code}</span>} />
              <Field label="Estado" value={<StatusPill status={selectedRisk.status} />} />
              <Field label="Tipo" value={selectedRisk.riskType} />
              <Field label="Propietario" value={selectedRisk.owner ? `${selectedRisk.owner.firstName} ${selectedRisk.owner.lastName}` : '—'} />
              <Field label="Creado" value={new Date(selectedRisk.createdAt).toLocaleString('es-ES')} />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Descripción</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{selectedRisk.description}</dd>
              </div>
            </dl>
          )}

          {detailTab === 'assessments' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAssessmentModal(true)} leftIcon="plus">Nueva evaluación</Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-sm text-slate-500">No hay evaluaciones registradas.</p>
              ) : (
                <>
                  <Table
                    rowKey={(a) => a.id}
                    columns={[
                      { key: 'p', header: 'Probabilidad', render: (a) => <StatusPill status={a.probability} /> },
                      { key: 'i', header: 'Impacto', render: (a) => <StatusPill status={a.impact} /> },
                      { key: 's', header: 'Puntaje', render: (a) => <span className={getScoreColor(a.score)}>{a.score}</span> },
                      { key: 'd', header: 'Fecha', render: (a) => new Date(a.assessedAt).toLocaleString('es-ES') },
                    ]}
                    data={assessments}
                  />
                  <Pagination
                    page={assessmentsMeta.page}
                    pageSize={assessmentsMeta.pageSize}
                    total={assessmentsMeta.total}
                    onPageChange={(p) => setAssessmentsMeta((prev) => ({ ...prev, page: p }))}
                    className="rounded-b-lg"
                  />
                </>
              )}
            </div>
          )}

          {detailTab === 'controls' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowControlModal(true)} leftIcon="plus">Nuevo control</Button>
              </div>
              {controls.length === 0 ? (
                <p className="text-sm text-slate-500">No hay controles registrados.</p>
              ) : (
                <Table
                  rowKey={(c) => c.id}
                  columns={[
                    { key: 'type', header: 'Tipo', render: (c) => <span className="text-sm">{c.controlType}</span> },
                    { key: 'desc', header: 'Descripción', render: (c) => c.description },
                    { key: 'eff', header: 'Efectividad', render: (c) => c.effectiveness || '—' },
                  ]}
                  data={controls}
                />
              )}
            </div>
          )}

          {detailTab === 'treatments' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowTreatmentModal(true)} leftIcon="plus">Nuevo tratamiento</Button>
              </div>
              {treatments.length === 0 ? (
                <p className="text-sm text-slate-500">No hay tratamientos registrados.</p>
              ) : (
                <Table
                  rowKey={(t) => t.id}
                  columns={[
                    { key: 'strat', header: 'Estrategia', render: (t) => t.strategy },
                    { key: 'desc', header: 'Descripción', render: (t) => t.description },
                    { key: 'status', header: 'Estado', render: (t) => <StatusPill status={t.status} /> },
                    {
                      key: 'actions', header: '', align: 'right',
                      render: (t) => <Button variant="ghost" size="sm" onClick={() => { setEditingTreatment(t); setShowEditTreatmentModal(true); }} leftIcon="edit">Editar</Button>,
                    },
                  ]}
                  data={treatments}
                />
              )}
            </div>
          )}
        </Modal>
      )}

      {showCreateModal && (
        <Modal
          open
          onClose={() => { setShowCreateModal(false); setFormError(null); }}
          title="Crear riesgo"
          description="Registra un nuevo riesgo en el sistema."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-risk-form">Crear riesgo</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-risk-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Código" name="code" required />
              <Select
                label="Tipo de riesgo"
                name="riskType"
                required
                defaultValue={RISK_TYPE_VALUES[0]}
                options={RISK_TYPE_OPTIONS}
              />
            </div>
            <Input label="Título" name="title" required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" required rows={3} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ID de proceso" name="processId" />
              <Input label="ID de propietario" name="ownerId" />
            </div>
          </form>
        </Modal>
      )}

      {showAssessmentModal && selectedRisk && (
        <Modal
          open
          onClose={() => { setShowAssessmentModal(false); setFormError(null); }}
          title="Crear evaluación"
          description={`${selectedRisk.code} · ${selectedRisk.title}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowAssessmentModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-assessment-form">Crear evaluación</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-assessment-form" onSubmit={handleCreateAssessment} className="space-y-4">
            <Select label="Probabilidad" name="probability" required defaultValue={PROBABILITY_OPTIONS[0].value} options={PROBABILITY_OPTIONS} />
            <Select label="Impacto" name="impact" required defaultValue={IMPACT_OPTIONS[0].value} options={IMPACT_OPTIONS} />
          </form>
        </Modal>
      )}

      {showControlModal && selectedRisk && (
        <Modal
          open
          onClose={() => { setShowControlModal(false); setFormError(null); }}
          title="Crear control"
          description="Asocia un control al riesgo."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowControlModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-control-form">Crear control</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-control-form" onSubmit={handleCreateControl} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" required rows={3} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <Select label="Tipo de control" name="controlType" required defaultValue={CONTROL_TYPE_OPTIONS[0].value} options={CONTROL_TYPE_OPTIONS} />
            <Select
              label="Efectividad"
              name="effectiveness"
              defaultValue=""
              options={[{ value: '', label: 'Sin evaluar' }, { value: 'EFFECTIVE', label: 'Efectivo' }, { value: 'PARTIALLY_EFFECTIVE', label: 'Parcialmente efectivo' }, { value: 'INEFFECTIVE', label: 'Inefectivo' }, { value: 'NOT_EVALUATED', label: 'No evaluado' }]}
            />
          </form>
        </Modal>
      )}

      {showTreatmentModal && selectedRisk && (
        <Modal
          open
          onClose={() => { setShowTreatmentModal(false); setFormError(null); }}
          title="Crear tratamiento"
          description="Define la estrategia de tratamiento del riesgo."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowTreatmentModal(false); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="create-treatment-form">Crear tratamiento</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="create-treatment-form" onSubmit={handleCreateTreatment} className="space-y-4">
            <Select label="Estrategia" name="strategy" required defaultValue={TREATMENT_STRATEGY_OPTIONS[0].value} options={TREATMENT_STRATEGY_OPTIONS} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" required rows={3} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ID responsable" name="responsibleId" />
              <Input label="Fecha de vencimiento" name="dueDate" type="date" />
            </div>
          </form>
        </Modal>
      )}

      {showEditTreatmentModal && editingTreatment && (
        <Modal
          open
          onClose={() => { setShowEditTreatmentModal(false); setEditingTreatment(null); setFormError(null); }}
          title="Editar tratamiento"
          description="Actualiza la estrategia o el estado del tratamiento."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowEditTreatmentModal(false); setEditingTreatment(null); setFormError(null); }}>Cancelar</Button>
              <Button type="submit" form="edit-treatment-form">Guardar cambios</Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <form id="edit-treatment-form" onSubmit={handleUpdateTreatment} className="space-y-4">
            <Select label="Estrategia" name="strategy" required defaultValue={editingTreatment.strategy} options={TREATMENT_STRATEGY_OPTIONS} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea name="description" required rows={3} defaultValue={editingTreatment.description} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ID responsable" name="responsibleId" defaultValue={editingTreatment.responsibleId || ''} />
              <Input label="Fecha de vencimiento" name="dueDate" type="date" defaultValue={editingTreatment.dueDate ? editingTreatment.dueDate.split('T')[0] : ''} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Estado" name="status" required defaultValue={editingTreatment.status} options={TREATMENT_STATUS_OPTIONS} />
              <Input label="Fecha de completado" name="completedAt" type="date" defaultValue={editingTreatment.completedAt ? editingTreatment.completedAt.split('T')[0] : ''} />
            </div>
          </form>
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
