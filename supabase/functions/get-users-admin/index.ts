import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bannissement Supabase Auth appliqué aux comptes désactivés : bloque la
// connexion et le renouvellement de session côté serveur (~100 ans).
const DEACTIVATED_BAN = "876000h";
const MAX_QUOTA = 100_000;
const PAGE_SIZE = 1000;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Ctx {
  admin: SupabaseClient;
  adminUserId: string;
  body: Record<string, unknown>;
}

async function authenticateAdmin(req: Request) {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Non autorisé - Header manquant");
  }

  // Vérifie cryptographiquement le JWT via le serveur Auth (signature + expiration).
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    throw new HttpError(401, "Non autorisé - Token invalide");
  }

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    throw new HttpError(403, "Accès admin requis");
  }

  return { supabaseAdmin, adminUserId: user.id };
}

function requireUserId(body: Record<string, unknown>): string {
  const { userId } = body;
  if (typeof userId !== "string" || !userId) throw new HttpError(400, "userId is required");
  return userId;
}

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function fetchAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

async function readProfile<K extends string>(admin: SupabaseClient, userId: string, columns: K) {
  const { data, error } = await admin.from("profiles").select(columns).eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

async function setActive(admin: SupabaseClient, userId: string, active: boolean) {
  const { error: updateError } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (updateError) throw updateError;

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : DEACTIVATED_BAN,
  });
  if (banError) throw banError;
}

// ============================================================================
// Actions
// ============================================================================

async function listUsers({ admin }: Ctx) {
  const [authUsers, profiles, quotas, roles, projects] = await Promise.all([
    fetchAllAuthUsers(admin),
    fetchAll((f, t) =>
      admin.from("profiles")
        .select("id, first_name, last_name, company_name, phone, city, is_active, cobranding_enabled")
        .order("id").range(f, t)
    ),
    fetchAll((f, t) => admin.from("user_quotas").select("user_id, quota_limit, quota_used").order("id").range(f, t)),
    fetchAll((f, t) => admin.from("user_roles").select("user_id, role").order("id").range(f, t)),
    fetchAll((f, t) => admin.from("projects").select("user_id").order("id").range(f, t)),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const quotaById = new Map(quotas.map((q) => [q.user_id, q]));
  const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));
  const projectCounts = new Map<string, number>();
  for (const p of projects) projectCounts.set(p.user_id, (projectCounts.get(p.user_id) ?? 0) + 1);

  // Comptes désactivés avant la mise en place du bannissement Auth.
  const now = Date.now();
  const unbannedDeactivated = authUsers.filter((u) => {
    const bannedUntil = (u as User & { banned_until?: string | null }).banned_until;
    return profileById.get(u.id)?.is_active === false && !(bannedUntil && Date.parse(bannedUntil) > now);
  });
  await Promise.all(unbannedDeactivated.map((u) => setActive(admin, u.id, false)));

  const users = authUsers.map((u) => {
    const profile = profileById.get(u.id);
    const quota = quotaById.get(u.id);
    return {
      id: u.id,
      email: u.email || "",
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      company_name: profile?.company_name ?? null,
      phone: profile?.phone ?? null,
      city: profile?.city ?? null,
      is_active: profile?.is_active ?? true,
      cobranding_enabled: profile?.cobranding_enabled ?? false,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed: !!u.email_confirmed_at,
      providers: [...new Set((u.identities ?? []).map((i) => i.provider))],
      quota_limit: quota?.quota_limit ?? 50,
      quota_used: quota?.quota_used ?? 0,
      project_count: projectCounts.get(u.id) ?? 0,
      role: adminIds.has(u.id) ? "admin" : "client",
    };
  });

  return json({ users });
}

async function confirmUser({ admin, body }: Ctx) {
  const userId = requireUserId(body);
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
  return json({ success: true });
}

async function sendPasswordReset({ admin, body }: Ctx) {
  const userId = requireUserId(body);
  const { data: target, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !target?.user?.email) throw getErr ?? new Error("Utilisateur introuvable");
  const { error: resetErr } = await admin.auth.resetPasswordForEmail(target.user.email, {
    redirectTo: "https://www.dicadecor.fr/reset-password",
  });
  if (resetErr) throw resetErr;
  const googleOnly = (target.user.identities ?? []).every((i) => i.provider !== "email");
  return json({ success: true, googleOnly });
}

