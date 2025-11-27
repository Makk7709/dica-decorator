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

    // Helper function to convert ArrayBuffer to base64 in chunks
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
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
      // Get the origin from the request headers (where the app is hosted)
      const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/");
      if (!origin) {
        throw new Error("Cannot determine app origin from request headers");
      }
      fullTextureUrl = `${origin}${textureUrl}`;
      console.log("Converted relative texture URL to:", fullTextureUrl);
    }

    // Fetch and encode images
    console.log("Fetching photo from:", photoUrl);
    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) {
      throw new Error(`Failed to fetch photo: ${photoResponse.status}`);
    }
    const photoBuffer = await photoResponse.arrayBuffer();
    const photoBase64 = arrayBufferToBase64(photoBuffer);

    console.log("Fetching texture from:", fullTextureUrl);
    const textureResponse = await fetch(fullTextureUrl);
    if (!textureResponse.ok) {
      throw new Error(`Failed to fetch texture: ${textureResponse.status}`);
    }
    const textureBuffer = await textureResponse.arrayBuffer();
    const textureBase64 = arrayBufferToBase64(textureBuffer);

    // Call Google AI Studio API (Nano Banana model)
    console.log("Calling Google AI Studio API...");
    const generateResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/nano-banana:generateContent?key=${NANO_BANANA_API_KEY}`,
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
                  text: "Apply the decor texture from the second image onto all visible surfaces of the first image as a realistic product mockup. Preserve lighting, reflections and perspective.",
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
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "image/jpeg",
          },
        }),
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("Google AI Studio API error:", generateResponse.status, errorText);
      throw new Error(`Erreur API Google AI Studio: ${generateResponse.status}`);
    }

    const generateData = await generateResponse.json();
    console.log("Google AI Studio response:", generateData);

    // Extract the generated image from the response
    const generatedImageData = generateData?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
    
    if (!generatedImageData) {
      console.error("No image data in response:", generateData);
      throw new Error("Aucune image générée dans la réponse");
    }

    // Decode base64 image
    const generatedImageBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));

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
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("render-results")
      .upload(fileName, generatedImageBuffer, {
        contentType: "image/jpeg",
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
