import { describe, it, expect } from 'vitest';
import {
  selectUsers,
  summarize,
  usersToCsv,
  matchesSearch,
  displayName,
  type AdminUser,
} from '../admin-users';

const NOW = new Date('2026-09-28T12:00:00Z').getTime();

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: 'id',
  email: 'x@test.fr',
  first_name: null,
  last_name: null,
  company_name: null,
  phone: null,
  city: null,
  is_active: true,
  cobranding_enabled: false,
  created_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-09-27T00:00:00Z',
  email_confirmed: true,
  providers: ['email'],
  quota_limit: 50,
  quota_used: 0,
  project_count: 0,
  role: 'client',
  ...overrides,
});

const users = [
  user({ id: 'a', email: 'ana@schindler.fr', first_name: 'Ana', last_name: 'Martin', company_name: 'Schindler', quota_used: 45, project_count: 3 }),
  user({ id: 'b', email: 'bob@otis.fr', company_name: 'Otis', is_active: false, created_at: '2026-06-01T00:00:00Z' }),
  user({ id: 'c', email: 'chloe@van.fr', first_name: 'Chloé', email_confirmed: false, last_sign_in_at: null, created_at: '2026-09-01T00:00:00Z' }),
  user({ id: 'd', email: 'admin@dica.fr', role: 'admin', last_sign_in_at: '2026-07-01T00:00:00Z', project_count: 10 }),
];

const select = (opts: Partial<Parameters<typeof selectUsers>[1]>) =>
  selectUsers(users, { search: '', filter: 'all', sort: 'recent', now: NOW, ...opts }).map((u) => u.id);

describe('admin-users', () => {
  it('recherche sur nom, email et société, sans accents ni casse', () => {
    expect(select({ search: 'schind' })).toEqual(['a']);
    expect(select({ search: 'CHLOE' })).toEqual(['c']);
    expect(matchesSearch(users[1], '  ')).toBe(true);
  });

  it('filtre par statut', () => {
    expect(select({ filter: 'disabled' })).toEqual(['b']);
    expect(select({ filter: 'unconfirmed' })).toEqual(['c']);
    expect(select({ filter: 'quota' })).toEqual(['a']);
    expect(select({ filter: 'never' })).toEqual(['c']);
    expect(select({ filter: 'admins' })).toEqual(['d']);
    expect(select({ filter: 'dormant' }).sort()).toEqual(['c', 'd']);
  });

  it('trie selon le critère choisi', () => {
    expect(select({ sort: 'recent' })).toEqual(['c', 'b', 'a', 'd']);
    expect(select({ sort: 'quota' })[0]).toBe('a');
    expect(select({ sort: 'projects' })[0]).toBe('d');
    expect(select({ sort: 'name' })[0]).toBe('d');
  });

  it('résume les comptes par filtre', () => {
    expect(summarize(users, NOW)).toMatchObject({ all: 4, active: 3, disabled: 1, unconfirmed: 1, quota: 1, admins: 1 });
  });

  it('exporte un CSV compatible Excel', () => {
    const csv = usersToCsv([users[0]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const [header, row] = csv.slice(1).split('\n');
    expect(header.split(';')).toContain('Société');
    expect(row).toContain('Ana;Martin;ana@schindler.fr;Schindler');
    expect(usersToCsv([user({ company_name: 'A; "B"' })])).toContain('"A; ""B"""');
  });

  it("affiche l'email à défaut de nom", () => {
    expect(displayName(users[1])).toBe('bob@otis.fr');
    expect(displayName(users[0])).toBe('Ana Martin');
  });
});