async function deleteUser({ admin, adminUserId, body }: Ctx) {
  const userId = requireUserId(body);
  if (userId === adminUserId) throw new HttpError(400, "Vous ne pouvez pas supprimer votre propre compte");

  const profile = await readProfile(admin, userId, "is_active");
  if (profile?.is_active) {
    throw new HttpError(400, "Seuls les comptes désactivés peuvent être supprimés");
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return json({ success: true });
}

async function toggleActive({ admin, adminUserId, body }: Ctx) {
  const userId = requireUserId(body);
  const profile = await readProfile(admin, userId, "is_active");
  const newStatus = !(profile?.is_active ?? true);
  if (!newStatus && userId === adminUserId) {
    throw new HttpError(400, "Vous ne pouvez pas désactiver votre propre compte");
  }
  await setActive(admin, userId, newStatus);
  return json({ success: true, is_active: newStatus });
}

async function toggleCobranding({ admin, body }: Ctx) {
  const userId = requireUserId(body);
  const profile = await readProfile(admin, userId, "cobranding_enabled");
  const newValue = !(profile?.cobranding_enabled ?? false);
  const { error } = await admin.from("profiles").update({ cobranding_enabled: newValue }).eq("id", userId);
  if (error) throw error;
  return json({ success: true, cobranding_enabled: newValue });
}

async function updateRole({ admin, adminUserId, body }: Ctx) {
  const userId = requireUserId(body);
  const { role } = body;
  if (role !== "admin" && role !== "client") throw new HttpError(400, "role (admin/client) is required");
  if (userId === adminUserId && role !== "admin") {
    throw new HttpError(400, "Vous ne pouvez pas retirer votre propre rôle admin");
  }

  // Un seul rôle par utilisateur. Le nouveau est posé avant de retirer l'ancien
  // pour ne jamais laisser le compte sans rôle en cas d'échec intermédiaire.
  const { error: upsertError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (upsertError) throw upsertError;
  const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", userId).neq("role", role);
  if (deleteError) throw deleteError;
  return json({ success: true });
}

async function updateQuota({ admin, body }: Ctx) {
  const userId = requireUserId(body);
  const { quotaLimit, resetUsed } = body;
  const changes: Record<string, number> = {};

  if (quotaLimit !== undefined) {
    if (typeof quotaLimit !== "number" || !Number.isInteger(quotaLimit) || quotaLimit < 0 || quotaLimit > MAX_QUOTA) {
      throw new HttpError(400, `Le quota doit être un entier entre 0 et ${MAX_QUOTA}`);
    }
    changes.quota_limit = quotaLimit;
  }
  if (resetUsed === true) changes.quota_used = 0;
  if (Object.keys(changes).length === 0) throw new HttpError(400, "Aucune modification demandée");

  const { data, error } = await admin
    .from("user_quotas")
    .upsert({ user_id: userId, ...changes }, { onConflict: "user_id" })
    .select("quota_limit, quota_used")
    .single();
  if (error) throw error;
  return json({ success: true, ...data });
}

const ACTIONS: Record<string, (ctx: Ctx) => Promise<Response>> = {
  list_users: listUsers,
  confirm_user: confirmUser,
  send_password_reset: sendPasswordReset,
  delete_user: deleteUser,
  toggle_active: toggleActive,
  toggle_cobranding: toggleCobranding,
  update_role: updateRole,
  update_quota: updateQuota,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseAdmin, adminUserId } = await authenticateAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "list_users";
    const handler = ACTIONS[action];
    if (!handler) throw new HttpError(400, `Action inconnue : ${action}`);

    return await handler({ admin: supabaseAdmin, adminUserId, body });
  } catch (error: unknown) {
    // Les erreurs Supabase Auth admin peuvent porter un champ `status` HTTP.
    const errStatus =
      typeof error === "object" && error !== null && "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;
    const errMessage =
      typeof error === "object" && error !== null && "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Unknown error";
    console.error("Error in get-users-admin:", errMessage);
    return json({ error: errMessage }, errStatus);
  }
});
