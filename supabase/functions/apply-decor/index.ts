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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Helper function to convert image URL to base64 data URL
    async function urlToBase64DataUrl(url: string): Promise<string> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      
      // Detect mime type from URL extension
      const extension = url.split('.').pop()?.toLowerCase();
      let mimeType = 'image/jpeg';
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'webp') mimeType = 'image/webp';
      
      return `data:${mimeType};base64,${base64}`;
    }

    // Convert relative texture URL to absolute URL
    let fullTextureUrl = textureUrl;
    if (textureUrl.startsWith("/")) {
      const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/");
      if (!origin) {
        throw new Error("Cannot determine app origin from request headers");
      }
      fullTextureUrl = `${origin}${textureUrl}`;
      console.log("Converted relative texture URL to:", fullTextureUrl);
    }

    // Convert images to base64 data URLs
    console.log("Converting images to base64...");
    const photoDataUrl = await urlToBase64DataUrl(photoUrl);
    const textureDataUrl = await urlToBase64DataUrl(fullTextureUrl);

    // Call Lovable AI Gateway with Nano Banana image model
    console.log("Calling Lovable AI for image generation...");
    const generateResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Apply the decor texture from the second image onto all visible surfaces in the first image as a realistic product mockup. Preserve lighting, reflections, and perspective. Generate a photorealistic result.",
              },
              {
                type: "image_url",
                image_url: { url: photoDataUrl },
              },
              {
                type: "image_url",
                image_url: { url: textureDataUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Lovable AI error:", generateResponse.status, errorText);
      
      if (generateResponse.status === 429) {
        throw new Error("Limite de taux d'API atteinte. Veuillez réessayer dans quelques instants.");
      } else if (generateResponse.status === 402) {
        throw new Error("Crédits API insuffisants. Veuillez ajouter des fonds à votre espace de travail Lovable.");
      }
      
      throw new Error(`Erreur API Lovable AI: ${generateResponse.status}`);
    }

    const generateData = await generateResponse.json();
    console.log("Lovable AI response received");

    // Extract the generated image from the response
    const generatedImageUrl = generateData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      console.error("No image data in response:", generateData);
      throw new Error("Aucune image générée dans la réponse");
    }

    // The image is a data URL (base64), extract the base64 part
    const base64Match = generatedImageUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Format d'image invalide dans la réponse");
    }

    const generatedImageBase64 = base64Match[1];
    const generatedImageBuffer = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));

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

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("render-results")
      .upload(fileName, generatedImageBuffer, {
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
