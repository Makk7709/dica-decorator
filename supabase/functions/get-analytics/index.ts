import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  aggregateAnalytics,
  ANALYTICS_PERIODS,
  computeWindow,
  type AnalyticsPeriod,
  type AuthUserRow,
  type RenderRow,
  type UserEventRow,
} from "../_shared/analytics-aggregate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// PostgREST plafonne chaque réponse (1000 lignes par défaut) : on pagine.
const PAGE_SIZE = 1000;
const MAX_ROWS = 500_000;

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAuthUsers(admin: SupabaseClient): Promise<AuthUserRow[]> {
  const users: AuthUserRow[] = [];
  for (let page = 1; page <= MAX_ROWS / PAGE_SIZE; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(error.message);
    for (const u of data.users) users.push({ id: u.id, last_sign_in_at: u.last_sign_in_at ?? null });
    if (data.users.length < PAGE_SIZE) break;
  }
  return users;
}

// PostgREST renvoie une relation embarquée sous forme d'objet ou de tableau.
type Embedded<T> = T | T[] | null | undefined;
type EmbeddedProject = Embedded<{ user_id: string | null }>;
interface EmbeddedRow {
  created_at: string;
  decor_id?: string | null;
  projects?: EmbeddedProject;
  project_photos?: Embedded<{ projects: EmbeddedProject }>;
}

const first = <T>(v: Embedded<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const embeddedUserId = (row: EmbeddedRow): string | null => {
  const project = row.project_photos === undefined ? row.projects : first(row.project_photos)?.projects;
  return first(project)?.user_id ?? null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized - No auth header" }, 401);
    }

    // Vérifie cryptographiquement le JWT via le serveur Auth (signature + expiration).
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return json({ error: "Forbidden: Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const period: AnalyticsPeriod = ANALYTICS_PERIODS.includes(body?.period) ? body.period : "30d";
    const excludeAdmins = body?.excludeAdmins !== false;

    const now = new Date();
    const since = computeWindow(period, now).previousStart.toISOString();

    const [
      adminRoles,
      profiles,
      quotas,
      decors,
      projects,
      photosRaw,
      rendersRaw,
      favorites,
      aiCreations,
      creativeFavorites,
      authUsers,
    ] = await Promise.all([
      fetchAll((f, t) =>
        supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("profiles")
          .select("id, created_at, first_name, last_name, company_name, email, is_active")
          .order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("user_quotas").select("user_id, quota_used, quota_limit").order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("decors").select("id, name, reference_code, category, is_active").order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("projects").select("user_id, created_at, use_case")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("project_photos").select("created_at, projects(user_id)")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("render_results").select("created_at, decor_id, project_photos(projects(user_id))")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("render_favorites").select("user_id, created_at")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("ai_creations").select("user_id, created_at")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAll((f, t) =>
        supabaseAdmin.from("creative_favorites").select("user_id, created_at")
          .gte("created_at", since).order("id").range(f, t)
      ),
      fetchAuthUsers(supabaseAdmin),
    ]);

    const photos: UserEventRow[] = (photosRaw as EmbeddedRow[]).map((r) => ({
      created_at: r.created_at,
      user_id: embeddedUserId(r),
    }));
    const renders: RenderRow[] = (rendersRaw as EmbeddedRow[]).map((r) => ({
      created_at: r.created_at,
      decor_id: r.decor_id ?? null,
      user_id: embeddedUserId(r),
    }));

    const response = aggregateAnalytics({
      now,
      period,
      excludeAdmins,
      adminIds: (adminRoles as Array<{ user_id: string }>).map((r) => r.user_id),
      profiles,
      authUsers,
      quotas,
      decors,
      projects,
      photos,
      renders,
      favorites,
      aiCreations,
      creativeFavorites,
    });

    return json(response);
  } catch (error) {
    console.error("Error in get-analytics:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
