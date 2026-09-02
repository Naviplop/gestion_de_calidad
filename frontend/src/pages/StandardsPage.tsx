import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Standard, StandardListItem, StandardRequirementListItem } from '../lib/auth/auth.service';

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
      setError(err instanceof Error ? err.message : 'Error al cargar los estándares');
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
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles del estándar');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Normativas</h1>
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
          placeholder="Buscar normativas..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleSearch}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Buscar
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Versión</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                   Cargando...
                </td>
              </tr>
            ) : standards.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron normativas.
                </td>
              </tr>
            ) : (
              standards.map((std) => (
                <tr key={std.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{std.code}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{std.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{std.version || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${std.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {std.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button onClick={() => openStandard(std)} className="text-indigo-600 hover:text-indigo-900">Ver</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedStandard && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{selectedStandard.name} — Requisitos</h2>
            <button onClick={() => { setSelectedStandard(null); setRequirements([]); }} className="text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
          <p className="mt-1 text-sm text-gray-500">{selectedStandard.description}</p>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cláusula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                  {requirements.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No se encontraron requisitos.
                    </td>
                  </tr>
                ) : (
                  requirements.map((req) => (
                    <tr key={req.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{req.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{req.title}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{req.clause || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
