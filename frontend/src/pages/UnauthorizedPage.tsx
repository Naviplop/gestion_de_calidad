import { useAuth } from '../contexts/AuthContext';

export function UnauthorizedPage() {
  const logout = useAuth((state) => state.logout);

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
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold text-red-900">Access Denied</h1>
          <p className="mt-2 text-sm text-red-700">
            You don't have permission to access this resource.
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
