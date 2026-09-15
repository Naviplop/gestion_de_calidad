import { useState, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { authApiClient } from '../lib/auth/auth.service';
import { FileAssetMetadata } from '../lib/auth/auth.service';

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileAsset: FileAssetMetadata;
  fileName: string;
}

function getMimeCategory(mimeType: string | undefined): 'pdf' | 'image' | 'text' | 'other' {
  if (!mimeType) return 'other';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
}

export function FilePreviewModal({ open, onClose, fileAsset, fileName }: FilePreviewModalProps) {
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = getMimeCategory(fileAsset.mimeType);

  const handleOpenPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null);
    setPreviewUrl(null);
    try {
      const blob = await authApiClient.previewFileAsset(fileAsset.id);
      if (category === 'image') {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else if (category === 'pdf') {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else if (category === 'text') {
        const text = await blob.text();
        setPreviewData(text.length > 50000 ? text.substring(0, 50000) + '...' : text);
      } else {
        setError('Vista previa no disponible para este tipo de archivo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vista previa');
    } finally {
      setLoading(false);
    }
  }, [fileAsset.id, category]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await authApiClient.downloadFileAsset(fileAsset.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Error handled by auth service
    }
  }, [fileAsset.id, fileName]);

  const handleClose = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewData(null);
    setError(null);
    setLoading(false);
    onClose();
  }, [previewUrl, onClose]);

  return (
    <Modal open={open} onClose={handleClose} title={fileName} size="xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{fileAsset.originalFilename}</span>
          <span>·</span>
          <span>{fileAsset.mimeType || 'unknown'}</span>
          <span>·</span>
          <span>{fileAsset.sizeBytes} bytes</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Icon name="spinner" className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Cargando vista previa...</span>
          </div>
        )}

        {!loading && category === 'other' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name="file" className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">Vista previa no disponible para este tipo de archivo</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={handleDownload}>
              Descargar
            </Button>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <Button variant="secondary" size="sm" className="mt-3" onClick={handleDownload}>
              Descargar
            </Button>
          </div>
        )}

        {!loading && !error && category !== 'other' && (
          <div className="space-y-3">
            {category === 'text' && previewData && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 max-h-96 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">{previewData}</pre>
              </div>
            )}

            {!loading && previewUrl && (category === 'pdf' || category === 'image') && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                {category === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Image preview"
                    className="max-h-[600px] w-full object-contain"
                  />
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                Descargar
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && !previewUrl && !previewData && category !== 'other' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Icon name="file" className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Haz clic en "Abrir" para previsualizar</p>
            <Button size="sm" className="mt-3" onClick={handleOpenPreview}>
              Abrir
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
