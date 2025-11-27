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
      .select("name, reference_code, category")
      .eq("id", decorId)
      .single();

    if (decorError || !decor) {
      console.error("Error fetching decor:", decorError);
      throw new Error("Décor introuvable");
    }

    // Build 3-layer structured prompt for intelligent surface mapping
    // Layer 1: Global intention (MODE = PROJECT - strict photo editing)
    const globalIntention = `🔒 MODE: PROJECT (Strict photo editing)

You MUST use the source image provided. This is a photo retouching task, NOT a scene generation task.

Apply the DICA decor "${decor.name}" (ref ${decor.reference_code}) on allowed surfaces only.

CRITICAL CONSTRAINTS - Preserve from original photo:
- EXACT framing (same camera angle, same boundaries)
- EXACT geometry (same dimensions, same proportions)
- EXACT lighting (same light sources, same shadows, same ambiance)
- EXACT environment (same objects, same configuration)
- NO scene changes, NO object additions, NO environmental modifications

The second image provided is the EXACT texture/finish you must apply. Use this reference image to replicate the material properties precisely.

You are retouching the client's actual photo - it must remain the SAME elevator/van/terrace with only surface finishes changed.`;

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
        contextRules = `Context: Furniture/surface renovation (tables, counters, furniture)
Allowed surfaces: ONLY the horizontal work surfaces (table tops, countertops, shelves, furniture panels) that are the main subject
Forbidden surfaces: walls, floors, background elements, decorative items, technical equipment, accessories
CRITICAL: DO NOT modify walls or background - focus ONLY on the main furniture piece or work surface in focus`;
    }

    // Layer 2.5: Material-specific rules based on decor category
    let materialRules = "";
    const category = decor.category?.toLowerCase() || "";
    
    if (category.includes("metal") || category.includes("métal")) {
      materialRules = `Material type: METAL
Visual properties to preserve:
- Visible brushing lines (directional)
- Directional reflections
- NO wood grain or mineral texture
- NO matte paint effect
Keep metallic sheen and linear surface structure.`;
    } else if (category.includes("uni")) {
      materialRules = `Material type: SOLID COLOR (Unis)
Visual properties to preserve:
- Smooth surface, no grain or pattern
- Diffuse light, NO metallic reflections
- NO veins, NO additional texture
Keep uniform, flat appearance.`;
    } else if (category.includes("marbre")) {
      materialRules = `Material type: MARBLE
Visual properties to preserve:
- Mineral veins with realistic continuity
- Light gloss but NOT metallic
- Matte depth + subtle reflections
Keep natural stone appearance with elegant veining.`;
    } else if (category.includes("bois")) {
      materialRules = `Material type: WOOD
Visual properties to preserve:
- Wood grain oriented to match existing panels
- Warm, non-metallic light
- Wood structure: NO icy or glossy effects
Keep natural wood texture and warmth.`;
    } else if (category.includes("déco") || category.includes("deco")) {
      materialRules = `Material type: DECORATIVE
Visual properties to preserve:
- Preserve pattern (graphic or textured)
- NO added shine unless intended
- Respect contrast, density, and pattern repetition
Keep decorative motif integrity.`;
    } else {
      materialRules = `Material type: ${decor.category}
Preserve all intrinsic material properties shown in the reference texture.
Do NOT alter the fundamental visual characteristics of this material.`;
    }

    // Layer 3: Visual quality directive (always present)
    const qualityDirective = `Universal rules:
- IDENTIFY the main subject of renovation first (the prominent furniture/surface in the photo)
- If in doubt about ANY surface → DO NOT modify it
- WALLS and BACKGROUND are NEVER renovation targets unless explicitly in the context rules
- Preserve perspective, shadows, joints, existing relief
- NO global lighting transformation
- Decor must follow surfaces (not float above them)
- Result must be photographic and credible for a craftsperson

CRITICAL TARGETING: Only modify surfaces that are clearly the MAIN SUBJECT of the renovation, not background elements.
IMPORTANT: Ignore surfaces that already include a visible different material or pattern. If in doubt, keep the original material.`;

    // Assemble final prompt
    const prompt = `${globalIntention}

${contextRules}

${materialRules}

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
        // Build absolute URL - use the request referer to get the actual app domain
        const referer = req.headers.get("referer") || req.headers.get("origin") || "";
        const appUrl = referer ? new URL(referer).origin : "https://f7dcdcd1-f792-4761-bfa4-14b3a0277d1d.lovableproject.com";
        const absoluteTextureUrl = `${appUrl}${textureUrl}`;
        console.log("Fetching decor texture for Gemini:", absoluteTextureUrl);
        
        const textureResponse = await fetch(absoluteTextureUrl);
        const contentType = textureResponse.headers.get("content-type") ?? "";
        
        if (!textureResponse.ok) {
          console.error("Failed to fetch texture:", textureResponse.status, await textureResponse.text());
        } else if (!contentType.startsWith("image/")) {
          console.error("Texture URL returned non-image content:", contentType);
          console.error("This usually means the texture file is not accessible at the URL");
        } else {
          const arrayBuffer = await textureResponse.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          textureBase64 = btoa(binary);
          textureMimeType = contentType;
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
