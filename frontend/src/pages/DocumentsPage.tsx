import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Document, DocumentListItem, DocumentVersion, DocumentDistribution, FileAssetMetadata } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';

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
    loadDocuments();
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

  const statusColor = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
      DRAFT: 'default',
      IN_REVIEW: 'warning',
      PENDING_APPROVAL: 'info',
      APPROVED: 'success',
      CURRENT: 'success',
      REJECTED: 'danger',
      OBSOLETE: 'default',
      CANCELLED: 'danger',
      PUBLISHED: 'info',
    };
    return colors[status] || 'default';
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona la documentación controlada de tu organización.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Crear documento</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Input
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar documentos..."
          className="max-w-xs"
        />
        <Button onClick={handleSearch} variant="secondary">Buscar</Button>
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Todos los estados' },
            { value: 'DRAFT', label: 'Borrador' },
            { value: 'IN_REVIEW', label: 'En revisión' },
            { value: 'PENDING_APPROVAL', label: 'Pendiente de aprobación' },
            { value: 'APPROVED', label: 'Aprobado' },
            { value: 'CURRENT', label: 'Vigente' },
            { value: 'REJECTED', label: 'Rechazado' },
            { value: 'OBSOLETE', label: 'Obsoleto' },
            { value: 'CANCELLED', label: 'Cancelado' },
          ]}
          className="w-48"
        />
      </div>

      {loading ? (
        <LoadingState message="Cargando documentos..." />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No hay documentos registrados"
          description="Crea tu primer documento para comenzar a gestionar la documentación controlada."
          action={<Button onClick={() => setShowCreateModal(true)}>Crear documento</Button>}
        />
      ) : (
        <Table
          columns={[
            { key: 'code', header: 'Código', render: (doc) => <span className="font-medium text-slate-900">{(doc as DocumentListItem).code}</span> },
            { key: 'title', header: 'Título', render: (doc) => (doc as DocumentListItem).title },
            { key: 'type', header: 'Tipo', render: (doc) => (doc as DocumentListItem).documentType?.name || '-' },
            { key: 'status', header: 'Estado', render: (doc) => <Badge variant={statusColor((doc as DocumentListItem).status)}>{STATUS_LABELS[(doc as DocumentListItem).status] || (doc as DocumentListItem).status}</Badge> },
            { key: 'version', header: 'Versión actual', render: (doc) => { const d = doc as DocumentListItem; return d.currentVersion ? `${d.currentVersion.versionMajor}.${d.currentVersion.versionMinor}` : '-'; } },
            { key: 'actions', header: 'Acciones', render: (doc) => <Button variant="ghost" size="sm" onClick={() => openDetail((doc as DocumentListItem).id)}>Ver</Button> },
          ]}
          data={documents}
          onRowClick={(doc) => openDetail(doc.id)}
        />
      )}

      {showCreateModal && (
        <Modal
          open={showCreateModal}
          onClose={() => { setShowCreateModal(false); setFormError(null); }}
          title="Crear documento"
          description="Completa la información básica del nuevo documento."
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setFormError(null); }}>
                Cancelar
              </Button>
              <Button type="submit" form="create-document-form">
                Crear
              </Button>
            </>
          }
        >
          {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <form id="create-document-form" onSubmit={handleCreate} className="space-y-4">
            <Input label="Código" name="code" required maxLength={100} />
            <Input label="Título" name="title" required maxLength={300} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
              <textarea name="description" maxLength={5000} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <Input label="ID de tipo de documento" name="documentTypeId" required />
            <Input label="ID de propietario" name="ownerId" required />
            <Input label="ID de responsable" name="responsibleId" required />
            <Select label="Clasificación" name="classification" options={[
              { value: 'INTERNAL', label: 'Interno' },
              { value: 'CONFIDENTIAL', label: 'Confidencial' },
              { value: 'RESTRICTED', label: 'Restringido' },
            ]} />
            <Select label="Confidencialidad" name="confidentiality" options={[
              { value: 'PUBLIC', label: 'Público' },
              { value: 'INTERNAL', label: 'Interno' },
              { value: 'CONFIDENTIAL', label: 'Confidencial' },
              { value: 'RESTRICTED', label: 'Restringido' },
            ]} />
          </form>
        </Modal>
      )}

      {selectedDocument && (
        <Modal
          open={!!selectedDocument}
          onClose={() => { setSelectedDocument(null); setDetailTab('details'); }}
          title={`${selectedDocument.code} - ${selectedDocument.title}`}
          description={`Estado: ${STATUS_LABELS[selectedDocument.status] || selectedDocument.status}`}
          footer={
            <div className="flex items-center justify-end gap-2">
              {availableActions(selectedDocument.status).map((action) => {
                const isDestructive = ['obsolete', 'cancel', 'reject'].includes(action);
                const label = actionLabels[action] || action;
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
          <Tabs tabs={tabs} activeTab={detailTab} onChange={(tabId) => setDetailTab(tabId as Tab)} />

          <div className="mt-4">
            {detailTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Ciclo de vida</h3>
                  <div className="flex items-center gap-2">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const currentIdx = LIFECYCLE_STEPS.indexOf(selectedDocument.status as typeof LIFECYCLE_STEPS[number]);
                      const isActive = step === selectedDocument.status;
                      const isPast = currentIdx >= idx;
                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isActive ? 'bg-indigo-600 text-white' : isPast ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`text-xs ${isActive ? 'font-medium text-indigo-700' : isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                            {step.replace('_', ' ')}
                          </span>
                          {idx < LIFECYCLE_STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-gray-200" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Código</label>
                    <p className="text-sm text-gray-900">{selectedDocument.code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Título</label>
                    <p className="text-sm text-gray-900">{selectedDocument.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <Badge variant={statusColor(selectedDocument.status).includes('red') ? 'danger' : statusColor(selectedDocument.status).includes('green') ? 'success' : statusColor(selectedDocument.status).includes('yellow') ? 'warning' : 'default'}>
                      {STATUS_LABELS[selectedDocument.status] || selectedDocument.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Clasificación</label>
                    <p className="text-sm text-gray-900">{selectedDocument.classification}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Confidencialidad</label>
                    <p className="text-sm text-gray-900">{selectedDocument.confidentiality}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Propietario</label>
                    <p className="text-sm text-gray-900">{selectedDocument.owner?.firstName} {selectedDocument.owner?.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Responsable</label>
                    <p className="text-sm text-gray-900">{selectedDocument.responsible?.firstName} {selectedDocument.responsible?.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Versión actual</label>
                    <p className="text-sm text-gray-900">
                      {selectedDocument.currentVersion ? `${selectedDocument.currentVersion.versionMajor}.${selectedDocument.currentVersion.versionMinor}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha de emisión</label>
                    <p className="text-sm text-gray-900">{selectedDocument.issueDate ? new Date(selectedDocument.issueDate).toLocaleDateString('es-ES') : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Próxima revisión</label>
                    <p className="text-sm text-gray-900">{selectedDocument.nextReviewDate ? new Date(selectedDocument.nextReviewDate).toLocaleDateString('es-ES') : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'versions' && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Versiones</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin versiones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Versión</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Archivo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Creada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {versions.map((v) => {
                          const fileAsset = v.fileAssetId ? fileAssets[v.fileAssetId] : null;
                          return (
                            <tr key={v.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{v.versionMajor}.{v.versionMinor} ({v.versionLabel})</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{v.status}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {fileAsset ? (
                                  <div className="flex items-center gap-2">
                                    <span className="truncate max-w-xs">{fileAsset.originalFilename}</span>
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(fileAsset.id, fileAsset.originalFilename)}>
                                      Descargar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => { setUploadingVersionId(v.id); setShowUploadModal(true); }}>
                                    Cargar archivo
                                  </Button>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">{new Date(v.createdAt).toLocaleDateString('es-ES')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'distributions' && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Distribuciones</h3>
                {distributions.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin distribuciones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Versión</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Asignado a</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {distributions.map((d) => (
                          <tr key={d.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{d.documentVersionId}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {d.assignedToUser?.firstName || d.assignedToDepartment?.name || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{d.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'acknowledgements' && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Acuses</h3>
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">El listado de acuses está pendiente de implementación en el backend.</p>
                  <p className="mt-1 text-xs text-gray-400">Utiliza la acción de Acuse en la pestaña Distribuciones para registrar acuses.</p>
                </div>
              </div>
            )}

            {detailTab === 'reviews' && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Revisiones</h3>
                <p className="text-sm text-gray-500">Las revisiones se gestionan mediante revisores de versión.</p>
              </div>
            )}

            {detailTab === 'approvals' && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Aprobaciones</h3>
                <p className="text-sm text-gray-500">Las aprobaciones se gestionan por versión.</p>
              </div>
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
          messages={{
            obsolete: {
              title: '¿Marcar como obsoleto?',
              message: `Esto marcará "${selectedDocument?.code || 'este documento'}" como obsoleto. Esta acción puede afectar distribuciones activas.`,
              confirmText: 'Marcar como obsoleto',
            },
            cancel: {
              title: '¿Cancelar documento?',
              message: `Esto cancelará "${selectedDocument?.code || 'este documento'}". Esta acción puede afectar flujos de revisión.`,
              confirmText: 'Cancelar',
            },
            reject: {
              title: '¿Rechazar documento?',
              message: `Esto rechazará "${selectedDocument?.code || 'este documento'}". El documento regresará a estado rechazado.`,
              confirmText: 'Rechazar',
            },
          }}
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
              <Button onClick={() => uploadingVersionId && handleFileUpload(uploadingVersionId)} disabled={!selectedFile || uploadLoading}>
                {uploadLoading ? 'Cargando...' : 'Cargar'}
              </Button>
            </>
          }
        >
          {uploadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Seleccionar archivo</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {selectedFile && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const actionLabels: Record<string, string> = {
  submit: 'Enviar a revisión',
  submitForApproval: 'Enviar a aprobación',
  approve: 'Aprobar',
  reject: 'Rechazar',
  publish: 'Publicar',
  obsolete: 'Marcar como obsoleto',
  cancel: 'Cancelar',
};
