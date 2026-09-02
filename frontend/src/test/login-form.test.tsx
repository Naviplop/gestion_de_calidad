import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} error={null} />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText(/contraseña/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
  });

  it('should display error message', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} error="Invalid credentials" />);

    expect(screen.getByText('Invalid credentials')).toBeDefined();
  });

  it('should disable button when loading', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={true} error={null} />);

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
  });
});
