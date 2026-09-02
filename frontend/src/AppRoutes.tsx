import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="processes" element={<ProcessesPage />} />
        <Route path="standards" element={<StandardsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="audits" element={<AuditsPage />} />
        <Route path="audit-programs" element={<AuditProgramsPage />} />
        <Route path="nonconformities" element={<NonconformitiesPage />} />
        <Route path="risks" element={<RiskManagementPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="security" element={<SecuritySettingsPage />} />
        <Route path="organization" element={<OrganizationSettingsPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
