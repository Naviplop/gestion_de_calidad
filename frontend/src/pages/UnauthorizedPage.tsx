import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

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
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Icon name="shield" className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-2 text-sm text-slate-500">
          No tiene permisos para acceder a este recurso. Si cree que es un error, contacte al administrador de su organización.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/')}>Ir al inicio</Button>
          <Button variant="danger" onClick={handleLogout}>Cerrar sesión</Button>
        </div>
      </div>
    </div>
  );
}
