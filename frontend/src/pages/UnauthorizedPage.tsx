import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-semibold text-red-900">Acceso Denegado</h1>
          <p className="mt-2 text-sm text-red-700">
            No tiene permiso para acceder a este recurso.
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
