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
    const { photoUrl, textureUrl, photoId, decorId } = await req.json();
    console.log("Applying decor:", { photoUrl, textureUrl, photoId, decorId });

    const NANO_BANANA_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    if (!NANO_BANANA_API_KEY) {
      throw new Error("NANO_BANANA_API_KEY not configured");
    }

    // Convert relative texture URL to absolute URL
    let fullTextureUrl = textureUrl;
    if (textureUrl.startsWith("/")) {
      // Extract the origin from the request
      const origin = new URL(req.url).origin;
      fullTextureUrl = `${origin}${textureUrl}`;
      console.log("Converted relative texture URL to:", fullTextureUrl);
    }

    // Call Nano Banana API
    const response = await fetch("https://api.nanobanana.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NANO_BANANA_API_KEY}`,
      },
      body: JSON.stringify({
        image_url: photoUrl,
        texture_url: fullTextureUrl,
        mode: "auto_mapping",
        output_format: "png",
        style: "realistic_product_mockup",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nano Banana API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Limite de taux d'API atteinte. Veuillez réessayer dans quelques instants.");
      } else if (response.status === 402) {
        throw new Error("Crédits API insuffisants. Veuillez ajouter des fonds à votre compte Nano Banana.");
      }
      
      throw new Error(`Erreur API Nano Banana: ${response.status}`);
    }

    const data = await response.json();
    const resultUrl = data.result_url;

    if (!resultUrl) {
      throw new Error("Aucune URL de résultat retournée par l'API");
    }

    console.log("Generated result URL:", resultUrl);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from photo
    const { data: photoData, error: photoError } = await supabase
      .from("project_photos")
      .select("project_id, projects!inner(user_id)")
      .eq("id", photoId)
      .single();

    if (photoError) {
      console.error("Error fetching photo:", photoError);
      throw new Error("Photo introuvable");
    }

    const userId = (photoData as any).projects.user_id;

    // Download the result image
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error("Impossible de télécharger l'image résultat");
    }

    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBuffer = new Uint8Array(imageArrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("render-results")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Erreur lors de l'upload du résultat");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("render-results")
      .getPublicUrl(fileName);

    // Save render result to database
    const { error: insertError } = await supabase
      .from("render_results")
      .insert({
        project_photo_id: photoId,
        decor_id: decorId,
        result_image_url: publicUrl,
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Erreur lors de la sauvegarde du résultat");
    }

    return new Response(
      JSON.stringify({ success: true, resultUrl: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in apply-decor function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
