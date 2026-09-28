/**
 * @fileoverview Tests de rendu des onglets du dashboard analytics
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { aggregateAnalytics } from '../../../../supabase/functions/_shared/analytics-aggregate.ts';
import { OverviewTab } from '../overview-tab';
import { DecorsTab } from '../decors-tab';
import { UsersTab } from '../users-tab';

const data = aggregateAnalytics({
  now: new Date('2026-09-28T19:30:00Z'),
  period: '30d',
  excludeAdmins: true,
  adminIds: [],
  profiles: [
    { id: 'u1', created_at: '2026-09-20T08:00:00Z', first_name: 'Ana', last_name: 'Martin', company_name: 'Schindler', email: 'ana@schindler.fr', is_active: true },
  ],
  authUsers: [{ id: 'u1', last_sign_in_at: '2026-09-27T08:00:00Z' }],
  quotas: [{ user_id: 'u1', quota_used: 45, quota_limit: 50 }],
  decors: [
    { id: 'd1', name: 'Chêne Naturel', reference_code: 'CH-01', category: 'bois', is_active: true },
    { id: 'd2', name: 'Marbre Blanc', reference_code: 'MA-01', category: 'pierre', is_active: true },
  ],
  projects: [{ user_id: 'u1', created_at: '2026-09-20T09:00:00Z', use_case: 'ascenseur' }],
  photos: [{ user_id: 'u1', created_at: '2026-09-20T09:05:00Z' }],
  renders: [{ user_id: 'u1', decor_id: 'd1', created_at: '2026-09-20T09:10:00Z' }],
  favorites: [],
  aiCreations: [],
  creativeFavorites: [],
});

describe('onglets analytics', () => {
  it("affiche l'entonnoir et les segments", () => {
    render(<OverviewTab data={data} isLoading={false} />);
    expect(screen.getByText("Entonnoir d'activation")).toBeInTheDocument();
    expect(screen.getByText('Rendu généré')).toBeInTheDocument();
    expect(screen.getByText('Nouveaux')).toBeInTheDocument();
  });

  it('affiche le classement et les décors inutilisés', () => {
    render(<DecorsTab data={data} isLoading={false} />);
    expect(screen.getAllByText('Chêne Naturel').length).toBeGreaterThan(0);
    expect(screen.getByText('Marbre Blanc')).toBeInTheDocument();
    expect(screen.getByText(/1 décors utilisés sur 2 actifs/)).toBeInTheDocument();
  });

  it('affiche les utilisateurs, sociétés et alertes quota', () => {
    render(<UsersTab data={data} isLoading={false} />);
    expect(screen.getAllByText('Ana Martin').length).toBe(2);
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getAllByText('Schindler').length).toBeGreaterThan(0);
  });

  it('gère le chargement sans données', () => {
    render(<UsersTab data={null} isLoading />);
    render(<DecorsTab data={null} isLoading />);
    render(<OverviewTab data={null} isLoading />);
    expect(screen.getAllByText(/Utilisateurs les plus actifs|Top 10 des décors/).length).toBeGreaterThan(0);
  });
});
