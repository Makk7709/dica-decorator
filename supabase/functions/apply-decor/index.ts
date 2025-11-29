// DICA Decorator - Apply Decor Function
// Génération de rendus avec application de décors via Gemini 3 Pro Image Preview
// Developed by KOREV AI for DICA France
// Optimized for Supabase Edge Functions resource limits

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Resource Limits to prevent WORKER_LIMIT errors
// ============================================================================

const RESOURCE_LIMITS = {
  // Max image size in bytes (2MB to stay safe)
  maxImageSize: 2 * 1024 * 1024,
  // Max renders per request (to avoid timeout)
  maxRenderCount: 2,
  // Timeout for fetch operations (30s)
  fetchTimeout: 30000,
};

// ============================================================================
// Configuration Gemini 3 Pro Image Preview
// ============================================================================

const GEMINI_CONFIG = {
  // Gemini 3 Pro Image Preview - Meilleure qualité pour génération d'images
  model: "gemini-3-pro-image-preview",
  apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  responseModalities: ["TEXT", "IMAGE"],
};

/**
 * Build the Gemini API URL
 */
function buildGeminiUrl(apiKey: string): string {
  return `${GEMINI_CONFIG.apiEndpoint}/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;
}

/**
 * Parse Gemini response and extract image data
 */
function parseGeminiResponse(response: any): { imageBase64: string | null; textResponse: string | null } {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  
  let imageBase64: string | null = null;
  let textResponse: string | null = null;
  
  for (const part of parts) {
    // Check for inline_data (snake_case from API)
    if (part.inline_data?.data) {
      imageBase64 = part.inline_data.data;
    }
    // Check for inlineData (camelCase)
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
    }
    // Check for text
    if (part.text) {
      textResponse = part.text;
    }
  }
  
  return { imageBase64, textResponse };
}

/**
 * Get error message for HTTP status code
 */
function getErrorMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: "Requête invalide. Vérifiez les paramètres.",
    401: "Clé API Google AI invalide ou expirée.",
    403: "Accès refusé à l'API Google AI.",
    429: "Quota d'API Google AI dépassé. Veuillez patienter quelques minutes.",
    500: "Erreur serveur Google AI. Réessayez plus tard.",
    503: "Service Google AI temporairement indisponible.",
  };
  return messages[statusCode] || `Erreur API Google AI (${statusCode})`;
}

/**
 * Fetch with timeout to prevent hanging
 */
async function fetchWithTimeout(url: string, options?: RequestInit, timeout = RESOURCE_LIMITS.fetchTimeout): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert ArrayBuffer to base64 in chunks to avoid memory issues
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768; // 32KB chunks
  let binary = "";
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, textureUrl, photoId, decorId, useCase, renderCount = 1, format = "square", showReferences = false } = await req.json();
    
    // Limit render count to avoid resource exhaustion
    const safeRenderCount = Math.min(renderCount, RESOURCE_LIMITS.maxRenderCount);
    
    console.log("Applying decor:", {
      photoUrl,
      textureUrl,
      photoId,
      decorId,
      useCase,
      renderCount: safeRenderCount,
      format,
    });
    
    if (renderCount > safeRenderCount) {
      console.warn(`Render count limited from ${renderCount} to ${safeRenderCount} to prevent resource issues`);
    }

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

    // ========================================================================
    // Build Multi-Layer Prompt for Intelligent Surface Mapping
    // ========================================================================
    
    // Layer 0: IMPERATIVE RULES - NEVER VIOLATE (Règles impératives)
    const imperativeRules = `═══════════════════════════════════════════════════════════════════
🚨 RÈGLES IMPÉRATIVES - VIOLATION = ÉCHEC IMMÉDIAT
═══════════════════════════════════════════════════════════════════

RÈGLE 1: SOURCE EXCLUSIVE
→ Le décor provient UNIQUEMENT du fichier texture fourni (2ème image)
→ JAMAIS inventer, modifier, recolorer ou extrapoler le décor

RÈGLE 2: FIDÉLITÉ ABSOLUE DE LA TEXTURE
→ Conserver À L'IDENTIQUE:
  • Teinte exacte (pas de shift colorimétrique)
  • Motif intact (pas de déformation)
  • Grain précis (direction, densité, échelle)
  • Luminosité native (pas d'éclaircissement/assombrissement)
  • Reflets naturels (selon le matériau)
  • Rugosité/brillance originale

RÈGLE 3: ALIGNEMENT DU GRAIN OBLIGATOIRE
→ Bois: veinage horizontal ou vertical selon l'original
→ Métal brossé: lignes de brossage dans la direction correcte
→ Marbre: veines continues, pas de rupture artificielle

RÈGLE 4: REFUS SI QUALITÉ INSUFFISANTE
→ Si la surface cible est trop sombre → REFUSER
→ Si la perspective est trop déformée → REFUSER
→ Si l'image est trop bruitée/floue → REFUSER
→ En cas de refus: expliquer pourquoi et demander meilleure photo

RÈGLE 5: GESTION DES CAS AMBIGUS
→ Doute sur l'espace réel? → Rendu "zone isolée" uniquement
→ Perspective complexe? → Proposer moodboard alternatif
→ JAMAIS forcer un rendu faux ou approximatif

═══════════════════════════════════════════════════════════════════`;

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

TEXTURE FIDELITY CHECKLIST:
✓ Color: EXACT match to texture file (no tint shift)
✓ Pattern: EXACT reproduction (no distortion)
✓ Grain: EXACT direction and scale
✓ Brightness: NATIVE from texture (no lightening/darkening)
✓ Reflections: AS-IS from material type
✓ Surface finish: PRESERVED (matte stays matte, gloss stays gloss)

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

    // Assemble final prompt with imperative rules FIRST
    const prompt = `${imperativeRules}

${globalIntention}

${contextRules}

${materialRules}

${qualityDirective}

═══════════════════════════════════════════════════════════════════
📋 CHECKLIST FINALE AVANT GÉNÉRATION
═══════════════════════════════════════════════════════════════════
✓ La texture appliquée est-elle IDENTIQUE au fichier fourni?
✓ Les couleurs sont-elles fidèles (pas de shift)?
✓ Le grain/motif est-il dans la bonne direction?
✓ La photo originale est-elle préservée (cadrage, objets)?
✓ Seules les surfaces autorisées sont-elles modifiées?
✓ Le résultat est-il crédible pour un professionnel?

Si UNE seule réponse est NON → Améliorer ou refuser le rendu.
═══════════════════════════════════════════════════════════════════

${showReferences ? `
═══════════════════════════════════════════════════════════════════
🏷️ ANNOTATIONS RÉFÉRENCES DICA - OBLIGATOIRE
═══════════════════════════════════════════════════════════════════

Tu DOIS ajouter sur l'image les références du décor appliqué:

DÉCOR À ANNOTER:
• Nom: ${decor.name}
• Référence: ${decor.reference_code}

FORMAT D'ANNOTATION:
• Texte élégant, police sans-serif moderne (style catalogue)
• Fond semi-transparent derrière le texte pour lisibilité
• Position: coin inférieur gauche ou près de la surface décorée
• Couleur: blanc ou noir selon le contraste avec l'arrière-plan

EXEMPLE DE RENDU:
┌─────────────────────────────┐
│                             │
│    [IMAGE DU RENDU]         │
│                             │
│  ┌───────────────────────┐  │
│  │ ${decor.name}         │  │
│  │ Réf: ${decor.reference_code} │  │
│  └───────────────────────┘  │
└─────────────────────────────┘

L'annotation doit être:
- Professionnelle et discrète
- Lisible sans dominer l'image
- Intégrée harmonieusement au rendu
═══════════════════════════════════════════════════════════════════
` : ''}`;

    console.log(`Calling Gemini API (${GEMINI_CONFIG.model})...`);

    // ========================================================================
    // Fetch Source Images
    // ========================================================================
    
    let photoBase64: string | null = null;
    let photoMimeType = "image/jpeg";
    let textureBase64: string | null = null;
    let textureMimeType = "image/jpeg";

    // Fetch original photo with timeout and size check
    try {
      if (photoUrl) {
        console.log("Fetching original photo for Gemini:", photoUrl);
        const photoResponse = await fetchWithTimeout(photoUrl);
        
        if (!photoResponse.ok) {
          console.error("Failed to fetch photo:", photoResponse.status);
        } else {
          const contentLength = photoResponse.headers.get("content-length");
          const size = contentLength ? parseInt(contentLength) : 0;
          
          if (size > RESOURCE_LIMITS.maxImageSize) {
            console.warn(`Photo size (${size} bytes) exceeds limit. Using URL reference instead.`);
            // Don't convert to base64, Gemini can sometimes accept URLs
          } else {
            const arrayBuffer = await photoResponse.arrayBuffer();
            photoBase64 = arrayBufferToBase64(arrayBuffer);
            photoMimeType = photoResponse.headers.get("content-type") ?? "image/jpeg";
            console.log(`Photo fetched (${arrayBuffer.byteLength} bytes) and converted to base64`);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching/converting photo:", e);
      if (e instanceof Error && e.name === "AbortError") {
        console.error("Photo fetch timed out");
      }
    }

    // Fetch decor texture as reference with timeout
    try {
      if (textureUrl) {
        // Build absolute URL - use the request referer to get the actual app domain
        const referer = req.headers.get("referer") || req.headers.get("origin") || "";
        const appUrl = referer ? new URL(referer).origin : "";
        const absoluteTextureUrl = textureUrl.startsWith("http") ? textureUrl : `${appUrl}${textureUrl}`;
        console.log("Fetching decor texture for Gemini:", absoluteTextureUrl);
        
        const textureResponse = await fetchWithTimeout(absoluteTextureUrl);
        const contentType = textureResponse.headers.get("content-type") ?? "";
        
        if (!textureResponse.ok) {
          console.error("Failed to fetch texture:", textureResponse.status);
        } else if (!contentType.startsWith("image/")) {
          console.error("Texture URL returned non-image content:", contentType);
        } else {
          const contentLength = textureResponse.headers.get("content-length");
          const size = contentLength ? parseInt(contentLength) : 0;
          
          if (size > RESOURCE_LIMITS.maxImageSize) {
            console.warn(`Texture size (${size} bytes) exceeds limit.`);
          } else {
            const arrayBuffer = await textureResponse.arrayBuffer();
            textureBase64 = arrayBufferToBase64(arrayBuffer);
            textureMimeType = contentType;
            console.log(`Texture fetched (${arrayBuffer.byteLength} bytes) and converted to base64`);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching/converting texture:", e);
      if (e instanceof Error && e.name === "AbortError") {
        console.error("Texture fetch timed out");
      }
    }
    
    // ========================================================================
    // Build Request Payload
    // ========================================================================
    
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

    // Build Gemini API URL
    const geminiUrl = buildGeminiUrl(GOOGLE_AI_API_KEY);

    // ========================================================================
    // Generate Renders (with resource limits)
    // ========================================================================
    
    const generatedUrls: string[] = [];
    
    for (let i = 0; i < safeRenderCount; i++) {
      console.log(`Generating render ${i + 1}/${safeRenderCount}...`);
      
      try {
        const geminiResponse = await fetchWithTimeout(geminiUrl, {
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
              responseModalities: GEMINI_CONFIG.responseModalities,
            },
          }),
        }, 60000); // 60s timeout for Gemini API

        // Handle errors with detailed logging
        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Google AI error:", geminiResponse.status, errorText);
          throw new Error(getErrorMessage(geminiResponse.status));
        }

        const geminiData = await geminiResponse.json();
        console.log(`Gemini response ${i + 1} received successfully`);

        // Parse response
        const { imageBase64, textResponse } = parseGeminiResponse(geminiData);
        
        if (!imageBase64) {
          console.error("No image data found in response");
          throw new Error("Aucune image générée dans la réponse Gemini");
        }

        // Return data URL directly
        const resultUrl = `data:image/png;base64,${imageBase64}`;
        generatedUrls.push(resultUrl);
        
        console.log(`Image ${i + 1} generated successfully, saving to database`);

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

        console.log(`Render result ${i + 1} saved successfully`);
        
        // Increment user quota usage
        try {
          // Get user_id from project_photos -> projects
          const { data: photoData } = await supabase
            .from("project_photos")
            .select("project_id")
            .eq("id", photoId)
            .single();
          
          if (photoData) {
            const { data: projectData } = await supabase
              .from("projects")
              .select("user_id")
              .eq("id", photoData.project_id)
              .single();
            
            if (projectData) {
              // Increment quota_used for this user
              const { error: quotaError } = await supabase.rpc('increment_quota_used', {
                p_user_id: projectData.user_id
              });
              
              if (quotaError) {
                console.error("Error incrementing quota:", quotaError);
                // Don't throw - we don't want to fail the generation if quota update fails
              } else {
                console.log(`Quota incremented for user ${projectData.user_id}`);
              }
            }
          }
        } catch (quotaError) {
          console.error("Error updating quota:", quotaError);
          // Non-blocking error - generation was successful
        }
        
      } catch (renderError) {
        console.error(`Error generating render ${i + 1}:`, renderError);
        
        // If we have at least one successful render, return partial success
        if (generatedUrls.length > 0) {
          console.log(`Returning ${generatedUrls.length} successful render(s) despite error`);
          break;
        }
        
        // Re-throw if no renders succeeded
        throw renderError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, resultUrls: generatedUrls }),
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
