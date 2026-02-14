import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Single client with service role for auth + admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user making the request is an admin
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token length:", token.length);
    
    // Validate user token with getClaims
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: userError } = await authClient.auth.getClaims(token);
    const userData = claimsData?.claims ? { user: { id: claimsData.claims.sub } } : { user: null };
    console.log("User validation:", { hasUser: !!userData?.user, error: userError?.message });
    
    if (userError || !userData.user) {
      console.error("User validation failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User ID:", userData.user.id);

    // Check if user has admin role using service role client
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    console.log("Role check:", { role: roleData?.role, error: roleError?.message });

    if (roleError || roleData?.role !== "admin") {
      console.error("Admin check failed:", { role: roleData?.role, error: roleError?.message });
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required", userRole: roleData?.role }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin access granted");

    // Fetch all users from auth.users using service role
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      throw authError;
    }

    // For each user, get their profile, quota, and project count
    const usersWithData = await Promise.all(
      authUsers.users.map(async (user) => {
        // Get profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        // Get quota
        const { data: quota } = await supabaseAdmin
          .from("user_quotas")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Count projects
        const { count: projectCount } = await supabaseAdmin
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

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
        };
      })
    );

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-users-admin:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
