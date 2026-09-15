import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const userFullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario';

  return (
    <header
      className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6"
    >
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 qms-transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Abrir menú de navegación"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
      )}

      <div className="hidden flex-1 items-center md:flex">
        <div className="relative max-w-md flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Buscar en el sistema..."
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 qms-transition focus:border-slate-300 focus:bg-white focus:outline-none"
            aria-label="Buscar en el sistema"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-md p-1.5 qms-transition hover:bg-slate-100"
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <Avatar name={userFullName} email={user?.email} size="sm" />
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">{userFullName}</span>
            <Icon name="chevron-down" className="hidden h-3.5 w-3.5 text-slate-400 sm:inline" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-56 origin-top-right animate-fade-in rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-slate-900">{userFullName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/organization');
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
              >
                <Icon name="building" className="h-4 w-4 text-slate-400" />
                Organización
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/security');
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
              >
                <Icon name="shield-check" className="h-4 w-4 text-slate-400" />
                Seguridad
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
              >
                <Icon name="logout" className="h-4 w-4 text-slate-400" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
