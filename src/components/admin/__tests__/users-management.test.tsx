import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { AdminUser } from '@/lib/admin-users';

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { UsersManagement } from '../users-management';

const base: AdminUser = {
  id: 'u1',
  email: 'ana@schindler.fr',
  first_name: 'Ana',
  last_name: 'Martin',
  company_name: 'Schindler',
  phone: null,
  city: 'Lyon',
  is_active: true,
  cobranding_enabled: false,
  created_at: '2026-09-01T00:00:00Z',
  last_sign_in_at: new Date().toISOString(),
  email_confirmed: true,
  providers: ['email'],
  quota_limit: 50,
  quota_used: 45,
  project_count: 3,
  role: 'client',
};

const users: AdminUser[] = [
  base,
  { ...base, id: 'u2', email: 'bob@otis.fr', first_name: null, last_name: null, company_name: 'Otis', is_active: false, quota_used: 0 },
  { ...base, id: 'u3', email: 'chloe@van.fr', first_name: 'Chloé', last_name: null, company_name: null, email_confirmed: false, quota_used: 0 },
];

describe('UsersManagement', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { users }, error: null });
  });

  it('charge et affiche tous les comptes avec la synthèse', async () => {
    render(<UsersManagement />);
    expect(await screen.findByText('Ana Martin')).toBeInTheDocument();
    expect(screen.getAllByText('bob@otis.fr', { selector: 'p' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Non confirmé')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('get-users-admin', { body: { action: 'list_users' } });
  });

  it('filtre les comptes par la recherche', async () => {
    render(<UsersManagement />);
    await screen.findByText('Ana Martin');
    fireEvent.change(screen.getByPlaceholderText(/Rechercher/), { target: { value: 'otis' } });
    await waitFor(() => expect(screen.queryByText('Ana Martin')).not.toBeInTheDocument());
    expect(screen.getAllByText('bob@otis.fr', { selector: 'p' }).length).toBeGreaterThan(0);
  });

  it('filtre via les cartes de synthèse', async () => {
    render(<UsersManagement />);
    await screen.findByText('Ana Martin');
    fireEvent.click(screen.getByRole('button', { name: /Quota ≥ 80 %/ }));
    await waitFor(() => expect(screen.queryByText('Chloé')).not.toBeInTheDocument());
    expect(screen.getByText('Ana Martin')).toBeInTheDocument();
  });

  it("affiche un état vide si aucun compte ne correspond", async () => {
    render(<UsersManagement />);
    await screen.findByText('Ana Martin');
    fireEvent.change(screen.getByPlaceholderText(/Rechercher/), { target: { value: 'zzz' } });
    expect(await screen.findByText(/Aucun compte ne correspond/)).toBeInTheDocument();
  });
});
