import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function authenticateAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { status: 401, message: "Unauthorized - No auth header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: userError } = await authClient.auth.getClaims(token);
  
  if (userError || !claimsData?.claims) {
    throw { status: 401, message: "Unauthorized - Invalid token" };
  }

  const userId = claimsData.claims.sub;

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (roleError || roleData?.role !== "admin") {
    throw { status: 403, message: "Forbidden: Admin access required" };
  }

  return { supabaseAdmin, adminUserId: userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseAdmin, adminUserId } = await authenticateAdmin(req);

    // ====== DELETE: Supprimer un utilisateur désactivé ======
    if (req.method === "DELETE") {
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-deletion
      if (userId === adminUserId) {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check the user is deactivated first
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

      // Delete user from auth (cascades to profiles, roles, quotas via FK)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      console.log("User deleted:", userId);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== PATCH: Modifier le rôle d'un utilisateur ======
    if (req.method === "PATCH") {
      const { userId, role } = await req.json();
      
      if (!userId || !role || !["admin", "client"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "userId and role (admin/client) are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-demotion
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

    // ====== GET: Lister les utilisateurs ======
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
