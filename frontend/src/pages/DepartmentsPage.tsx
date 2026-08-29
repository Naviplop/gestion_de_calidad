import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { Department, DepartmentListItem } from '../lib/auth/auth.service';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listDepartments({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
      });
      setDepartments(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const parentDepartmentId = formData.get('parentDepartmentId') as string;

    try {
      await authApiClient.createDepartment({
        name,
        description: description || undefined,
        parentDepartmentId: parentDepartmentId || undefined,
      });
      setShowCreateModal(false);
      loadDepartments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create department');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const isActive = formData.get('isActive') === 'true';

    try {
      await authApiClient.updateDepartment(selectedDepartment.id, {
        name,
        description: description || undefined,
        isActive,
      });
      setSelectedDepartment(null);
      loadDepartments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update department');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await authApiClient.deactivateDepartment(id);
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate department');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          Create Department
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
          placeholder="Search departments..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleSearch}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Search
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{dept.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{dept.parentDepartmentName || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${dept.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => authApiClient.getDepartment(dept.id).then(r => setSelectedDepartment(r.data))}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    {dept.isActive && (
                      <button
                        onClick={() => handleDeactivate(dept.id)}
                        className="ml-4 text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    )}
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
            <h2 className="mb-4 text-lg font-semibold">Create Department</h2>
            {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input name="name" required maxLength={150} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" maxLength={500} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Parent Department ID</label>
                <input name="parentDepartmentId" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setFormError(null); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit Department</h2>
            {formError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input name="name" required maxLength={150} defaultValue={selectedDepartment.name} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" maxLength={500} rows={3} defaultValue={selectedDepartment.description || ''} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Active</label>
                <select name="isActive" defaultValue={selectedDepartment.isActive ? 'true' : 'false'} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setSelectedDepartment(null); setFormError(null); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
