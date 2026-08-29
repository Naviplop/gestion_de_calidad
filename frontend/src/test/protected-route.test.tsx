import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

describe('ProtectedRoute', () => {
  it('should show loading when auth is loading', () => {
    render(
      <AuthProvider initialState={{ isLoading: true, isAuthenticated: false }}>
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Checking session...')).toBeDefined();
  });

  it('should render children when authenticated', () => {
    render(
      <AuthProvider initialState={{ isLoading: false, isAuthenticated: true, user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User', mfaEnabled: false, tenant: { organizationId: 'org-1', name: 'Test Org' }, roles: [] }, accessToken: 'token' }}>
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });
});