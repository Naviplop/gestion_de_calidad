import { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import type { UserListItem, UserDetail } from '../lib/auth/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Avatar } from '../components/ui/Avatar';

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const openEditUser = async (user: UserListItem) => {
    try {
      const response = await authApiClient.getUser(user.id);
      setSelectedUser(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles del usuario');
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApiClient.listUsers({
        page: meta.page,
        pageSize: meta.pageSize,
        search: search || undefined,
      });
      setUsers(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setMeta((prev) => ({ ...prev, page: 1 }));
    loadUsers();
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios de tu organización, asigna roles y estado."
        breadcrumbs={[{ label: 'Administración', href: '/organization' }, { label: 'Usuarios' }]}
        actions={
          <Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Nuevo usuario</Button>
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
              placeholder="Buscar por nombre o correo..."
              leftIcon="search"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} leftIcon="search">Buscar</Button>
        </div>

        {loading ? (
          <LoadingState message="Cargando usuarios..." />
        ) : users.length === 0 ? (
          <EmptyState
            icon="users"
            title="No hay usuarios registrados"
            description="Crea el primer usuario para comenzar a gestionar el acceso al sistema."
            action={<Button onClick={() => setShowCreateModal(true)} leftIcon="plus">Crear usuario</Button>}
          />
        ) : (
          <>
            <Table
              rowKey={(u) => u.id}
              columns={[
                {
                  key: 'name',
                  header: 'Usuario',
                  render: (u) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={`${u.firstName} ${u.lastName}`} email={u.email} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'department', header: 'Departamento', render: (u) => u.department?.name || '—' },
                { key: 'status', header: 'Estado', width: '120px', render: (u) => <StatusPill status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  key: 'mfa',
                  header: 'MFA',
                  width: '100px',
                  render: (u) => <StatusPill status={u.mfaEnabled ? 'ENABLED' : 'DISABLED'} />,
                },
                {
                  key: 'actions',
                  header: '',
                  width: '100px',
                  align: 'right',
                  render: (u) => (
                    <Button variant="ghost" size="sm" onClick={() => openEditUser(u)} leftIcon="edit">
                      Editar
                    </Button>
                  ),
                },
              ]}
              data={users}
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
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={loadUsers} />
      )}

      {selectedUser && (
        <EditUserModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdated={loadUsers} />
      )}
    </>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApiClient.createUser({
        email,
        password,
        firstName,
        lastName,
        roleIds: [],
        mfaEnabled,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Crear usuario"
      description="Registra un nuevo usuario en la organización."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="create-user-form" loading={loading}>Crear usuario</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} helperText="Mínimo 12 caracteres" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={mfaEnabled}
            onChange={(e) => setMfaEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900"
          />
          <span className="text-sm text-slate-700">Habilitar MFA</span>
        </label>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onUpdated }: { user: UserDetail; onClose: () => void; onUpdated: () => void }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApiClient.updateUser(user.id, { firstName, lastName, isActive });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar usuario"
      description={`${user.firstName} ${user.lastName} · ${user.email}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="edit-user-form" loading={loading}>Guardar cambios</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900"
          />
          <span className="text-sm text-slate-700">Usuario activo</span>
        </label>
      </form>
    </Modal>
  );
}
