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

    // Fetch decor information to get name and reference code
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: decor, error: decorError } = await supabase
      .from("decors")
      .select("name, reference_code")
      .eq("id", decorId)
      .single();

    if (decorError || !decor) {
      console.error("Error fetching decor:", decorError);
      throw new Error("Décor introuvable");
    }

    // Build detailed prompt for intelligent surface mapping
    let prompt = "";
    switch (useCase) {
      case "ascenseur":
        prompt = `Analyze this elevator cabin photo and intelligently identify ALL metal/decorative surfaces (walls, panels, ceilings, any visible metallic finishes). Replace EVERY identified surface completely and precisely with the DICA decor "${decor.name}" (ref ${decor.reference_code}). 

CRITICAL REQUIREMENTS:
- Detect and map 100% of existing metal/decorative surfaces
- Apply the new texture to ALL detected surfaces without exception
- Maintain exact geometry, dimensions, perspective, and lighting from the original photo
- Preserve reflections, shadows, and environmental lighting on the new surfaces
- Keep all non-metallic elements (buttons, floors, fixtures) completely unchanged
- The result must look like a professional architectural photo with the original cabin structure but new surface finish`;
        break;
      case "van":
        prompt = `Analyze this van interior photo and intelligently identify ALL metal/decorative surfaces (walls, panels, ceilings, any visible metallic finishes). Replace EVERY identified surface completely and precisely with the DICA decor "${decor.name}" (ref ${decor.reference_code}). 

CRITICAL REQUIREMENTS:
- Detect and map 100% of existing metal/decorative surfaces
- Apply the new texture to ALL detected surfaces without exception
- Maintain exact geometry, dimensions, perspective, and lighting from the original photo
- Preserve reflections, shadows, and environmental lighting on the new surfaces
- Keep all non-metallic elements (seats, fixtures, windows) completely unchanged
- The result must look like a professional automotive photo with the original van structure but new surface finish`;
        break;
      case "terrasse":
        prompt = `Analyze this terrace/deck photo and intelligently identify ALL decorative surfaces (flooring, panels, any visible finishes). Replace EVERY identified surface completely and precisely with the DICA decor "${decor.name}" (ref ${decor.reference_code}). 

CRITICAL REQUIREMENTS:
- Detect and map 100% of existing decorative surfaces
- Apply the new texture to ALL detected surfaces without exception
- Maintain exact geometry, dimensions, perspective, and lighting from the original photo
- Preserve shadows and outdoor lighting on the new surfaces
- Keep all other elements (furniture, plants, surroundings) completely unchanged
- The result must look like a professional outdoor photo with the original structure but new surface finish`;
        break;
      default:
        prompt = `Analyze this ${useCase} photo and intelligently identify ALL metal/decorative surfaces. Replace EVERY identified surface completely and precisely with the DICA decor "${decor.name}" (ref ${decor.reference_code}). 

CRITICAL REQUIREMENTS:
- Detect and map 100% of existing metal/decorative surfaces
- Apply the new texture to ALL detected surfaces without exception
- Maintain exact geometry, dimensions, perspective, and lighting from the original photo
- Preserve reflections, shadows, and environmental lighting on the new surfaces
- The result must look like a professional photo with the original structure but new surface finish`;
    }

    console.log("Calling Google AI Studio (Gemini 2.5 Flash Image)...");

    // Try to fetch the original photo and send it as reference image to Gemini
    let photoBase64: string | null = null;
    let photoMimeType = "image/jpeg";

    try {
      if (photoUrl) {
        console.log("Fetching original photo for Gemini:", photoUrl);
        const photoResponse = await fetch(photoUrl);
        if (!photoResponse.ok) {
          console.error("Failed to fetch photo:", photoResponse.status, await photoResponse.text());
        } else {
          const arrayBuffer = await photoResponse.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          photoBase64 = btoa(binary);
          photoMimeType = photoResponse.headers.get("content-type") ?? "image/jpeg";
          console.log("Photo fetched and converted to base64 for Gemini");
        }
      }
    } catch (e) {
      console.error("Error fetching/converting photo:", e);
    }
    
    // Build parts: prompt + optional reference image
    const requestParts: any[] = [{ text: prompt }];
    if (photoBase64) {
      requestParts.push({
        inlineData: {
          mimeType: photoMimeType,
          data: photoBase64,
        },
      });
    }
    
    // Call Google AI Studio API with prompt and (if available) the original photo as reference
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" +
      GOOGLE_AI_API_KEY;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: requestParts,
          },
        ],
        generationConfig: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      }),
    });

    // Handle errors with detailed logging
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Google AI error:", geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        throw new Error("Quota d'API Google AI dépassé. Veuillez patienter quelques minutes avant de réessayer ou mettre à niveau votre plan Google AI Studio.");
      }
      
      throw new Error(`Google AI error ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received successfully");

    // Extract generated image from response
    const responseParts = geminiData?.candidates?.[0]?.content?.parts;
    
    if (!responseParts || responseParts.length === 0) {
      console.error("No parts in Gemini response:", geminiData);
      throw new Error("Aucune image générée dans la réponse Gemini");
    }

    // Find the part containing image data
    let base64 = null;
    for (const part of responseParts) {
      if (part.inline_data?.data) {
        base64 = part.inline_data.data;
        break;
      }
      if (part.inlineData?.data) {
        base64 = part.inlineData.data;
        break;
      }
    }

    if (!base64) {
      console.error("No image data found in parts:", JSON.stringify(responseParts, null, 2));
      throw new Error("Aucune image générée dans la réponse Gemini");
    }

    // Return data URL directly
    const resultUrl = `data:image/png;base64,${base64}`;
    
    console.log("Image generated successfully, saving to database");

    // Save result to database
    const { error: insertError } = await supabase
      .from("render_results")
      .insert({
        project_photo_id: photoId,
        decor_id: decorId,
        result_image_url: resultUrl,
      });

    if (insertError) {
      console.error("Error saving render result:", insertError);
      throw new Error("Erreur lors de la sauvegarde du rendu");
    }

    console.log("Render result saved successfully");

    return new Response(
      JSON.stringify({ success: true, resultUrl }),
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
