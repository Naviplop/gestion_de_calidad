import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Document, DocumentListItem, DocumentVersion, DocumentDistribution, FileAssetMetadata } from '../lib/auth/auth.service';
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
import { StatusPill, STATUSES } from '../components/ui/StatusPill';
import { Icon } from '../components/ui/Icon';

type Tab = 'details' | 'versions' | 'reviews' | 'approvals' | 'distributions' | 'acknowledgements';

type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'REJECTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'CURRENT' | 'OBSOLETE' | 'CANCELLED';

const LIFECYCLE_ACTIONS: Record<DocumentStatus, string[]> = {
  DRAFT: ['submit', 'cancel'],
  REJECTED: ['submit', 'cancel'],
  IN_REVIEW: ['submitForApproval', 'cancel'],
  PENDING_APPROVAL: ['approve', 'reject', 'cancel'],
  APPROVED: ['publish'],
  PUBLISHED: ['obsolete'],
  CURRENT: ['obsolete'],
  OBSOLETE: [],
  CANCELLED: [],
};

const LIFECYCLE_STEPS = ['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'CURRENT', 'OBSOLETE'] as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  REJECTED: 'Rechazado',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
  PUBLISHED: 'Publicado',
  CURRENT: 'Vigente',
  OBSOLETE: 'Obsoleto',
  CANCELLED: 'Cancelado',
};

const STATUS_PILL_KEYS: Record<string, keyof typeof STATUSES> = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  REJECTED: 'REJECTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  CURRENT: 'CURRENT',
  OBSOLETE: 'OBSOLETE',
  CANCELLED: 'CANCELLED',
};

const ACTION_LABELS: Record<string, string> = {
  submit: 'Enviar a revisión',
  submitForApproval: 'Enviar a aprobación',
  approve: 'Aprobar',
  reject: 'Rechazar',
  publish: 'Publicar',
  obsolete: 'Marcar como obsoleto',
  cancel: 'Cancelar',
};

