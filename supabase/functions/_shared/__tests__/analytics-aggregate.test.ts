/**
 * @fileoverview Tests de l'agrégation des analytics admin.
 *
 * @author KOREV AI
 */

import { describe, it, expect } from 'vitest';

import {
  aggregateAnalytics,
  bucketKey,
  compareKpi,
  computeWindow,
  type AnalyticsInput,
} from '../analytics-aggregate.ts';

// Lundi 28 septembre 2026, 21:30 à Paris (UTC+2)
const NOW = new Date('2026-09-28T19:30:00Z');

const profile = (id: string, created_at: string, extra: Partial<AnalyticsInput['profiles'][number]> = {}) => ({
  id,
  created_at,
  first_name: null,
  last_name: null,
  company_name: null,
  email: `${id}@test.fr`,
  is_active: true,
  ...extra,
});

const baseInput = (overrides: Partial<AnalyticsInput> = {}): AnalyticsInput => ({
  now: NOW,
  period: '7d',
  excludeAdmins: true,
  adminIds: [],
  profiles: [],
  authUsers: [],
  quotas: [],
  decors: [],
  projects: [],
  photos: [],
  renders: [],
  favorites: [],
  aiCreations: [],
  creativeFavorites: [],
  ...overrides,
});

describe('computeWindow', () => {
  it('aligne la période glissante sur minuit heure de Paris', () => {
    const w = computeWindow('7d', NOW);
    // 22/09 00:00 Paris = 21/09 22:00 UTC
    expect(w.start.toISOString()).toBe('2026-09-21T22:00:00.000Z');
    expect(w.previousEnd.toISOString()).toBe(w.start.toISOString());
    expect(w.start.getTime() - w.previousStart.getTime()).toBe(NOW.getTime() - w.start.getTime());
    expect(w.granularity).toBe('day');
  });

  it("compare 'year' à la même plage de l'année précédente", () => {
    const w = computeWindow('year', NOW);
    expect(w.start.toISOString()).toBe('2025-12-31T23:00:00.000Z');
    expect(w.previousStart.toISOString()).toBe('2024-12-31T23:00:00.000Z');
    expect(w.granularity).toBe('month');
  });

  it('utilise une granularité hebdomadaire sur 90 jours', () => {
    expect(computeWindow('90d', NOW).granularity).toBe('week');
  });
});

describe('bucketKey', () => {
  it('range un événement tardif UTC dans le jour de Paris suivant', () => {
    expect(bucketKey(new Date('2026-09-27T23:30:00Z'), 'day')).toBe('2026-09-28');
  });

  it('regroupe par lundi de la semaine ISO', () => {
    expect(bucketKey(new Date('2026-09-27T10:00:00Z'), 'week')).toBe('2026-09-21');
  });
});

describe('compareKpi', () => {
  it('calcule la variation et la direction', () => {
    expect(compareKpi(15, 10)).toMatchObject({ percentageChange: 50, direction: 'up' });
    expect(compareKpi(5, 10)).toMatchObject({ percentageChange: -50, direction: 'down' });
    expect(compareKpi(3, 0)).toMatchObject({ percentageChange: 100, direction: 'up' });
    expect(compareKpi(0, 0)).toMatchObject({ percentageChange: 0, direction: 'stable' });
  });
});

