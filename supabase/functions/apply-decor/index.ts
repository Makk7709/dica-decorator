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

    // Build 3-layer structured prompt for intelligent surface mapping
    // Layer 1: Global intention (invariant)
    const globalIntention = `Apply a realistic renovation with the selected DICA decor "${decor.name}" (ref ${decor.reference_code}) on allowed surfaces only.
Never modify technical elements, accessories, glazing, lighting, signage, or volumes outside the renovation scope.

CRITICAL: The second image provided is the EXACT texture/finish you must apply. Use this reference image to replicate the material properties: metallic sheen, brushed pattern, color tone, reflection properties, and surface finish. The result must match this texture reference precisely.`;

    // Layer 2: Business rules per context
    let contextRules = "";
    switch (useCase) {
      case "ascenseur":
        contextRules = `Context: Elevator cabin
Allowed surfaces: vertical wall panels, door panels, lower wall sections
Forbidden surfaces: ceiling, floor, lights, buttons, grab bar, mirrors, windows, indicators, structure, any technical or decorative accessories`;
        break;
      case "van":
        contextRules = `Context: Van interior
Allowed surfaces: vertical wall coverings, lateral partitions, wall panels
Forbidden surfaces: furniture, countertop, objects, windows, appliances, door handles, fixtures, hardware, seats`;
        break;
      case "terrasse":
        contextRules = `Context: Outdoor terrace
Allowed surfaces: horizontal floor surfaces, visible vertical cladding (railings, support walls)
Forbidden surfaces: vegetation, furniture, textiles, decorative equipment`;
        break;
      default:
        contextRules = `Context: Generic surface renovation
Allowed surfaces: decorative wall and floor coverings
Forbidden surfaces: technical elements, accessories, equipment`;
    }

    // Layer 3: Visual quality directive (always present)
    const qualityDirective = `Maintain proportions, perspective, and realistic texture.
Respect shadows, relief, joints, and straight lines.
The result must be photographic, clean, ready for commercial presentation.

IMPORTANT: Ignore surfaces that already include a visible different material or pattern. If in doubt, keep the original material.`;

    // Assemble final prompt
    const prompt = `${globalIntention}

${contextRules}

${qualityDirective}`;

    console.log("Calling Google AI Studio (Gemini 3 Pro Image Preview)...");

    // Fetch the original photo and the decor texture to send as reference images to Gemini
    let photoBase64: string | null = null;
    let photoMimeType = "image/jpeg";
    let textureBase64: string | null = null;
    let textureMimeType = "image/jpeg";

    // Fetch original photo
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

    // Fetch decor texture as reference
    try {
      if (textureUrl) {
        // Build absolute URL from the app domain (not the edge function domain)
        const appUrl = Deno.env.get("VITE_SUPABASE_URL")?.replace('/rest/v1', '') || 
                       req.headers.get("origin") || 
                       "https://f7dcdcd1-f792-4761-bfa4-14b3a0277d1d.lovableproject.com";
        const absoluteTextureUrl = `${appUrl}${textureUrl}`;
        console.log("Fetching decor texture for Gemini:", absoluteTextureUrl);
        
        const textureResponse = await fetch(absoluteTextureUrl);
        if (!textureResponse.ok) {
          console.error("Failed to fetch texture:", textureResponse.status, await textureResponse.text());
        } else {
          const arrayBuffer = await textureResponse.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          textureBase64 = btoa(binary);
          textureMimeType = textureResponse.headers.get("content-type") ?? "image/jpeg";
          console.log("Texture fetched and converted to base64 for Gemini");
        }
      }
    } catch (e) {
      console.error("Error fetching/converting texture:", e);
    }
    
    // Build parts: prompt + photo + texture reference
    const requestParts: any[] = [{ text: prompt }];
    
    if (photoBase64) {
      requestParts.push({
        inlineData: {
          mimeType: photoMimeType,
          data: photoBase64,
        },
      });
    }
    
    if (textureBase64) {
      requestParts.push({
        inlineData: {
          mimeType: textureMimeType,
          data: textureBase64,
        },
      });
    }
    
    // Call Google AI Studio API with Gemini 3 Pro Image Preview
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=" +
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
