/**
 * @fileoverview Agrégation des analytics admin (fonction pure, sans I/O).
 *
 * Reçoit les lignes brutes chargées par l'edge function get-analytics et
 * produit l'ensemble des indicateurs du dashboard /admin/analytics.
 * Les regroupements temporels se font en heure de Paris.
 *
 * @author KOREV AI
 */

// ============================================================================
// Types d'entrée
// ============================================================================

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "year";
export type Granularity = "day" | "week" | "month";
export type TrendDirection = "up" | "down" | "stable";

export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "year"];

export interface ProfileRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  is_active: boolean | null;
}

export interface AuthUserRow {
  id: string;
  last_sign_in_at: string | null;
}

export interface QuotaRow {
  user_id: string;
  quota_used: number;
  quota_limit: number;
}

export interface DecorRow {
  id: string;
  name: string;
  reference_code: string;
  category: string | null;
  is_active: boolean;
}

export interface ProjectRow {
  user_id: string | null;
  created_at: string;
  use_case: string | null;
}

/** Événement rattaché à un utilisateur (photo, favori, création IA...). */
export interface UserEventRow {
  user_id: string | null;
  created_at: string;
}

export interface RenderRow extends UserEventRow {
  decor_id: string | null;
}

export interface AnalyticsInput {
  now: Date;
  period: AnalyticsPeriod;
  excludeAdmins: boolean;
  adminIds: string[];
  profiles: ProfileRow[];
  authUsers: AuthUserRow[];
  quotas: QuotaRow[];
  decors: DecorRow[];
  /** Lignes à partir de window.previousStart */
  projects: ProjectRow[];
  photos: UserEventRow[];
  renders: RenderRow[];
  favorites: UserEventRow[];
  aiCreations: UserEventRow[];
  creativeFavorites: UserEventRow[];
}

// ============================================================================
// Types de sortie
// ============================================================================

export interface Kpi {
  value: number;
  previous: number;
  percentageChange: number;
  direction: TrendDirection;
}

export interface TimeseriesPoint {
  key: string;
  label: string;
  renders: number;
  projects: number;
  photos: number;
  signups: number;
  activeUsers: number;
  favorites: number;
  aiCreations: number;
}

export interface FunnelStep {
  key: string;
  label: string;
  users: number;
  pctOfTotal: number;
  pctOfPrevious: number;
}

export interface DecorStat {
  id: string;
  name: string;
  code: string;
  category: string;
  renders: number;
  previous: number;
  share: number;
  users: number;
  percentageChange: number;
  direction: TrendDirection;
}

// Alias (et non interface) pour rester assignable aux props recharts indexées.
export type NamedValue = {
  name: string;
  value: number;
};

export interface UserStat {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  renders: number;
  projects: number;
  photos: number;
  favorites: number;
  aiCreations: number;
  activeDays: number;
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  quotaUsed: number | null;
  quotaLimit: number | null;
}

export interface CompanyStat {
  name: string;
  renders: number;
  projects: number;
  users: number;
}

export interface QuotaAlert {
  id: string;
  name: string;
  company: string | null;
  used: number;
  limit: number;
  pct: number;
}

export interface AnalyticsResponse {
  meta: {
    period: AnalyticsPeriod;
    granularity: Granularity;
    timezone: string;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    excludeAdmins: boolean;
    excludedAdminCount: number;
    generatedAt: string;
  };
  kpis: {
    signups: Kpi;
    activeUsers: Kpi;
    projects: Kpi;
    photos: Kpi;
    renders: Kpi;
    favorites: Kpi;
    aiCreations: Kpi;
    activationRate: Kpi;
    rendersPerActiveUser: Kpi;
    favoriteRate: Kpi;
  };
  totals: {
    users: number;
    enabledAccounts: number;
    activeDecors: number;
    neverRendered: number;
    signedInLast7d: number;
    signedInLast30d: number;
    dormant30d: number;
  };
  timeseries: TimeseriesPoint[];
  weekdayActivity: NamedValue[];
  hourActivity: NamedValue[];
  funnel: FunnelStep[];
  decors: {
    top: DecorStat[];
    rising: DecorStat[];
    categories: NamedValue[];
    useCases: NamedValue[];
    usedCount: number;
    unusedCount: number;
    unused: Array<{ id: string; name: string; code: string; category: string }>;
  };
  users: {
    segments: { new: number; returning: number; reactivated: number; lost: number };
    top: UserStat[];
    companies: CompanyStat[];
    quotaAlerts: QuotaAlert[];
  };
}

