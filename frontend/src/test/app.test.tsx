import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { App } from '../App';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>
  );
};

describe('Foundation - Frontend App Shell', () => {
  it('should render login form when not authenticated', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('QMS Platform')).toBeDefined();
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeDefined();
  });

  it('should render sign in button', () => {
    renderWithRouter(<App />);
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
  });

  it('should render footer with enterprise label', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('Sistema de Gestión de Calidad — Enterprise')).toBeDefined();
  });
});