const CONFIRM_MESSAGES: Record<string, { title: string; message: string; confirmText: string }> = {
  obsolete: {
    title: '¿Marcar como obsoleto?',
    message: 'Esto marcará el documento como obsoleto. Esta acción puede afectar distribuciones activas.',
    confirmText: 'Marcar como obsoleto',
  },
  cancel: {
    title: '¿Cancelar documento?',
    message: 'Esto cancelará el documento. Esta acción puede afectar flujos de revisión.',
    confirmText: 'Cancelar',
  },
  reject: {
    title: '¿Rechazar documento?',
    message: 'Esto rechazará el documento. Regresará al estado rechazado.',
    confirmText: 'Rechazar',
  },
};

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailTab, setDetailTab] = useState<Tab>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsMeta, setVersionsMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [distributions, setDistributions] = useState<DocumentDistribution[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; documentId: string } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingVersionId, setUploadingVersionId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAssets, setFileAssets] = useState<Record<string, FileAssetMetadata>>({});
  const { showToast } = useToast();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listDocuments({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setDocuments(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadDocuments();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const documentTypeId = formData.get('documentTypeId') as string;
    const processId = formData.get('processId') as string;
    const departmentId = formData.get('departmentId') as string;
    const ownerId = formData.get('ownerId') as string;
    const responsibleId = formData.get('responsibleId') as string;
    const classification = formData.get('classification') as string;
    const confidentiality = formData.get('confidentiality') as string;
    const issueDate = formData.get('issueDate') as string;
    const reviewDate = formData.get('reviewDate') as string;
    const nextReviewDate = formData.get('nextReviewDate') as string;

    try {
      await authApiClient.createDocument({
        code,
        title,
        description: description || undefined,
        documentTypeId,
        processId: processId || undefined,
        departmentId: departmentId || undefined,
        ownerId,
        responsibleId,
        classification,
        confidentiality,
        issueDate: issueDate || undefined,
        reviewDate: reviewDate || undefined,
        nextReviewDate: nextReviewDate || undefined,
      });
      setShowCreateModal(false);
      showToast('Documento creado exitosamente', 'success');
      loadDocuments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear documento');
    }
  };

  const confirmAction = (action: string, documentId: string) => {
    setPendingAction({ action, documentId });
  };

  const handleConfirmedAction = async () => {
    if (!pendingAction) return;
    const { action, documentId } = pendingAction;
    setPendingAction(null);
    setActionLoading(action);
    try {
       switch (action) {
         case 'submit':
           await authApiClient.submitDocument(documentId);
           showToast('Documento enviado a revisión', 'success');
           break;
         case 'submitForApproval':
           await authApiClient.submitForApprovalDocument(documentId);
           showToast('Documento enviado a aprobación', 'success');
           break;
         case 'approve':
          await authApiClient.approveDocument(documentId);
          showToast('Documento aprobado', 'success');
          break;
        case 'reject':
          await authApiClient.rejectDocument(documentId);
          showToast('Documento rechazado', 'warning');
          break;
        case 'publish':
          await authApiClient.publishDocument(documentId);
          showToast('Documento publicado', 'success');
          break;
        case 'obsolete':
          await authApiClient.obsoleteDocument(documentId);
          showToast('Documento marcado como obsoleto', 'warning');
          break;
        case 'cancel':
          await authApiClient.cancelDocument(documentId);
          showToast('Documento cancelado', 'warning');
          break;
        default:
          break;
      }
      if (selectedDocument && selectedDocument.id === documentId) {
        const updated = await authApiClient.getDocument(documentId);
        setSelectedDocument(updated.data);
      }
      loadDocuments();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Error al ${action} documento`;
      setError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const loadVersions = async (documentId: string) => {
    try {
      const response = await authApiClient.listDocumentVersions(documentId, {
        page: versionsMeta.page,
        pageSize: versionsMeta.pageSize,
      });
      setVersions(response.data);
      setVersionsMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar versiones');
    }
  };

  const loadDistributions = async (documentId: string) => {
    try {
      const response = await authApiClient.listDocumentDistributions(documentId);
      setDistributions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar distribuciones');
    }
  };

  const handleFileUpload = async (versionId: string) => {
    if (!selectedFile) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const result = await authApiClient.uploadFileAsset(selectedFile);
      setFileAssets((prev) => ({ ...prev, [versionId]: result.data }));
      setShowUploadModal(false);
      setSelectedFile(null);
      showToast('Archivo cargado exitosamente', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar archivo';
      setUploadError(message);
      showToast(message, 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (fileAssetId: string, filename: string) => {
    try {
      const blob = await authApiClient.downloadFileAsset(fileAssetId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Descarga iniciada', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al descargar archivo';
      showToast(message, 'error');
    }
  };

  const openDetail = async (documentId: string) => {
    try {
      const response = await authApiClient.getDocument(documentId);
      setSelectedDocument(response.data);
      setDetailTab('details');
      loadVersions(documentId);
      loadDistributions(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalle del documento');
    }
  };

  const availableActions = (status: string) => LIFECYCLE_ACTIONS[status as DocumentStatus] || [];

  const tabs = [
    { id: 'details', label: 'Detalles' },
    { id: 'versions', label: 'Versiones' },
    { id: 'reviews', label: 'Revisiones' },
    { id: 'approvals', label: 'Aprobaciones' },
    { id: 'distributions', label: 'Distribuciones' },
    { id: 'acknowledgements', label: 'Acuses' },
  ];

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Gestiona la documentación controlada del sistema de gestión de calidad."
        breadcrumbs={[{ label: 'Principal', href: '/' }, { label: 'Documentos' }]}
        actions={
          <Button onClick={() => setShowCreateModal(true)} leftIcon="plus">
            Nuevo documento
          </Button>
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
                { value: 'DRAFT', label: 'Borrador' },
                { value: 'IN_REVIEW', label: 'En revisión' },
                { value: 'PENDING_APPROVAL', label: 'Pendiente de aprobación' },
                { value: 'APPROVED', label: 'Aprobado' },
                { value: 'PUBLISHED', label: 'Publicado' },
                { value: 'CURRENT', label: 'Vigente' },
                { value: 'REJECTED', label: 'Rechazado' },
                { value: 'OBSOLETE', label: 'Obsoleto' },
                { value: 'CANCELLED', label: 'Cancelado' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando documentos..." />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="document"
            title="No hay documentos registrados"
            description="Crea tu primer documento para comenzar a gestionar la documentación controlada del sistema."
            action={
              <Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear documento</Button>
            }
          />
        ) : (
          <>
            <Table
              rowKey={(d) => d.id}
              columns={[
                {
                  key: 'code',
                  header: 'Código',
                  width: '140px',
                  render: (doc) => <span className="font-mono text-sm font-semibold text-slate-900">{doc.code}</span>,
                },
                {
                  key: 'title',
                  header: 'Título',
                  render: (doc) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.title}</p>
                      <p className="truncate text-xs text-slate-500">{doc.documentType?.name || 'Sin tipo'}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Estado',
                  width: '180px',
                  render: (doc) => <StatusPill status={STATUS_PILL_KEYS[doc.status] || doc.status} />,
                },
                {
                  key: 'version',
                  header: 'Versión',
                  width: '100px',
                  render: (doc) =>
                    doc.currentVersion ? (
                      <span className="font-mono text-xs text-slate-700">
                        v{doc.currentVersion.versionMajor}.{doc.currentVersion.versionMinor}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    ),
                },
                {
                  key: 'updated',
                  header: 'Actualizado',
                  width: '120px',
                  render: (doc) => (
                    <span className="text-xs text-slate-500">
                      {new Date(doc.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  width: '80px',
                  align: 'right',
                  render: (doc) => (
                    <Button variant="ghost" size="sm" onClick={() => openDetail(doc.id)} rightIcon="chevron-right">
                      Ver
                    </Button>
                  ),
                },
              ]}
              data={documents}
              onRowClick={(doc) => openDetail(doc.id)}
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
          title="Crear documento"
          description="Completa la información básica del nuevo documento."
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>
                Cancelar
              </Button>
              <Button type="submit" form="create-document-form">Crear documento</Button>
            </>
          }
        >
          {formError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <form id="create-document-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Código" name="code" required maxLength={100} />
              <Input label="ID de tipo de documento" name="documentTypeId" required />
            </div>
            <Input label="Título" name="title" required maxLength={300} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                name="description"
                maxLength={5000}
                rows={3}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ID de propietario" name="ownerId" required />
              <Input label="ID de responsable" name="responsibleId" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Clasificación"
                name="classification"
                defaultValue="INTERNAL"
                options={[
                  { value: 'INTERNAL', label: 'Interno' },
                  { value: 'CONFIDENTIAL', label: 'Confidencial' },
                  { value: 'RESTRICTED', label: 'Restringido' },
                ]}
              />
              <Select
                label="Confidencialidad"
                name="confidentiality"
                defaultValue="INTERNAL"
                options={[
                  { value: 'PUBLIC', label: 'Público' },
                  { value: 'INTERNAL', label: 'Interno' },
                  { value: 'CONFIDENTIAL', label: 'Confidencial' },
                  { value: 'RESTRICTED', label: 'Restringido' },
                ]}
              />
            </div>
          </form>
        </Modal>
      )}

      {selectedDocument && (
        <Modal
          open={!!selectedDocument}
          onClose={() => { setSelectedDocument(null); setDetailTab('details'); }}
          title={selectedDocument.title}
          description={`${selectedDocument.code} · ${STATUS_LABELS[selectedDocument.status] || selectedDocument.status}`}
          size="xl"
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {availableActions(selectedDocument.status).map((action) => {
                const isDestructive = ['obsolete', 'cancel', 'reject'].includes(action);
                const label = ACTION_LABELS[action] || action;
                return (
                  <Button
                    key={action}
                    variant={isDestructive ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      if (isDestructive) {
                        confirmAction(action, selectedDocument.id);
                      } else {
                        setPendingAction({ action, documentId: selectedDocument.id });
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
            <Tabs tabs={tabs} activeTab={detailTab} onChange={(tabId) => setDetailTab(tabId as Tab)} />
          </div>

          <div>
            {detailTab === 'details' && (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Ciclo de vida</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const currentIdx = LIFECYCLE_STEPS.indexOf(selectedDocument.status as typeof LIFECYCLE_STEPS[number]);
                      const isActive = step === selectedDocument.status;
                      const isPast = currentIdx >= idx;
                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isActive ? 'bg-slate-900 text-white' : isPast ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isPast && !isActive ? <Icon name="check" className="h-3 w-3" /> : idx + 1}
                          </div>
                          <span className={`text-xs ${isActive ? 'font-semibold text-slate-900' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                            {STATUS_LABELS[step] || step}
                          </span>
                          {idx < LIFECYCLE_STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-slate-200" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <Field label="Código" value={<span className="font-mono">{selectedDocument.code}</span>} />
                  <Field label="Estado"><StatusPill status={STATUS_PILL_KEYS[selectedDocument.status] || selectedDocument.status} /></Field>
                  <Field label="Clasificación" value={selectedDocument.classification} />
                  <Field label="Confidencialidad" value={selectedDocument.confidentiality} />
                  <Field label="Propietario" value={`${selectedDocument.owner?.firstName ?? ''} ${selectedDocument.owner?.lastName ?? ''}`.trim() || '—'} />
                  <Field label="Responsable" value={`${selectedDocument.responsible?.firstName ?? ''} ${selectedDocument.responsible?.lastName ?? ''}`.trim() || '—'} />
                  <Field
                    label="Versión actual"
                    value={selectedDocument.currentVersion ? `v${selectedDocument.currentVersion.versionMajor}.${selectedDocument.currentVersion.versionMinor}` : '—'}
                  />
                  <Field label="Fecha de emisión" value={selectedDocument.issueDate ? new Date(selectedDocument.issueDate).toLocaleDateString('es-ES') : '—'} />
                  <Field label="Próxima revisión" value={selectedDocument.nextReviewDate ? new Date(selectedDocument.nextReviewDate).toLocaleDateString('es-ES') : '—'} />
                </dl>
              </div>
            )}

            {detailTab === 'versions' && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Versiones del documento</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin versiones registradas.</p>
                ) : (
                  <Table
                    rowKey={(v) => v.id}
                    columns={[
                      { key: 'version', header: 'Versión', render: (v) => <span className="font-mono text-sm">{v.versionMajor}.{v.versionMinor} ({v.versionLabel})</span> },
                      { key: 'status', header: 'Estado', render: (v) => v.status },
                      {
                        key: 'file',
                        header: 'Archivo',
                        render: (v) => {
                          const fileAsset = v.fileAssetId ? fileAssets[v.fileAssetId] : null;
                          return fileAsset ? (
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm text-slate-700">{fileAsset.originalFilename}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(fileAsset.id, fileAsset.originalFilename)}>
                                Descargar
                              </Button>
                            </div>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => { setUploadingVersionId(v.id); setShowUploadModal(true); }}>
                              Cargar archivo
                            </Button>
                          );
                        },
                      },
                      { key: 'created', header: 'Creada', render: (v) => new Date(v.createdAt).toLocaleDateString('es-ES') },
                    ]}
                    data={versions}
                  />
                )}
              </div>
            )}

            {detailTab === 'distributions' && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Distribuciones</h3>
                {distributions.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin distribuciones registradas.</p>
                ) : (
                  <Table
                    rowKey={(d) => d.id}
                    columns={[
                      { key: 'version', header: 'Versión', render: (d) => <span className="font-mono text-xs">{d.documentVersionId}</span> },
                      { key: 'assignee', header: 'Asignado a', render: (d) => d.assignedToUser?.firstName || d.assignedToDepartment?.name || '—' },
                      { key: 'status', header: 'Estado', render: (d) => d.status },
                    ]}
                    data={distributions}
                  />
                )}
              </div>
            )}

            {detailTab === 'acknowledgements' && (
              <EmptyState
                icon="check"
                title="Acuses pendientes de implementación"
                description="El listado de acuses estará disponible cuando el backend lo habilite. Utiliza la pestaña Distribuciones para registrar acuses."
              />
            )}

            {detailTab === 'reviews' && (
              <p className="text-sm text-slate-500">Las revisiones se gestionan mediante revisores de versión.</p>
            )}

            {detailTab === 'approvals' && (
              <p className="text-sm text-slate-500">Las aprobaciones se gestionan por versión.</p>
            )}
          </div>
        </Modal>
      )}

      {pendingAction && (
        <ConfirmModal
          action={pendingAction.action}
          resourceCode={selectedDocument?.code || 'este documento'}
          resourceType="documento"
          onConfirm={handleConfirmedAction}
          onCancel={() => setPendingAction(null)}
          variant={['obsolete', 'cancel', 'reject'].includes(pendingAction.action) ? 'danger' : 'primary'}
          messages={CONFIRM_MESSAGES}
        />
      )}

      {showUploadModal && (
        <Modal
          open={showUploadModal}
          onClose={() => { setShowUploadModal(false); setSelectedFile(null); setUploadError(null); }}
          title="Cargar archivo"
          description="Selecciona el archivo para adjuntar a la versión."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowUploadModal(false); setSelectedFile(null); setUploadError(null); }} disabled={uploadLoading}>
                Cancelar
              </Button>
              <Button onClick={() => uploadingVersionId && handleFileUpload(uploadingVersionId)} loading={uploadLoading} disabled={!selectedFile}>
                Cargar archivo
              </Button>
            </>
          }
        >
          {uploadError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Archivo</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
            {selectedFile && (
              <p className="mt-1.5 text-xs text-slate-500">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
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