// ============================================================================
// Dates (Europe/Paris)
// ============================================================================

export const ANALYTICS_TIMEZONE = "Europe/Paris";
const DAY_MS = 86_400_000;
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ANALYTICS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

interface ParisParts {
  y: number;
  m: number;
  d: number;
  hour: number;
  weekday: number; // 0 = lundi
}

export function parisParts(date: Date): ParisParts {
  const parts: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) parts[p.type] = p.value;
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    hour: Number(parts.hour),
    weekday: WEEKDAYS_EN.indexOf(parts.weekday),
  };
}

/** Instant UTC correspondant à 00:00 heure de Paris pour la date civile donnée. */
function parisMidnight(y: number, m: number, d: number): Date {
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offsetHours = parisParts(new Date(utcMidnight)).hour;
  return new Date(utcMidnight - offsetHours * 3_600_000);
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKeyOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export interface AnalyticsWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  granularity: Granularity;
}

/**
 * Fenêtre courante alignée sur minuit (Paris) + fenêtre de comparaison.
 * Périodes glissantes : comparées à la durée équivalente juste avant.
 * "year" : comparée à la même plage de l'année précédente.
 */
export function computeWindow(period: AnalyticsPeriod, now: Date): AnalyticsWindow {
  const today = parisParts(now);
  const end = now;

  if (period === "year") {
    const start = parisMidnight(today.y, 1, 1);
    const previousStart = parisMidnight(today.y - 1, 1, 1);
    const previousEnd = new Date(previousStart.getTime() + (end.getTime() - start.getTime()));
    return { start, end, previousStart, previousEnd, granularity: "month" };
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const first = new Date(Date.UTC(today.y, today.m - 1, today.d - (days - 1), 12));
  const start = parisMidnight(first.getUTCFullYear(), first.getUTCMonth() + 1, first.getUTCDate());
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  return { start, end, previousStart, previousEnd, granularity: period === "90d" ? "week" : "day" };
}

function bucketKeyFromCivil(y: number, m: number, d: number, g: Granularity): string {
  if (g === "month") return `${y}-${pad(m)}`;
  if (g === "week") {
    const noon = new Date(Date.UTC(y, m - 1, d, 12));
    const isoDay = noon.getUTCDay() || 7;
    const monday = new Date(noon.getTime() - (isoDay - 1) * DAY_MS);
    return dayKeyOf(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
  }
  return dayKeyOf(y, m, d);
}

export function bucketKey(date: Date, g: Granularity): string {
  const p = parisParts(date);
  return bucketKeyFromCivil(p.y, p.m, p.d, g);
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === "month") {
    const [y, m] = key.split("-").map(Number);
    return monthFormatter.format(new Date(Date.UTC(y, m - 1, 15)));
  }
  const [, m, d] = key.split("-");
  return g === "week" ? `sem. ${d}/${m}` : `${d}/${m}`;
}

function buildBuckets(win: AnalyticsWindow): string[] {
  const s = parisParts(win.start);
  const e = parisParts(win.end);
  const last = Date.UTC(e.y, e.m - 1, e.d, 12);
  const keys: string[] = [];
  for (let t = Date.UTC(s.y, s.m - 1, s.d, 12); t <= last; t += DAY_MS) {
    const c = new Date(t);
    const k = bucketKeyFromCivil(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate(), win.granularity);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}

// ============================================================================
// Helpers numériques
// ============================================================================

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, total: number) => (total > 0 ? round1((part / total) * 100) : 0);

export function compareKpi(value: number, previous: number): Kpi {
  let percentageChange: number;
  if (previous > 0) percentageChange = round1(((value - previous) / previous) * 100);
  else percentageChange = value > 0 ? 100 : 0;

  let direction: TrendDirection = "stable";
  if (percentageChange > 1) direction = "up";
  else if (percentageChange < -1) direction = "down";

  return { value: round1(value), previous: round1(previous), percentageChange, direction };
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const USE_CASE_LABELS: Record<string, string> = {
  ascenseur: "Ascenseur",
  van: "Van",
  terrasse: "Terrasse",
  autre: "Autre",
};

function toNamedValues(counts: Map<string, number>): NamedValue[] {
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function increment<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

// ============================================================================
// Agrégation principale
// ============================================================================

type EventKind = "project" | "photo" | "render" | "favorite" | "aiCreation" | "creative";

interface TimedEvent {
  kind: EventKind;
  userId: string | null;
  at: number;
}

interface UserActivity {
  renders: number;
  projects: number;
  photos: number;
  favorites: number;
  aiCreations: number;
  days: Set<string>;
  last: number;
}

interface Context {
  input: AnalyticsInput;
  win: AnalyticsWindow;
  inCurrent: (t: number) => boolean;
  inPrevious: (t: number) => boolean;
  adminSet: Set<string>;
  profiles: ProfileRow[];
  profileById: Map<string, ProfileRow>;
  quotaByUser: Map<string, QuotaRow>;
  lastSignIn: Map<string, string | null>;
  decorById: Map<string, DecorRow>;
  events: TimedEvent[];
  renders: RenderRow[];
  projects: ProjectRow[];
}

const ts = (iso: string) => new Date(iso).getTime();

function buildContext(input: AnalyticsInput): Context {
  const win = computeWindow(input.period, input.now);
  const startMs = win.start.getTime();
  const endMs = win.end.getTime();
  const prevStartMs = win.previousStart.getTime();
  const prevEndMs = win.previousEnd.getTime();

  const adminSet = new Set(input.adminIds);
  const keep = (userId: string | null) => !(input.excludeAdmins && !!userId && adminSet.has(userId));

  const sources: Array<[EventKind, UserEventRow[]]> = [
    ["project", input.projects],
    ["photo", input.photos],
    ["render", input.renders],
    ["favorite", input.favorites],
    ["aiCreation", input.aiCreations],
    ["creative", input.creativeFavorites],
  ];
  const events: TimedEvent[] = sources.flatMap(([kind, rows]) =>
    rows.filter((r) => keep(r.user_id)).map((r) => ({ kind, userId: r.user_id, at: ts(r.created_at) }))
  );

  const profiles = input.profiles.filter((p) => keep(p.id));
  return {
    input,
    win,
    inCurrent: (t) => t >= startMs && t <= endMs,
    inPrevious: (t) => t >= prevStartMs && t < prevEndMs,
    adminSet,
    profiles,
    profileById: new Map(profiles.map((p) => [p.id, p])),
    quotaByUser: new Map(input.quotas.map((q) => [q.user_id, q])),
    lastSignIn: new Map(input.authUsers.map((u) => [u.id, u.last_sign_in_at])),
    decorById: new Map(input.decors.map((d) => [d.id, d])),
    events,
    renders: input.renders.filter((r) => keep(r.user_id)),
    projects: input.projects.filter((p) => keep(p.user_id)),
  };
}

function countKind(ctx: Context, kind: EventKind, inWindow: (t: number) => boolean): number {
  return ctx.events.reduce((n, e) => (e.kind === kind && inWindow(e.at) ? n + 1 : n), 0);
}

function activeUsersIn(ctx: Context, inWindow: (t: number) => boolean): Set<string> {
  const set = new Set<string>();
  for (const e of ctx.events) if (e.userId && inWindow(e.at)) set.add(e.userId);
  return set;
}

/** Nombre d'utilisateurs de la liste ayant généré au moins un rendu avant `until`. */
function countRenderedBefore(ctx: Context, users: ProfileRow[], until: number): number {
  const ids = new Set(users.map((p) => p.id));
  const done = new Set<string>();
  for (const r of ctx.renders) {
    if (r.user_id && ids.has(r.user_id) && ts(r.created_at) <= until) done.add(r.user_id);
  }
  return done.size;
}

interface Cohorts {
  activeCurrent: Set<string>;
  activePrevious: Set<string>;
  signupsCurrent: ProfileRow[];
  signupsPrevious: ProfileRow[];
}

function buildCohorts(ctx: Context): Cohorts {
  return {
    activeCurrent: activeUsersIn(ctx, ctx.inCurrent),
    activePrevious: activeUsersIn(ctx, ctx.inPrevious),
    signupsCurrent: ctx.profiles.filter((p) => ctx.inCurrent(ts(p.created_at))),
    signupsPrevious: ctx.profiles.filter((p) => ctx.inPrevious(ts(p.created_at))),
  };
}

function computeKpis(ctx: Context, c: Cohorts): AnalyticsResponse["kpis"] {
  const cur = (k: EventKind) => countKind(ctx, k, ctx.inCurrent);
  const prev = (k: EventKind) => countKind(ctx, k, ctx.inPrevious);
  const rendersCur = cur("render");
  const rendersPrev = prev("render");
  const favCur = cur("favorite");
  const favPrev = prev("favorite");
  const perUser = (renders: number, users: number) => (users > 0 ? renders / users : 0);

  return {
    signups: compareKpi(c.signupsCurrent.length, c.signupsPrevious.length),
    activeUsers: compareKpi(c.activeCurrent.size, c.activePrevious.size),
    projects: compareKpi(cur("project"), prev("project")),
    photos: compareKpi(cur("photo"), prev("photo")),
    renders: compareKpi(rendersCur, rendersPrev),
    favorites: compareKpi(favCur, favPrev),
    aiCreations: compareKpi(cur("aiCreation"), prev("aiCreation")),
    activationRate: compareKpi(
      pct(countRenderedBefore(ctx, c.signupsCurrent, ctx.win.end.getTime()), c.signupsCurrent.length),
      pct(countRenderedBefore(ctx, c.signupsPrevious, ctx.win.previousEnd.getTime() - 1), c.signupsPrevious.length),
    ),
    rendersPerActiveUser: compareKpi(
      perUser(rendersCur, c.activeCurrent.size),
      perUser(rendersPrev, c.activePrevious.size),
    ),
    favoriteRate: compareKpi(pct(favCur, rendersCur), pct(favPrev, rendersPrev)),
  };
}

const SERIES_FIELD: Partial<Record<EventKind, keyof TimeseriesPoint>> = {
  render: "renders",
  project: "projects",
  photo: "photos",
  favorite: "favorites",
  aiCreation: "aiCreations",
};

function buildRenderRhythm(ctx: Context) {
  const weekday = new Array(7).fill(0);
  const hours = new Array(24).fill(0);
  for (const e of ctx.events) {
    if (e.kind !== "render" || !ctx.inCurrent(e.at)) continue;
    const p = parisParts(new Date(e.at));
    weekday[p.weekday] += 1;
    hours[p.hour] += 1;
  }
  return {
    weekdayActivity: WEEKDAYS_FR.map((name, i) => ({ name, value: weekday[i] })),
    hourActivity: hours.map((value, h) => ({ name: `${pad(h)}h`, value })),
  };
}

function buildTimeseries(ctx: Context, signups: ProfileRow[]) {
  const g = ctx.win.granularity;
  const buckets = buildBuckets(ctx.win);
  const series = new Map<string, TimeseriesPoint>();
  const activeByBucket = new Map<string, Set<string>>();
  for (const key of buckets) {
    series.set(key, {
      key, label: bucketLabel(key, g),
      renders: 0, projects: 0, photos: 0, signups: 0, activeUsers: 0, favorites: 0, aiCreations: 0,
    });
    activeByBucket.set(key, new Set());
  }

  for (const e of ctx.events) {
    if (!ctx.inCurrent(e.at)) continue;
    const key = bucketKey(new Date(e.at), g);
    const point = series.get(key);
    if (!point) continue;
    const field = SERIES_FIELD[e.kind];
    if (field) (point[field] as number) += 1;
    if (e.userId) activeByBucket.get(key)!.add(e.userId);
  }
  for (const p of signups) {
    const point = series.get(bucketKey(new Date(p.created_at), g));
    if (point) point.signups += 1;
  }
  for (const [key, set] of activeByBucket) series.get(key)!.activeUsers = set.size;

  return buckets.map((k) => series.get(k)!);
}

const ACTIVITY_FIELD: Partial<Record<EventKind, keyof Omit<UserActivity, "days" | "last">>> = {
  render: "renders",
  project: "projects",
  photo: "photos",
  favorite: "favorites",
  aiCreation: "aiCreations",
};

function collectUserActivity(ctx: Context): Map<string, UserActivity> {
  const activity = new Map<string, UserActivity>();
  for (const e of ctx.events) {
    if (!e.userId || !ctx.inCurrent(e.at)) continue;
    let a = activity.get(e.userId);
    if (!a) {
      a = { renders: 0, projects: 0, photos: 0, favorites: 0, aiCreations: 0, days: new Set(), last: 0 };
      activity.set(e.userId, a);
    }
    const field = ACTIVITY_FIELD[e.kind];
    if (field) a[field] += 1;
    const p = parisParts(new Date(e.at));
    a.days.add(dayKeyOf(p.y, p.m, p.d));
    a.last = Math.max(a.last, e.at);
  }
  return activity;
}

function buildFunnel(cohort: string[], activity: Map<string, UserActivity>): FunnelStep[] {
  const has = (pred: (a: UserActivity) => boolean) =>
    cohort.filter((id) => {
      const a = activity.get(id);
      return !!a && pred(a);
    }).length;

  const raw: Array<[string, string, number]> = [
    ["signup", "Inscription", cohort.length],
    ["project", "Projet créé", has((a) => a.projects > 0)],
    ["photo", "Photo importée", has((a) => a.photos > 0)],
    ["render", "Rendu généré", has((a) => a.renders > 0)],
    ["favorite", "Rendu mis en favori", has((a) => a.favorites > 0)],
    ["recurring", "Revenu un autre jour", has((a) => a.days.size >= 2)],
  ];
  return raw.map(([key, label, users], i) => ({
    key,
    label,
    users,
    pctOfTotal: pct(users, cohort.length),
    pctOfPrevious: pct(users, i === 0 ? cohort.length : raw[i - 1][2]),
  }));
}

function tallyDecorRenders(ctx: Context) {
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  const users = new Map<string, Set<string>>();
  const categories = new Map<string, number>();

  for (const r of ctx.renders) {
    const t = ts(r.created_at);
    if (ctx.inPrevious(t) && r.decor_id) increment(previous, r.decor_id);
    if (!ctx.inCurrent(t)) continue;

    const decor = r.decor_id ? ctx.decorById.get(r.decor_id) : undefined;
    increment(categories, decor ? capitalize(decor.category || "autre") : "Sans décor catalogue");
    if (!r.decor_id) continue;
    increment(current, r.decor_id);
    if (!r.user_id) continue;
    const set = users.get(r.decor_id) ?? new Set<string>();
    set.add(r.user_id);
    users.set(r.decor_id, set);
  }
  return { current, previous, users, categories };
}

function countUseCases(ctx: Context): NamedValue[] {
  const useCases = new Map<string, number>();
  for (const p of ctx.projects) {
    if (!ctx.inCurrent(ts(p.created_at))) continue;
    const uc = p.use_case ?? "autre";
    increment(useCases, USE_CASE_LABELS[uc] ?? capitalize(uc));
  }
  return toNamedValues(useCases);
}

function buildDecorStats(ctx: Context): AnalyticsResponse["decors"] {
  const { current, previous, users, categories } = tallyDecorRenders(ctx);

  const rendersWithDecor = [...current.values()].reduce((a, b) => a + b, 0);
  const stat = (id: string): DecorStat => {
    const d = ctx.decorById.get(id);
    const cur = current.get(id) ?? 0;
    const prev = previous.get(id) ?? 0;
    const cmp = compareKpi(cur, prev);
    return {
      id,
      name: d?.name ?? "Décor supprimé",
      code: d?.reference_code ?? "",
      category: capitalize(d?.category || "autre"),
      renders: cur,
      previous: prev,
      share: pct(cur, rendersWithDecor),
      users: users.get(id)?.size ?? 0,
      percentageChange: cmp.percentageChange,
      direction: cmp.direction,
    };
  };

  const top = [...current.keys()]
    .map(stat)
    .sort((a, b) => b.renders - a.renders || a.name.localeCompare(b.name))
    .slice(0, 10);
  const rising = [...new Set([...current.keys(), ...previous.keys()])]
    .map(stat)
    .filter((d) => d.renders > d.previous)
    .sort((a, b) => b.renders - b.previous - (a.renders - a.previous))
    .slice(0, 5);

  const unused = ctx.input.decors
    .filter((d) => d.is_active && !current.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, code: d.reference_code, category: capitalize(d.category || "autre") }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    top,
    rising,
    categories: toNamedValues(categories),
    useCases: countUseCases(ctx),
    usedCount: current.size,
    unusedCount: unused.length,
    unused: unused.slice(0, 50),
  };
}

function displayName(ctx: Context, id: string): string {
  const p = ctx.profileById.get(id);
  const full = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return full || p?.company_name || p?.email || "Utilisateur";
}

function buildSegments(c: Cohorts): AnalyticsResponse["users"]["segments"] {
  const signupIds = new Set(c.signupsCurrent.map((p) => p.id));
  const segments = { new: 0, returning: 0, reactivated: 0, lost: 0 };
  for (const id of c.activeCurrent) {
    if (signupIds.has(id)) segments.new++;
    else if (c.activePrevious.has(id)) segments.returning++;
    else segments.reactivated++;
  }
  for (const id of c.activePrevious) if (!c.activeCurrent.has(id)) segments.lost++;
  return segments;
}

function buildTopUsers(ctx: Context, activity: Map<string, UserActivity>): UserStat[] {
  return [...activity.entries()]
    .filter(([id]) => ctx.profileById.has(id))
    .map(([id, a]) => {
      const p = ctx.profileById.get(id)!;
      const q = ctx.quotaByUser.get(id);
      return {
        id,
        name: displayName(ctx, id),
        company: p.company_name,
        email: p.email,
        renders: a.renders,
        projects: a.projects,
        photos: a.photos,
        favorites: a.favorites,
        aiCreations: a.aiCreations,
        activeDays: a.days.size,
        lastActivityAt: a.last ? new Date(a.last).toISOString() : null,
        lastSignInAt: ctx.lastSignIn.get(id) ?? null,
        quotaUsed: q?.quota_used ?? null,
        quotaLimit: q?.quota_limit ?? null,
      };
    })
    .sort((a, b) => b.renders - a.renders || b.projects - a.projects || b.activeDays - a.activeDays)
    .slice(0, 20);
}

function buildCompanies(ctx: Context, activity: Map<string, UserActivity>): CompanyStat[] {
  const companies = new Map<string, CompanyStat>();
  for (const [id, a] of activity) {
    const p = ctx.profileById.get(id);
    if (!p) continue;
    const name = p.company_name?.trim() || "Non renseignée";
    const c = companies.get(name) ?? { name, renders: 0, projects: 0, users: 0 };
    c.renders += a.renders;
    c.projects += a.projects;
    c.users += 1;
    companies.set(name, c);
  }
  return [...companies.values()]
    .sort((a, b) => b.renders - a.renders || b.users - a.users)
    .slice(0, 10);
}

function buildQuotaAlerts(ctx: Context): QuotaAlert[] {
  const alerts: QuotaAlert[] = [];
  for (const p of ctx.profiles) {
    const q = ctx.quotaByUser.get(p.id);
    if (!q || q.quota_limit <= 0 || q.quota_used / q.quota_limit < 0.8) continue;
    alerts.push({
      id: p.id,
      name: displayName(ctx, p.id),
      company: p.company_name,
      used: q.quota_used,
      limit: q.quota_limit,
      pct: pct(q.quota_used, q.quota_limit),
    });
  }
  return alerts.sort((a, b) => b.pct - a.pct).slice(0, 10);
}

function buildTotals(ctx: Context): AnalyticsResponse["totals"] {
  const nowMs = ctx.input.now.getTime();
  const signedInWithin = (days: number) =>
    ctx.profiles.filter((p) => {
      const s = ctx.lastSignIn.get(p.id);
      return !!s && nowMs - ts(s) <= days * DAY_MS;
    }).length;
  const signedIn30 = signedInWithin(30);

  return {
    users: ctx.profiles.length,
    enabledAccounts: ctx.profiles.filter((p) => p.is_active !== false).length,
    activeDecors: ctx.input.decors.filter((d) => d.is_active).length,
    neverRendered: ctx.profiles.filter((p) => (ctx.quotaByUser.get(p.id)?.quota_used ?? 0) === 0).length,
    signedInLast7d: signedInWithin(7),
    signedInLast30d: signedIn30,
    dormant30d: ctx.profiles.length - signedIn30,
  };
}

export function aggregateAnalytics(input: AnalyticsInput): AnalyticsResponse {
  const ctx = buildContext(input);
  const cohorts = buildCohorts(ctx);
  const activity = collectUserActivity(ctx);

  return {
    meta: {
      period: input.period,
      granularity: ctx.win.granularity,
      timezone: ANALYTICS_TIMEZONE,
      start: ctx.win.start.toISOString(),
      end: ctx.win.end.toISOString(),
      previousStart: ctx.win.previousStart.toISOString(),
      previousEnd: ctx.win.previousEnd.toISOString(),
      excludeAdmins: input.excludeAdmins,
      excludedAdminCount: input.excludeAdmins ? ctx.adminSet.size : 0,
      generatedAt: input.now.toISOString(),
    },
    kpis: computeKpis(ctx, cohorts),
    totals: buildTotals(ctx),
    timeseries: buildTimeseries(ctx, cohorts.signupsCurrent),
    ...buildRenderRhythm(ctx),
    funnel: buildFunnel(cohorts.signupsCurrent.map((p) => p.id), activity),
    decors: buildDecorStats(ctx),
    users: {
      segments: buildSegments(cohorts),
      top: buildTopUsers(ctx, activity),
      companies: buildCompanies(ctx, activity),
      quotaAlerts: buildQuotaAlerts(ctx),
    },
  };
}
