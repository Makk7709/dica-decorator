import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    // Vérifie cryptographiquement le JWT via le serveur Auth (signature + expiration).
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
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

    // ------------------------------------------------------------------------
    // Fenêtre courante + fenêtre précédente (même durée) pour comparaison réelle
    // ------------------------------------------------------------------------
    const now = new Date();
    const startDate = new Date(now);

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
        // "Cette année" = depuis le 1er janvier (cohérent avec le libellé UI)
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const windowMs = now.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - windowMs);
    const startIso = startDate.toISOString();
    const prevStartIso = prevStart.toISOString();

    // Helper: nombre de lignes sur une plage [from, to)
    const countRows = async (
      table: string,
      from: string,
      to?: string
    ): Promise<number> => {
      let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true }).gte("created_at", from);
      if (to) q = q.lt("created_at", to);
      const { count } = await q;
      return count || 0;
    };

    // Helper: utilisateurs distincts ayant créé un projet sur une plage [from, to)
    const distinctActiveUsers = async (from: string, to?: string): Promise<number> => {
      let q = supabaseAdmin.from("projects").select("user_id").gte("created_at", from);
      if (to) q = q.lt("created_at", to);
      const { data } = await q;
      return new Set((data || []).map((r: any) => r.user_id).filter(Boolean)).size;
    };

    // Helper: variation en % + direction entre période courante et précédente
    const compare = (current: number, previous: number) => {
      let percentageChange: number;
      if (previous > 0) {
        percentageChange = ((current - previous) / previous) * 100;
      } else {
        percentageChange = current > 0 ? 100 : 0;
      }
      percentageChange = Math.round(percentageChange * 10) / 10;
      let direction: "up" | "down" | "stable";
      if (percentageChange > 1) direction = "up";
      else if (percentageChange < -1) direction = "down";
      else direction = "stable";
      return { percentageChange, direction };
    };

    // Métriques période courante
    const totalProjects = await countRows("projects", startIso);
    const totalRenders = await countRows("render_results", startIso);
    const activeUsers = await distinctActiveUsers(startIso);

    // Métriques période précédente (pour les tendances)
    const prevProjects = await countRows("projects", prevStartIso, startIso);
    const prevRenders = await countRows("render_results", prevStartIso, startIso);
    const prevActiveUsers = await distinctActiveUsers(prevStartIso, startIso);

    // Total utilisateurs (tous comptes confondus, indépendant de la période)
    const { count: totalUsersCount } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const totalUsers = totalUsersCount || 0;

    const { count: totalDecorsCount } = await supabaseAdmin
      .from("decors")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    const totalDecors = totalDecorsCount || 0;

    // Moyenne rendus/projet (1 décimale)
    const avgRendersPerProject = totalProjects > 0
      ? Math.round((totalRenders / totalProjects) * 10) / 10
      : 0;

    // Taux d'engagement = utilisateurs actifs distincts / total utilisateurs
    const engagementRate = totalUsers > 0
      ? Math.min(100, Math.round((activeUsers / totalUsers) * 100))
      : 0;

    const rendersComparison = compare(totalRenders, prevRenders);
    const projectsComparison = compare(totalProjects, prevProjects);
    const usersComparison = compare(activeUsers, prevActiveUsers);

    // ------------------------------------------------------------------------
    // Séries temporelles : granularité adaptée + remplissage des trous à zéro
    // ------------------------------------------------------------------------
    const granularity: "day" | "week" | "month" =
      period === "90d" ? "week" : period === "year" ? "month" : "day";

    // Clé de bucket (UTC) pour une date donnée
    const bucketKey = (d: Date): string => {
      if (granularity === "month") return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (granularity === "week") {
        // Lundi de la semaine ISO
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const day = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() - day + 1);
        return tmp.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    // Libellé lisible FR pour un bucket
    const bucketLabel = (key: string): string => {
      if (granularity === "month") {
        const [y, m] = key.split("-");
        return `${m}/${y}`;
      }
      const [y, m, dd] = key.split("-");
      return `${dd}/${m}`;
    };

    // Construit la liste ordonnée des buckets couvrant [startDate, now]
    const buildBuckets = (): string[] => {
      const keys: string[] = [];
      const seen = new Set<string>();
      const cursor = new Date(startDate);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor.getTime() <= now.getTime()) {
        const k = bucketKey(cursor);
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
        cursor.setUTCDate(cursor.getUTCDate() + (granularity === "month" ? 1 : granularity === "week" ? 7 : 1));
      }
      return keys;
    };

    const groupSeries = (rows: any[], buckets: string[]) => {
      const counts: Record<string, number> = {};
      for (const k of buckets) counts[k] = 0;
      (rows || []).forEach((item) => {
        const k = bucketKey(new Date(item.created_at));
        if (k in counts) counts[k] += 1;
        else counts[k] = (counts[k] || 0) + 1;
      });
      // Réordonne selon buckets (chronologique)
      const orderedKeys = Array.from(new Set([...buckets, ...Object.keys(counts)]))
        .sort((a, b) => a.localeCompare(b));
      return orderedKeys.map((k) => ({ date: bucketLabel(k), value: counts[k] || 0 }));
    };

    const buckets = buildBuckets();

    const { data: renderTrends } = await supabaseAdmin
      .from("render_results")
      .select("created_at")
      .gte("created_at", startIso)
      .order("created_at", { ascending: true });

    const { data: projectTrends } = await supabaseAdmin
      .from("projects")
      .select("created_at")
      .gte("created_at", startIso)
      .order("created_at", { ascending: true });

    const rendersData = groupSeries(renderTrends || [], buckets);
    const projectsData = groupSeries(projectTrends || [], buckets);

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
        totalProjects,
        totalRenders,
        totalUsers,
        activeUsers,
        totalDecors,
        avgRendersPerProject,
        engagementRate,
      },
      trends: {
        renders: {
          data: rendersData,
          direction: rendersComparison.direction,
          percentageChange: rendersComparison.percentageChange,
        },
        projects: {
          data: projectsData,
          direction: projectsComparison.direction,
          percentageChange: projectsComparison.percentageChange,
        },
        users: {
          data: [],
          direction: usersComparison.direction,
          percentageChange: usersComparison.percentageChange,
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
