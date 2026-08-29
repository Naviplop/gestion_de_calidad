import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>
  );
};

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByText('QMS Platform')).toBeDefined();
    expect(screen.getByText('Sign in to your account')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });
});