describe('aggregateAnalytics', () => {
  const decors = [
    { id: 'd1', name: 'Chêne', reference_code: 'C1', category: 'bois', is_active: true },
    { id: 'd2', name: 'Marbre', reference_code: 'M1', category: 'pierre', is_active: true },
    { id: 'd3', name: 'Béton', reference_code: 'B1', category: 'minéral', is_active: true },
  ];

  it("exclut les comptes admin de toutes les métriques", () => {
    const input = baseInput({
      adminIds: ['admin'],
      profiles: [profile('admin', '2026-09-25T10:00:00Z'), profile('u1', '2026-09-25T10:00:00Z')],
      renders: [
        { user_id: 'admin', decor_id: 'd1', created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-26T10:00:00Z' },
      ],
      decors,
    });

    const excluded = aggregateAnalytics(input);
    expect(excluded.kpis.renders.value).toBe(1);
    expect(excluded.kpis.signups.value).toBe(1);
    expect(excluded.totals.users).toBe(1);
    expect(excluded.meta.excludedAdminCount).toBe(1);

    const included = aggregateAnalytics({ ...input, excludeAdmins: false });
    expect(included.kpis.renders.value).toBe(2);
    expect(included.totals.users).toBe(2);
  });

  it('compare la période courante à la précédente', () => {
    const result = aggregateAnalytics(baseInput({
      renders: [
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-27T10:00:00Z' },
        { user_id: 'u2', decor_id: 'd2', created_at: '2026-09-18T10:00:00Z' },
      ],
      decors,
    }));

    expect(result.kpis.renders).toMatchObject({ value: 2, previous: 1, direction: 'up' });
    expect(result.kpis.activeUsers).toMatchObject({ value: 1, previous: 1 });
    expect(result.users.segments).toEqual({ new: 0, returning: 0, reactivated: 1, lost: 1 });
  });

  it('remplit la série temporelle jour par jour, trous à zéro', () => {
    const result = aggregateAnalytics(baseInput({
      renders: [{ user_id: 'u1', decor_id: null, created_at: '2026-09-27T23:30:00Z' }],
    }));

    expect(result.timeseries).toHaveLength(7);
    expect(result.timeseries[0].label).toBe('22/09');
    expect(result.timeseries[6]).toMatchObject({ key: '2026-09-28', renders: 1, activeUsers: 1 });
    expect(result.timeseries.slice(0, 6).every((p) => p.renders === 0)).toBe(true);
    expect(result.weekdayActivity[0]).toEqual({ name: 'Lun', value: 1 });
    expect(result.hourActivity[1]).toEqual({ name: '01h', value: 1 });
  });

  it("construit l'entonnoir d'activation sur la cohorte des inscrits", () => {
    const result = aggregateAnalytics(baseInput({
      profiles: [
        profile('u1', '2026-09-23T08:00:00Z'),
        profile('u2', '2026-09-23T08:00:00Z'),
        profile('old', '2026-01-01T08:00:00Z'),
      ],
      projects: [
        { user_id: 'u1', created_at: '2026-09-23T09:00:00Z', use_case: 'ascenseur' },
        { user_id: 'u2', created_at: '2026-09-23T09:00:00Z', use_case: 'van' },
      ],
      photos: [{ user_id: 'u1', created_at: '2026-09-23T09:05:00Z' }],
      renders: [
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-23T09:10:00Z' },
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-25T09:10:00Z' },
      ],
      decors,
    }));

    expect(result.funnel.map((s) => s.users)).toEqual([2, 2, 1, 1, 0, 1]);
    expect(result.funnel[2].pctOfPrevious).toBe(50);
    expect(result.kpis.activationRate.value).toBe(50);
    expect(result.decors.useCases).toEqual(
      expect.arrayContaining([{ name: 'Ascenseur', value: 1 }, { name: 'Van', value: 1 }]),
    );
  });

  it('classe les décors, calcule les parts et liste les décors inutilisés', () => {
    const result = aggregateAnalytics(baseInput({
      renders: [
        { user_id: 'u1', decor_id: 'd1', created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u2', decor_id: 'd1', created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u1', decor_id: 'd2', created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u1', decor_id: 'd2', created_at: '2026-09-18T10:00:00Z' },
        { user_id: 'u1', decor_id: 'd2', created_at: '2026-09-18T11:00:00Z' },
        { user_id: 'u1', decor_id: null, created_at: '2026-09-26T10:00:00Z' },
      ],
      decors,
    }));

    expect(result.decors.top[0]).toMatchObject({ id: 'd1', renders: 2, share: 66.7, users: 2 });
    expect(result.decors.top[1]).toMatchObject({ id: 'd2', renders: 1, previous: 2, direction: 'down' });
    expect(result.decors.rising.map((d) => d.id)).toEqual(['d1']);
    expect(result.decors.unused.map((d) => d.id)).toEqual(['d3']);
    expect(result.decors.categories).toEqual(
      expect.arrayContaining([
        { name: 'Bois', value: 2 },
        { name: 'Pierre', value: 1 },
        { name: 'Sans décor catalogue', value: 1 },
      ]),
    );
  });

  it('agrège les entreprises, alertes quota et connexions', () => {
    const result = aggregateAnalytics(baseInput({
      profiles: [
        profile('u1', '2026-01-01T00:00:00Z', { company_name: 'Schindler', first_name: 'Ana' }),
        profile('u2', '2026-01-01T00:00:00Z', { company_name: 'Schindler' }),
        profile('u3', '2026-01-01T00:00:00Z'),
      ],
      quotas: [
        { user_id: 'u1', quota_used: 45, quota_limit: 50 },
        { user_id: 'u2', quota_used: 10, quota_limit: 50 },
        { user_id: 'u3', quota_used: 0, quota_limit: 50 },
      ],
      authUsers: [
        { id: 'u1', last_sign_in_at: '2026-09-27T10:00:00Z' },
        { id: 'u2', last_sign_in_at: '2026-08-01T10:00:00Z' },
        { id: 'u3', last_sign_in_at: null },
      ],
      renders: [
        { user_id: 'u1', decor_id: null, created_at: '2026-09-26T10:00:00Z' },
        { user_id: 'u2', decor_id: null, created_at: '2026-09-26T10:00:00Z' },
      ],
    }));

    expect(result.users.companies[0]).toMatchObject({ name: 'Schindler', renders: 2, users: 2 });
    expect(result.users.quotaAlerts).toEqual([
      expect.objectContaining({ id: 'u1', name: 'Ana', pct: 90 }),
    ]);
    expect(result.users.top[0]).toMatchObject({ id: 'u1', quotaUsed: 45, lastSignInAt: '2026-09-27T10:00:00Z' });
    expect(result.totals).toMatchObject({
      users: 3,
      neverRendered: 1,
      signedInLast7d: 1,
      signedInLast30d: 1,
      dormant30d: 2,
    });
  });
});
