import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = decodeJwtPayload(token);
    
    if (!payload?.sub || typeof payload.sub !== "string") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking role for user:", user.id);
    
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Role check result:", { role: roleData?.role, error: roleError?.message });

    if (roleError || roleData?.role !== "admin") {
      console.error("Not admin:", { role: roleData?.role, error: roleError?.message });
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required", userRole: roleData?.role }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Admin access granted, fetching analytics...");

    const { period = "30d" } = await req.json().catch(() => ({ period: "30d" }));
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get total metrics
    const { count: totalProjects } = await supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: totalRenders } = await supabaseAdmin
      .from("render_results")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: activeUsers } = await supabaseAdmin
      .from("projects")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: totalDecors } = await supabaseAdmin
      .from("decors")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Calculate average renders per project
    const avgRendersPerProject = totalProjects && totalRenders 
      ? Math.round(totalRenders / totalProjects) 
      : 0;

    // Calculate engagement rate
    const engagementRate = totalUsers && activeUsers
      ? Math.round((activeUsers / totalUsers) * 100)
      : 0;

    // Get daily trends for renders
    const { data: renderTrends } = await supabaseAdmin
      .from("render_results")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Get daily trends for projects
    const { data: projectTrends } = await supabaseAdmin
      .from("projects")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Group by date
    const groupByDate = (data: any[]) => {
      const grouped: Record<string, number> = {};
      data?.forEach((item) => {
        const date = new Date(item.created_at).toLocaleDateString("fr-FR");
        grouped[date] = (grouped[date] || 0) + 1;
      });
      return Object.entries(grouped).map(([date, value]) => ({ date, value }));
    };

    const rendersData = groupByDate(renderTrends || []);
    const projectsData = groupByDate(projectTrends || []);

    // Get top decors
    const { data: topDecorsData } = await supabaseAdmin
      .from("render_results")
      .select("decor_id, decors(name, reference_code)")
      .not("decor_id", "is", null)
      .gte("created_at", startDate.toISOString());

    const decorCounts: Record<string, { name: string; code: string; count: number }> = {};
    topDecorsData?.forEach((item: any) => {
      if (item.decor_id && item.decors) {
        if (!decorCounts[item.decor_id]) {
          decorCounts[item.decor_id] = {
            name: item.decors.name,
            code: item.decors.reference_code,
            count: 0,
          };
        }
        decorCounts[item.decor_id].count++;
      }
    });

    const topDecors = Object.entries(decorCounts)
      .map(([id, data]) => ({ id, name: data.name, code: data.code, value: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Get top users (query projects then profiles separately — no FK relationship)
    const { data: topUsersData, error: topUsersError } = await supabaseAdmin
      .from("projects")
      .select("user_id")
      .gte("created_at", startDate.toISOString());

    if (topUsersError) {
      console.error("Top users query error:", topUsersError.message);
    }

    const userCounts: Record<string, { name: string; count: number }> = {};
    (topUsersData || []).forEach((item: any) => {
      if (!item.user_id) return;
      if (!userCounts[item.user_id]) {
        userCounts[item.user_id] = { name: "Utilisateur", count: 0 };
      }
      userCounts[item.user_id].count++;
    });

    const userIds = Object.keys(userCounts);
    if (userIds.length > 0) {
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      (profilesData || []).forEach((p: any) => {
        if (userCounts[p.id]) {
          const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          if (fullName) userCounts[p.id].name = fullName;
        }
      });
    }

    const topUsers = Object.entries(userCounts)
      .map(([id, data]) => ({ id, name: data.name, value: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);


    // Get usage by category
    const { data: categoryData } = await supabaseAdmin
      .from("render_results")
      .select("decors(category)")
      .gte("created_at", startDate.toISOString());

    const categoryCounts: Record<string, number> = {};
    categoryData?.forEach((item: any) => {
      const category = item.decors?.category || "autre";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const usageData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    const response = {
      metrics: {
        totalProjects: totalProjects || 0,
        totalRenders: totalRenders || 0,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalDecors: totalDecors || 0,
        avgRendersPerProject,
        engagementRate,
      },
      trends: {
        renders: {
          data: rendersData,
          direction: rendersData.length > 1 && rendersData[rendersData.length - 1].value > rendersData[0].value ? "up" : "stable",
          percentageChange: 0,
        },
        projects: {
          data: projectsData,
          direction: projectsData.length > 1 && projectsData[projectsData.length - 1].value > projectsData[0].value ? "up" : "stable",
          percentageChange: 0,
        },
        users: {
          data: [],
          direction: "stable",
          percentageChange: 0,
        },
      },
      topDecors,
      topUsers,
      usageData,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-analytics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
