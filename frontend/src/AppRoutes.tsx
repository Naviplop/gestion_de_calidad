import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UsersPage } from './pages/UsersPage';
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { ProcessesPage } from './pages/ProcessesPage';
import { StandardsPage } from './pages/StandardsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AuditProgramsPage } from './pages/AuditProgramsPage';
import { AuditsPage } from './pages/AuditsPage';
import { NonconformitiesPage } from './pages/NonconformitiesPage';
import { RiskManagementPage } from './pages/RiskManagementPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';

function Navigation() {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/users', label: 'Users' },
    { to: '/departments', label: 'Departments' },
    { to: '/processes', label: 'Processes' },
    { to: '/standards', label: 'Standards' },
    { to: '/documents', label: 'Documents' },
    { to: '/audits', label: 'Audits' },
    { to: '/audit-programs', label: 'Audit Programs' },
    { to: '/nonconformities', label: 'Nonconformities' },
    { to: '/risks', label: 'Risks' },
    { to: '/audit-logs', label: 'Audit Logs' },
    { to: '/security', label: 'Security' },
    { to: '/organization', label: 'Organization' },
  ];

  return (
    <nav className="flex items-center gap-4 text-sm text-gray-600">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={`hover:text-gray-900 ${
            location.pathname === link.to ? 'font-medium text-gray-900' : ''
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 text-gray-900">
              <header className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div className="flex h-14 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">QMS Platform</span>
                    </div>
                    <Navigation />
                  </div>
                </div>
              </header>

              <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
                <DashboardPage />
              </main>

              <footer className="border-t border-gray-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
                  QMS Platform — Core Domain Phase
                </div>
              </footer>
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/processes" element={<ProtectedRoute><ProcessesPage /></ProtectedRoute>} />
      <Route path="/standards" element={<ProtectedRoute><StandardsPage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
      <Route path="/audits" element={<ProtectedRoute><AuditsPage /></ProtectedRoute>} />
      <Route path="/audit-programs" element={<ProtectedRoute><AuditProgramsPage /></ProtectedRoute>} />
      <Route path="/nonconformities" element={<ProtectedRoute><NonconformitiesPage /></ProtectedRoute>} />
      <Route path="/risks" element={<ProtectedRoute><RiskManagementPage /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><SecuritySettingsPage /></ProtectedRoute>} />
      <Route path="/organization" element={<ProtectedRoute><OrganizationSettingsPage /></ProtectedRoute>} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
