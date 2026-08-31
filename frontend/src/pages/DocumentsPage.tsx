import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Document, DocumentListItem, DocumentVersion, DocumentDistribution, FileAssetMetadata } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

type Tab = 'details' | 'versions' | 'reviews' | 'approvals' | 'distributions' | 'acknowledgements';

type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'REJECTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'CURRENT' | 'OBSOLETE' | 'CANCELLED';

const LIFECYCLE_ACTIONS: Record<DocumentStatus, string[]> = {
  DRAFT: ['submit', 'cancel'],
  REJECTED: ['submit', 'cancel'],
  IN_REVIEW: ['cancel'],
  PENDING_APPROVAL: ['approve', 'reject', 'cancel'],
  APPROVED: ['publish'],
  PUBLISHED: ['obsolete'],
  CURRENT: ['obsolete'],
  OBSOLETE: [],
  CANCELLED: [],
};

const LIFECYCLE_STEPS = ['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'CURRENT', 'OBSOLETE'] as const;

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
      setError(err instanceof Error ? err.message : 'Failed to load documents');
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
      showToast('Document created successfully', 'success');
      loadDocuments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create document');
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
          showToast('Document submitted for review', 'success');
          break;
        case 'approve':
          await authApiClient.approveDocument(documentId);
          showToast('Document approved', 'success');
          break;
        case 'reject':
          await authApiClient.rejectDocument(documentId);
          showToast('Document rejected', 'warning');
          break;
        case 'publish':
          await authApiClient.publishDocument(documentId);
          showToast('Document published', 'success');
          break;
        case 'obsolete':
          await authApiClient.obsoleteDocument(documentId);
          showToast('Document marked as obsolete', 'warning');
          break;
        case 'cancel':
          await authApiClient.cancelDocument(documentId);
          showToast('Document cancelled', 'warning');
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
      const message = err instanceof Error ? err.message : `Failed to ${action} document`;
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
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    }
  };

  const loadDistributions = async (documentId: string) => {
    try {
      const response = await authApiClient.listDocumentDistributions(documentId);
      setDistributions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load distributions');
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
      showToast('File uploaded successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
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
      setError(err instanceof Error ? err.message : 'Failed to load document detail');
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_REVIEW: 'bg-yellow-100 text-yellow-800',
      PENDING_APPROVAL: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      CURRENT: 'bg-emerald-100 text-emerald-800',
      REJECTED: 'bg-red-100 text-red-800',
      OBSOLETE: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PUBLISHED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const availableActions = (status: string) => LIFECYCLE_ACTIONS[status as DocumentStatus] || [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          Create Document
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search documents..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleSearch}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Search
        </button>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="CURRENT">Current</option>
          <option value="REJECTED">Rejected</option>
          <option value="OBSOLETE">Obsolete</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Current Version</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No documents found.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{doc.code}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doc.title}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doc.documentType?.name || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {doc.currentVersion ? `${doc.currentVersion.versionMajor}.${doc.currentVersion.versionMinor}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => openDetail(doc.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Document</h2>
            {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input name="code" required maxLength={100} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input name="title" required maxLength={300} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" maxLength={5000} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Document Type ID</label>
                <input name="documentTypeId" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Owner ID</label>
                <input name="ownerId" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Responsible ID</label>
                <input name="responsibleId" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Classification</label>
                <select name="classification" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Confidentiality</label>
                <select name="confidentiality" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setFormError(null); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedDocument.code} - {selectedDocument.title}</h2>
              <button onClick={() => setSelectedDocument(null)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <div className="mt-4 flex items-center gap-4 border-b border-gray-200">
              {(['details', 'versions', 'reviews', 'approvals', 'distributions', 'acknowledgements'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`pb-2 text-sm font-medium capitalize ${
                    detailTab === tab ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto">
              {detailTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-500">Lifecycle</h3>
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
                    {(selectedDocument.status === 'REJECTED' || selectedDocument.status === 'CANCELLED') && (
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          selectedDocument.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedDocument.status.replace('_', ' ')}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">Terminal state</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Code</label>
                      <p className="text-sm text-gray-900">{selectedDocument.code}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Title</label>
                      <p className="text-sm text-gray-900">{selectedDocument.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor(selectedDocument.status)}`}>
                        {selectedDocument.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Classification</label>
                      <p className="text-sm text-gray-900">{selectedDocument.classification}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Confidentiality</label>
                      <p className="text-sm text-gray-900">{selectedDocument.confidentiality}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Owner</label>
                      <p className="text-sm text-gray-900">{selectedDocument.owner?.firstName} {selectedDocument.owner?.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Responsible</label>
                      <p className="text-sm text-gray-900">{selectedDocument.responsible?.firstName} {selectedDocument.responsible?.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Version</label>
                      <p className="text-sm text-gray-900">
                        {selectedDocument.currentVersion ? `${selectedDocument.currentVersion.versionMajor}.${selectedDocument.currentVersion.versionMinor}` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Issue Date</label>
                      <p className="text-sm text-gray-900">{selectedDocument.issueDate ? new Date(selectedDocument.issueDate).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Next Review</label>
                      <p className="text-sm text-gray-900">{selectedDocument.nextReviewDate ? new Date(selectedDocument.nextReviewDate).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'versions' && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Versions</h3>
                  {versions.length === 0 ? (
                    <p className="text-sm text-gray-500">No versions found.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Version</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">File</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Created</th>
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
                                    <button
                                      onClick={() => handleDownload(fileAsset.id, fileAsset.originalFilename)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      Download
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setUploadingVersionId(v.id); setShowUploadModal(true); }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Upload File
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {detailTab === 'distributions' && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Distributions</h3>
                  {distributions.length === 0 ? (
                    <p className="text-sm text-gray-500">No distributions found.</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Version</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Assigned To</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
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
                  )}
                </div>
              )}

              {detailTab === 'acknowledgements' && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Acknowledgements</h3>
                  <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <p className="text-sm text-gray-500">Acknowledgement listing is pending backend implementation.</p>
                    <p className="mt-1 text-xs text-gray-400">Use the Acknowledge action in the Distributions tab to register acknowledgements.</p>
                  </div>
                </div>
              )}

              {detailTab === 'reviews' && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Reviews</h3>
                  <p className="text-sm text-gray-500">Review assignment is managed via version reviewers.</p>
                </div>
              )}

              {detailTab === 'approvals' && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">Approvals</h3>
                  <p className="text-sm text-gray-500">Approvals are managed per version.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              {availableActions(selectedDocument.status).map((action) => {
                const isDestructive = ['obsolete', 'cancel', 'reject'].includes(action);
                const label = action.charAt(0).toUpperCase() + action.slice(1);
                return (
                  <button
                    key={action}
                    onClick={() => {
                      if (isDestructive) {
                        confirmAction(action, selectedDocument.id);
                      } else {
                        setPendingAction({ action, documentId: selectedDocument.id });
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
          resourceCode={selectedDocument?.code || 'this document'}
          resourceType="document"
          onConfirm={handleConfirmedAction}
          onCancel={() => setPendingAction(null)}
          messages={{
            obsolete: {
              title: 'Mark as obsolete?',
              message: `This will mark "${selectedDocument?.code || 'this document'}" as obsolete. This action may affect active distributions.`,
              confirmText: 'Obsolete',
            },
            cancel: {
              title: 'Cancel document?',
              message: `This will cancel "${selectedDocument?.code || 'this document'}". This action may affect review workflows.`,
              confirmText: 'Cancel',
            },
            reject: {
              title: 'Reject document?',
              message: `This will reject "${selectedDocument?.code || 'this document'}". The document will return to rejected status.`,
              confirmText: 'Reject',
            },
          }}
        />
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Upload File</h2>
            {uploadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Select File</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {selectedFile && (
                <p className="mt-1 text-xs text-gray-500">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); setSelectedFile(null); setUploadError(null); }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={uploadLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadingVersionId && handleFileUpload(uploadingVersionId)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                disabled={!selectedFile || uploadLoading}
              >
                {uploadLoading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
