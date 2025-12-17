import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("dataUrl invalide");

  const mime = match[1];
  const base64 = match[2];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, bytes };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";

    // Client user (valider la session)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client service role (upload + update)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const renderId = String((body as any)?.renderId || "");
    const dataUrl = String((body as any)?.dataUrl || "");

    if (!renderId || !dataUrl) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier ownership (sécurité)
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("render_results")
      .select(
        `id,
         project_photo:project_photos(
           id,
           project:projects(id, user_id)
         )`
      )
      .eq("id", renderId)
      .maybeSingle();

    if (ownedError) throw ownedError;

    const ownerId = (owned as any)?.project_photo?.project?.user_id as string | undefined;
    if (!ownerId || ownerId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mime, bytes } = parseDataUrl(dataUrl);
    const ext = mime.split("/")[1] || "png";
    const filePath = `${user.id}/renders/${renderId}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("render-results")
      .upload(filePath, bytes, { contentType: mime, upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseAdmin.storage.from("render-results").getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("render_results")
      .update({ result_image_url: publicUrl })
      .eq("id", renderId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[migrate-render-image] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

