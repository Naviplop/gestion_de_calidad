import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from './Icon';
import { Avatar } from './Avatar';

interface NavItem {
  name: string;
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Panel de control', href: '/', icon: 'home' },
      { name: 'Documentos', href: '/documents', icon: 'document' },
      { name: 'Auditorías', href: '/audits', icon: 'clipboard' },
      { name: 'Hallazgos', href: '/audits?tab=findings', icon: 'flag' },
      { name: 'No conformidades', href: '/nonconformities', icon: 'warning' },
      { name: 'Riesgos', href: '/risks', icon: 'shield' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { name: 'Usuarios', href: '/users', icon: 'users' },
      { name: 'Organización', href: '/organization', icon: 'building' },
      { name: 'Departamentos', href: '/departments', icon: 'building' },
      { name: 'Procesos', href: '/processes', icon: 'cog' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Registros de auditoría', href: '/audit-logs', icon: 'clipboard' },
      { name: 'Eventos de seguridad', href: '/security', icon: 'key' },
      { name: 'Configuración de seguridad', href: '/security', icon: 'shield-check' },
    ],
  },
];

export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onClose?.();
  };

  const userFullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario';
  const orgName = user?.tenant?.name || 'Sin organización';

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white"
      aria-label="Navegación principal"
    >
      {/* Brand */}
      <div className="flex h-[60px] items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
          <Icon name="shield-check" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">QMS Platform</p>
          <p className="truncate text-xs text-slate-500">ISO 9001 / 27001</p>
        </div>
      </div>

      {/* Organization */}
      <div className="border-b border-slate-200 px-3 py-3">
        <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Organización</p>
        <div className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
            {orgName.slice(0, 2).toUpperCase()}
          </div>
          <span className="truncate text-sm font-medium text-slate-700">{orgName}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={`${group.title}-${item.name}`}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium qms-transition ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          name={item.icon}
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
                        />
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <Avatar name={userFullName} email={user?.email} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{userFullName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-1.5 text-slate-400 qms-transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
