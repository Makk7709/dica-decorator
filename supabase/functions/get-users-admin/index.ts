import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function authenticateAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Non autorisé - Header manquant" };
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = decodeJwtPayload(token);

  if (!payload?.sub || typeof payload.sub !== "string") {
    throw { status: 401, message: "Non autorisé - Token invalide" };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(payload.sub);

  if (userError || !user) {
    throw { status: 401, message: "Non autorisé - Utilisateur introuvable" };
  }

  const userId = user.id;

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleError || roleData?.role !== "admin") {
    throw { status: 403, message: "Accès admin requis" };
  }

  return { supabaseAdmin, adminUserId: userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseAdmin, adminUserId } = await authenticateAdmin(req);

    // For POST with action, parse the body
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list_users";

    // ====== DELETE USER ======
    if (action === "delete_user") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === adminUserId) {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .single();

      if (profile?.is_active) {
        return new Response(
          JSON.stringify({ error: "Seuls les comptes désactivés peuvent être supprimés" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      console.log("User deleted:", userId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== TOGGLE ACTIVE ======
    if (action === "toggle_active") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .single();

      const newStatus = !(profile?.is_active ?? true);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: newStatus })
        .eq("id", userId);

      if (updateError) throw updateError;

      console.log("User active toggled:", userId, "->", newStatus);
      return new Response(
        JSON.stringify({ success: true, is_active: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== TOGGLE COBRANDING ======
    if (action === "toggle_cobranding") {
      const { userId } = body;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("cobranding_enabled")
        .eq("id", userId)
        .single();

      const newValue = !(profile?.cobranding_enabled ?? false);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ cobranding_enabled: newValue })
        .eq("id", userId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, cobranding_enabled: newValue }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== UPDATE ROLE ======
    if (action === "update_role") {
      const { userId, role } = body;

      if (!userId || !role || !["admin", "client"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "userId and role (admin/client) are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userId === adminUserId && role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez pas retirer votre propre rôle admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleError) throw roleError;

      console.log("Role updated:", userId, "->", role);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== LIST USERS (default) ======
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const usersWithData = await Promise.all(
      authUsers.users.map(async (user) => {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const { data: quota } = await supabaseAdmin
          .from("user_quotas")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        const { count: projectCount } = await supabaseAdmin
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        return {
          id: user.id,
          email: user.email || "",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          is_active: profile?.is_active ?? true,
          cobranding_enabled: profile?.cobranding_enabled ?? false,
          created_at: user.created_at,
          quota_limit: quota?.quota_limit || 50,
          quota_used: quota?.quota_used || 0,
          project_count: projectCount || 0,
          role: (roleData?.role as string) || "client",
        };
      })
    );

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const status = (error as any)?.status || 500;
    const message = (error as any)?.message || (error instanceof Error ? error.message : "Unknown error");
    console.error("Error in get-users-admin:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
