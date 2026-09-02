import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Standard, StandardListItem, StandardRequirementListItem } from '../lib/auth/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';

export function StandardsPage() {
  const [standards, setStandards] = useState<StandardListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<Standard | null>(null);
  const [requirements, setRequirements] = useState<StandardRequirementListItem[]>([]);

  const loadStandards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listStandards({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
      });
      setStandards(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las normativas');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search]);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadStandards();
  };

  const openStandard = async (standard: StandardListItem) => {
    try {
      const response = await authApiClient.getStandard(standard.id);
      setSelectedStandard(response.data);
      const reqResponse = await authApiClient.getStandardRequirements(standard.id, { page: 1, pageSize: 25 });
      setRequirements(reqResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles de la normativa');
    }
  };

  return (
    <>
      <PageHeader
        title="Normativas"
        description="Catálogo de estándares ISO y requisitos aplicables al sistema de gestión."
        breadcrumbs={[{ label: 'Administración' }, { label: 'Normativas' }]}
      />

      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Buscar por código o nombre..." leftIcon="search" />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando normativas..." />
        ) : standards.length === 0 ? (
          <EmptyState icon="clipboard" title="No hay normativas registradas" description="No se encontraron normativas en el sistema." />
        ) : (
          <>
            <Table
              rowKey={(s) => s.id}
              columns={[
                { key: 'code', header: 'Código', width: '120px', render: (s) => <span className="font-mono text-xs font-semibold text-slate-900">{s.code}</span> },
                { key: 'name', header: 'Nombre', render: (s) => <span className="text-sm font-medium text-slate-900">{s.name}</span> },
                { key: 'version', header: 'Versión', width: '100px', render: (s) => s.version || '—' },
                { key: 'status', header: 'Estado', width: '120px', render: (s) => <StatusPill status={s.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  key: 'actions', header: '', align: 'right', width: '80px',
                  render: (s) => <Button variant="ghost" size="sm" onClick={() => openStandard(s)} rightIcon="chevron-right">Ver</Button>,
                },
              ]}
              data={standards}
              onRowClick={(s) => openStandard(s)}
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

      {selectedStandard && (
        <Modal
          open
          onClose={() => { setSelectedStandard(null); setRequirements([]); }}
          title={`${selectedStandard.name} — Requisitos`}
          description={selectedStandard.description ?? ''}
          size="xl"
          footer={<Button onClick={() => { setSelectedStandard(null); setRequirements([]); }}>Cerrar</Button>}
        >
          {requirements.length === 0 ? (
            <EmptyState icon="clipboard" title="No hay requisitos" description="Esta normativa no tiene requisitos asociados." />
          ) : (
            <Table
              rowKey={(r) => r.id}
              columns={[
                { key: 'code', header: 'Código', width: '100px', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
                { key: 'title', header: 'Título', render: (r) => <span className="text-sm text-slate-900">{r.title}</span> },
                { key: 'clause', header: 'Cláusula', width: '120px', render: (r) => r.clause || '—' },
              ]}
              data={requirements}
            />
          )}
        </Modal>
      )}
    </>
  );
}
