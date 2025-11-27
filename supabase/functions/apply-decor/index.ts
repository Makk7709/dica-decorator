import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, textureUrl, photoId, decorId, useCase } = await req.json();
    console.log("Applying decor:", {
      photoUrl,
      textureUrl,
      photoId,
      decorId,
      useCase,
    });

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    // Helper function to convert image URL to base64
    async function urlToBase64(url: string): Promise<string> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    // Convert relative texture URL to absolute URL
    let fullTextureUrl = textureUrl;
    if (textureUrl.startsWith("/")) {
      const origin =
        req.headers.get("origin") ||
        req.headers
          .get("referer")
          ?.split("/")
          .slice(0, 3)
          .join("/");

      if (!origin) {
        throw new Error("Cannot determine app origin from request headers");
      }

      fullTextureUrl = `${origin}${textureUrl}`;
      console.log("Converted relative texture URL to:", fullTextureUrl);
    }

    // Fetch and encode images to base64
    console.log("Fetching photo from:", photoUrl);
    const photoBase64 = await urlToBase64(photoUrl);

    console.log("Fetching texture from:", fullTextureUrl);
    const textureBase64 = await urlToBase64(fullTextureUrl);

    // Build context-aware prompt based on useCase
    let contextPrompt = "";
    switch (useCase) {
      case "ascenseur":
        contextPrompt =
          "Generate a photorealistic image showing this elevator cabin interior with the decorative pattern from the second image applied to all wall panels. Maintain the original lighting, metallic edges, reflections, and perspective. The texture should wrap naturally around the surfaces.";
        break;
      case "van":
        contextPrompt =
          "Generate a photorealistic image of this vehicle interior with the decorative pattern from the second image applied to the visible panels and surfaces. Preserve the curved contours, original lighting, and reflections. The texture should follow the natural shape of the surfaces.";
        break;
      case "terrasse":
        contextPrompt =
          "Generate a photorealistic image of this outdoor terrace or deck with the decorative pattern from the second image applied to the flooring or wall surfaces. Maintain the natural outdoor lighting, shadows, and perspective. The texture should appear as a realistic surface material.";
        break;
      default:
        contextPrompt =
          "Generate a photorealistic image where the decorative pattern from the second image is applied onto all visible surfaces in the first image. Create a realistic product mockup that preserves the original lighting, reflections, and perspective. The texture should appear as if it's naturally part of the surfaces.";
    }

    // Call Google AI Studio API (Gemini with image generation)
    console.log("Calling Google AI Studio (Gemini) for image generation...");
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: contextPrompt,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: photoBase64,
                  },
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: textureBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_modalities: ["IMAGE", "TEXT"],
            temperature: 0.4,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(
        "Google AI Studio error:",
        geminiResponse.status,
        errorText,
      );

      if (geminiResponse.status === 401) {
        throw new Error(
          "Clé API Google AI Studio invalide. Veuillez vérifier GOOGLE_AI_API_KEY.",
        );
      }

      if (geminiResponse.status === 429) {
        throw new Error(
          "Limite de taux Google AI Studio atteinte. Veuillez réessayer dans quelques instants.",
        );
      }

      throw new Error(
        `Erreur API Google AI Studio: ${geminiResponse.status}`,
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received");

    // Extract generated image from response
    const generatedImageData =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!generatedImageData) {
      console.error("No image data in Gemini response:", geminiData);
      throw new Error("Aucune image générée dans la réponse Gemini");
    }

    // Decode base64 image
    const generatedImageBuffer = Uint8Array.from(
      atob(generatedImageData),
      (c) => c.charCodeAt(0),
    );

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

    const {
      data: { publicUrl },
    } = supabase.storage.from("render-results").getPublicUrl(fileName);

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

    console.log("Render result saved successfully:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, resultUrl: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in apply-decor function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
