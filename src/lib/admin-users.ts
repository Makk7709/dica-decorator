/**
 * @fileoverview Logique de la gestion des comptes (admin) : recherche, filtres,
 * tri, synthèse et export CSV. Fonctions pures, sans I/O.
 */

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  cobranding_enabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  providers: string[];
  quota_limit: number;
  quota_used: number;
  project_count: number;
  role: 'admin' | 'client';
}

export type UserFilter =
  | 'all'
  | 'active'
  | 'disabled'
  | 'unconfirmed'
  | 'quota'
  | 'dormant'
  | 'never'
  | 'admins';

export type UserSort = 'recent' | 'last_sign_in' | 'quota' | 'projects' | 'name';

export const QUOTA_ALERT_RATIO = 0.8;
export const DORMANT_DAYS = 30;
const DAY_MS = 86_400_000;

export const FILTER_LABELS: Record<UserFilter, string> = {
  all: 'Tous les comptes',
  active: 'Comptes actifs',
  disabled: 'Comptes désactivés',
  unconfirmed: 'Email non confirmé',
  quota: 'Quota ≥ 80 %',
  dormant: `Sans connexion depuis ${DORMANT_DAYS} j`,
  never: 'Jamais connectés',
  admins: 'Administrateurs',
};

export const SORT_LABELS: Record<UserSort, string> = {
  recent: 'Inscription la plus récente',
  last_sign_in: 'Dernière connexion',
  quota: 'Quota le plus consommé',
  projects: 'Nombre de projets',
  name: 'Nom (A → Z)',
};

export function displayName(u: AdminUser): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return full || u.email;
}

export function quotaRatio(u: AdminUser): number {
  return u.quota_limit > 0 ? u.quota_used / u.quota_limit : 0;
}

export function isDormant(u: AdminUser, now: number): boolean {
  if (!u.last_sign_in_at) return true;
  return now - new Date(u.last_sign_in_at).getTime() > DORMANT_DAYS * DAY_MS;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function matchesSearch(u: AdminUser, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = [u.email, u.first_name, u.last_name, u.company_name, u.phone, u.city]
    .filter(Boolean)
    .join(' ');
  return normalize(haystack).includes(q);
}

export function matchesFilter(u: AdminUser, filter: UserFilter, now: number): boolean {
  switch (filter) {
    case 'active': return u.is_active;
    case 'disabled': return !u.is_active;
    case 'unconfirmed': return !u.email_confirmed;
    case 'quota': return quotaRatio(u) >= QUOTA_ALERT_RATIO;
    case 'dormant': return u.is_active && isDormant(u, now);
    case 'never': return !u.last_sign_in_at;
    case 'admins': return u.role === 'admin';
    default: return true;
  }
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const COMPARATORS: Record<UserSort, (a: AdminUser, b: AdminUser) => number> = {
  recent: (a, b) => time(b.created_at) - time(a.created_at),
  last_sign_in: (a, b) => time(b.last_sign_in_at) - time(a.last_sign_in_at),
  quota: (a, b) => quotaRatio(b) - quotaRatio(a) || b.quota_used - a.quota_used,
  projects: (a, b) => b.project_count - a.project_count,
  name: (a, b) => displayName(a).localeCompare(displayName(b), 'fr'),
};

export function selectUsers(
  users: AdminUser[],
  { search, filter, sort, now }: { search: string; filter: UserFilter; sort: UserSort; now: number },
): AdminUser[] {
  return users
    .filter((u) => matchesSearch(u, search) && matchesFilter(u, filter, now))
    .sort(COMPARATORS[sort]);
}

export function summarize(users: AdminUser[], now: number): Record<UserFilter, number> {
  const counts = Object.fromEntries(Object.keys(FILTER_LABELS).map((k) => [k, 0])) as Record<UserFilter, number>;
  for (const u of users) {
    for (const f of Object.keys(counts) as UserFilter[]) {
      if (matchesFilter(u, f, now)) counts[f] += 1;
    }
  }
  return counts;
}

const csvCell = (v: string | number | boolean | null) => {
  const s = v === null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

/** CSV séparé par `;` avec BOM pour une ouverture directe dans Excel (FR). */
export function usersToCsv(users: AdminUser[]): string {
  const header = [
    'Prénom', 'Nom', 'Email', 'Société', 'Téléphone', 'Ville', 'Rôle', 'Statut', 'Email confirmé',
    'Connexion', 'Inscrit le', 'Dernière connexion', 'Projets', 'Quota utilisé', 'Quota', 'Co-branding',
  ];
  const rows = users.map((u) => [
    u.first_name, u.last_name, u.email, u.company_name, u.phone, u.city,
    u.role === 'admin' ? 'Admin' : 'Client',
    u.is_active ? 'Actif' : 'Désactivé',
    u.email_confirmed ? 'Oui' : 'Non',
    u.providers.includes('google') ? 'Google' : 'Email',
    csvDate(u.created_at), csvDate(u.last_sign_in_at),
    u.project_count, u.quota_used, u.quota_limit,
    u.cobranding_enabled ? 'Oui' : 'Non',
  ]);
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
}
