// DICA Decorator - Creative Chat Function
// Assistant créatif IA avec génération d'images via Gemini 3 Pro Image Preview
// Developed by KOREV AI for DICA France

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { orchestrateDicaPrompt, type OrchestratorInput, FORMAT_PRESETS } from "./orchestrator.ts";

/**
 * Convertit une URL Supabase Storage publique d'un bucket privé
 * en URL signée temporaire (TTL 5min) pour que l'AI gateway puisse la fetch.
 */
async function signPrivateStorageUrl(
  url: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
): Promise<string> {
  if (!url) return url;
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/);
  if (!match) return url;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  if (bucket !== "project-photos" && bucket !== "render-results") return url;
  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      console.warn("[creative-chat] createSignedUrl failed:", error?.message);
      return url;
    }
    return data.signedUrl;
  } catch (e) {
    console.warn("[creative-chat] createSignedUrl exception:", e instanceof Error ? e.message : e);
    return url;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Configuration Gemini
// ============================================================================

const GEMINI_CONFIG = {
  // Gemini 3 Pro Image Preview - Meilleure qualité pour génération d'images
  imageModel: "gemini-3-pro-image-preview",
  // Modèle pour le chat texte avec streaming
  textModel: "gemini-2.5-flash",
  // Endpoint de base
  apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  // Modalités de réponse pour la génération d'images
  imageResponseModalities: ["TEXT", "IMAGE"],
};

/**
 * Build Gemini API URL for image generation
 */
function buildImageGenerationUrl(apiKey: string): string {
  return `${GEMINI_CONFIG.apiEndpoint}/${GEMINI_CONFIG.imageModel}:generateContent?key=${apiKey}`;
}

/**
 * Build Gemini API URL for streaming text
 */
function buildStreamingTextUrl(apiKey: string): string {
  return `${GEMINI_CONFIG.apiEndpoint}/${GEMINI_CONFIG.textModel}:streamGenerateContent?key=${apiKey}&alt=sse`;
}

/**
 * Parse Gemini response for image data
 */
function parseImageResponse(response: any): { imageBase64: string | null; textResponse: string | null } {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  
  let imageBase64: string | null = null;
  let textResponse: string | null = null;
  
  for (const part of parts) {
    if (part.inline_data?.data) {
      imageBase64 = part.inline_data.data;
    }
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
    }
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
    400: "Requête invalide.",
    401: "Clé API invalide.",
    403: "Accès refusé.",
    429: "Limite de requêtes atteinte, veuillez réessayer plus tard.",
    500: "Erreur serveur Google AI.",
    503: "Service temporairement indisponible.",
  };
  return messages[statusCode] || `Erreur API (${statusCode})`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // Authentication Check - Verify user is logged in
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let payload: Record<string, unknown> | null = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.exp && (payload.exp as number) < Math.floor(Date.now() / 1000)) payload = null;
      }
    } catch { payload = null; }
    
    if (!payload?.sub || typeof payload.sub !== "string") {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user: verifiedUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(payload.sub as string);
    
    if (authError || !verifiedUser) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const user = verifiedUser;
    console.log("Authenticated user:", user.id);
    // ========================================================================

    const { messages, decorContext: _legacyDecorContext, sourceImageUrls, imageLabels, showReferences = false } = await req.json();
    console.log('Creative chat request received');
    console.log('- Messages:', messages.length);
    console.log('- Source images URLs:', sourceImageUrls?.length || 0);
    console.log('- Image labels:', imageLabels || []);

    // ========================================================================
    // BUILD STRUCTURED DECOR CONTEXT FROM CATALOGS (replaces flat frontend list)
    // ========================================================================
    let decorContext: string;
    const allDecorRefs: string[] = [];
    try {
      // Fetch all active catalogs with their linked decors
      const { data: catalogs, error: catErr } = await supabaseAdmin
        .from("catalogs")
        .select("id, code, label, project_type, display_order")
        .eq("is_active", true)
        .order("project_type")
        .order("display_order");
      
      if (catErr) throw catErr;

      // For each catalog, fetch linked decors
      const catalogSections: string[] = [];
      // allDecorRefs declared in outer scope
      
      for (const cat of (catalogs || [])) {
        const { data: links } = await supabaseAdmin
          .from("catalog_decor_links")
          .select("decor_id, display_order")
          .eq("catalog_id", cat.id)
          .order("display_order");
        
        if (!links || links.length === 0) continue;
        
        const decorIds = links.map((l: any) => l.decor_id);
        const { data: decors } = await supabaseAdmin
          .from("decors")
          .select("id, name, reference_code, category, texture_image_url")
          .in("id", decorIds)
          .eq("is_active", true);
        
        if (!decors || decors.length === 0) continue;

        // Map for ordering
        const orderMap = new Map(links.map((l: any) => [l.decor_id, l.display_order]));
        const sorted = decors.sort((a: any, b: any) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));

        // Map project_type to gamme label
        const gammeLabel = ({
          ascenseur: `🏢 GAMME ASCENSEUR - ${cat.label}`,
          van: `🚐 GAMME ÉVASION (VAN)`,
          terrasse: `☀️ GAMME COMPACTOP (TERRASSE)`,
          autre: `📦 GAMME AUTRE - Tous les décors`,
        } as Record<string, string>)[cat.project_type] || cat.label;

        let section = `\n${gammeLabel} (${sorted.length} décors):\n`;
        for (const d of sorted) {
          section += `  • "${d.reference_code}" = ${d.name} [${d.category}]\n`;
          allDecorRefs.push(d.reference_code);
        }
        catalogSections.push(section);
      }

      decorContext = `════════════════════════════════════════════════════════════════
🚨 CATALOGUE DICA - ORGANISÉ PAR GAMME (${allDecorRefs.length} décors)
════════════════════════════════════════════════════════════════

⛔ RÈGLE ABSOLUE: UNIQUEMENT les références ci-dessous.
⛔ INVENTER une référence = ERREUR FATALE BLOQUÉE.

🔒 RÈGLES DE SÉLECTION PAR GAMME:
- Si le client parle de VAN / évasion / fourgon → utiliser UNIQUEMENT la GAMME ÉVASION
- Si le client parle d'ASCENSEUR / cabine / élévateur → utiliser UNIQUEMENT la GAMME ASCENSEUR
- Si le client parle de TERRASSE / table / restaurant / café → utiliser UNIQUEMENT la GAMME COMPACTOP
- Si le client parle d'autre chose → utiliser la GAMME AUTRE (ou toutes si vide)

📋 RÉFÉRENCES PAR GAMME:
${catalogSections.join('\n')}

⛔ COPIE les références EXACTEMENT. Ne modifie PAS, n'invente PAS.
════════════════════════════════════════════════════════════════`;

      console.log(`Contexte décors structuré: ${allDecorRefs.length} décors dans ${catalogSections.length} gammes`);
    } catch (contextErr) {
      console.error("Error building structured decor context:", contextErr);
      // Fallback to frontend-provided context
      decorContext = _legacyDecorContext || "Aucun décor disponible.";
    }

    console.log('- Decor context length:', decorContext?.length || 0, 'characters');
    
    // Collect all source images (current + history)
    const allSourceImages: string[] = [...(sourceImageUrls || [])];
    const allImageLabels: string[] = [...(imageLabels || [])];
    
    // Also find images from conversation history
    for (const m of messages) {
      if (m.role === 'user' && m.sourceImageUrls) {
        allSourceImages.push(...m.sourceImageUrls);
      }
    }
    console.log('- Total source images:', allSourceImages.length);

    // Signer toutes les URLs venant des buckets Supabase Storage privés
    // pour que l'AI gateway (et Gemini) puisse les télécharger
    for (let i = 0; i < allSourceImages.length; i++) {
      allSourceImages[i] = await signPrivateStorageUrl(allSourceImages[i], supabaseAdmin);
    }
    
    console.log('- Decor context preview:', decorContext?.substring(0, 200));

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Detect if user wants an image generation
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const imageKeywords = [
      // Création
      "mood board", "moodboard", "plaquette", "visualise", "visualisation", 
      "image", "photo", "crée", "créer", "génère", "générer", "imagine", 
      "design", "montre", "compose", "création", "visuel", "présentation", "planche",
      // Catalogues et échantillons
      "catalogue", "catalog", "couverture", "éventail", "eventail", "sélection",
      "échantillon", "echantillon", "échantillons", "samples", "swatches",
      "collection", "gamme", "palette", "nuancier",
      // Actions de combinaison
      "combine", "combiner", "fusionne", "fusionner", "mélange", "mélanger",
      "met", "mets", "place", "placer", "ajoute", "ajouter", "intègre", "intégrer",
      // Actions d'aménagement
      "aménage", "aménager", "aménagement", "décore", "décorer", "décoration",
      "habille", "habiller", "revêt", "revêtir", "recouvre", "recouvrir",
      // Demandes directes
      "je veux", "je voudrais", "peux-tu", "peux tu", "fait", "fais", "faire",
      "transforme", "transformer", "applique", "appliquer", "utilise", "utiliser",
      // Contextes visuels
      "scène", "scene", "ambiance", "rendu", "résultat", "avec",
      // Décors spécifiques
      "panneau", "panneaux", "stratifié", "dica", "décor", "texture", "finition",
      "couleur", "couleurs", "teinte", "uni", "bois", "métal", "marbre"
    ];
    
    // Force image mode if user has uploaded images
    const hasMultipleImages = allSourceImages.length > 1;
    const hasAnyImages = allSourceImages.length > 0;
    
    // Check if message mentions decors or colors (indication user wants to apply them)
    const mentionsDecors = /uni|bois|métal|metal|marbre|inox|chêne|olive|rouge|noir|blanc|gris|bleu|vert|shiky|3\d{3}/i.test(lastUserMessage);
    
    // FORCE image mode if: user uploaded image AND (mentions decors OR uses action keywords)
    const wantsImage = hasMultipleImages || 
                       (hasAnyImages && mentionsDecors) ||
                       (hasAnyImages && imageKeywords.some(keyword => lastUserMessage.includes(keyword))) ||
                       imageKeywords.some(keyword => lastUserMessage.includes(keyword));

    // ========================================================================
    // Image Generation Mode
    // ========================================================================
    
    console.log("=== MODE DETECTION ===");
    console.log("- Has multiple images:", hasMultipleImages);
    console.log("- Has any images:", hasAnyImages);
    console.log("- Mentions decors:", mentionsDecors);
    console.log("- Wants image (final):", wantsImage);
    console.log("- User message:", lastUserMessage);
    console.log("- Keywords matched:", imageKeywords.filter(kw => lastUserMessage.includes(kw)));

    if (wantsImage) {
      console.log("=== IMAGE GENERATION MODE ACTIVATED ===");
      console.log("Available decors context:", decorContext?.substring(0, 500));
      console.log("Source images to combine:", allSourceImages.length);
      
      if (!decorContext || decorContext.trim().length < 50) {
        console.error("Decor context is empty or too short!");
        throw new Error("Contexte des décors non disponible");
      }

      // ========================================================================
      // STEP 1: ORCHESTRATION - Validate and structure the request
      // ========================================================================
      
      console.log("🎯 Starting DICA Prompt Orchestrator...");
      
      const orchestratorInput: OrchestratorInput = {
        userPrompt: messages[messages.length - 1]?.content || "",
        decorContext,
        sourceImages: allSourceImages,
        imageLabels: allImageLabels,
        projectContext: {
          projectType: "assistant_crea", // This is creative mode
        }
      };

      const orchestrationResult = await orchestrateDicaPrompt(orchestratorInput, LOVABLE_API_KEY);
      
      console.log("📊 Orchestration result:", {
        status: orchestrationResult.status,
        projectType: orchestrationResult.projectType,
        decorReferences: orchestrationResult.decorReferences,
        nbVariants: orchestrationResult.nbVariants
      });

      // Handle orchestration statuses
      if (orchestrationResult.status === "need_clarification") {
        console.log("⚠️ Clarification needed");
        const clarificationMessage = `Je comprends votre demande, mais j'ai besoin de quelques précisions pour vous générer la meilleure visualisation possible:\n\n${orchestrationResult.clarificationQuestions?.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nPouvez-vous me donner ces détails ?`;
        
        return new Response(JSON.stringify({ 
          type: "text",
          content: clarificationMessage
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (orchestrationResult.status === "reject") {
        console.log("❌ Request rejected:", orchestrationResult.rejectionReason);
        const rejectionMessage = `Désolé, je ne peux pas traiter cette demande:\n\n${orchestrationResult.rejectionReason}\n\nPourriez-vous reformuler votre demande en utilisant uniquement les décors DICA disponibles dans notre catalogue ?`;
        
        return new Response(JSON.stringify({ 
          type: "text",
          content: rejectionMessage
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========================================================================
      // STEP 2: IMAGE GENERATION - Use orchestrated prompt with Nano Banana
      // ========================================================================
      
      console.log("✅ Request validated, proceeding with image generation");
      console.log("Using orchestrated prompt:", orchestrationResult.finalPromptForImageModel?.substring(0, 200));
      
      // Use orchestrated data
      const userRequest = messages[messages.length - 1]?.content || "";
      const detectedSpace = orchestrationResult.projectType || "espace personnalisé";
      
      console.log("Orchestrated space type:", detectedSpace);
      console.log("Orchestrated decor references:", orchestrationResult.decorReferences);

      // Build multi-image description
      let imageDescription = "";
      if (allSourceImages.length > 0) {
        if (allSourceImages.length === 1) {
          const label = allImageLabels[0] || "Image source";
          imageDescription = `
📷 SOURCE IMAGE PROVIDED - "${label}":
- FAITHFULLY REPRODUCE this space/object
- PRESERVE structure, proportions and viewing angle
- APPLY DICA panels only on visible flat surfaces
- DO NOT CHANGE the space type (if it's a van, keep it a van)`;
        } else {
          imageDescription = `
📷 ${allSourceImages.length} IMAGES TO COMBINE:
${allImageLabels.map((label, i) => `  • Image ${i + 1}: ${label || "Element"}`).join('\n')}

COMBINATION INSTRUCTIONS:
- MERGE these elements into ONE coherent scene
- RESPECT each provided element
- INTEGRATE DICA panels visibly and realistically`;
        }
      }
      
      // Build decor descriptions from orchestrated references
      let decorDescriptions = "";
      if (orchestrationResult.decorReferences.length > 0) {
        decorDescriptions = "\n\n🎨 DICA DECORS TO USE:\n";
        orchestrationResult.decorReferences.forEach((ref, idx) => {
          const label = orchestrationResult.decorLabels?.[idx] || ref;
          decorDescriptions += `- ${label} (Ref: ${ref})\n`;
        });
      }
      
      // Use the orchestrated prompt as the base, enhanced with DICA-specific details
      const basePrompt = `═══════════════════════════════════════════════════════════════════
🎯 DICA IMAGE GENERATION - ORCHESTRATED REQUEST
═══════════════════════════════════════════════════════════════════

VALIDATED REQUEST:
"${userRequest}"

SPACE TYPE: ${detectedSpace.toUpperCase()}

${imageDescription}

${decorDescriptions}

═══════════════════════════════════════════════════════════════════
📋 ORCHESTRATED PROMPT (VALIDATED BY DICA ORCHESTRATOR)
═══════════════════════════════════════════════════════════════════

${orchestrationResult.finalPromptForImageModel}

═══════════════════════════════════════════════════════════════════
🎨 TECHNICAL RENDERING REQUIREMENTS
═══════════════════════════════════════════════════════════════════

1. PROFESSIONAL QUALITY STANDARDS (NON-NEGOTIABLE):

   ⚠️ CRITICAL: Generate images of REAL SPACES, NOT images inside a photo studio!
   "Professional quality" means HIGH-QUALITY IMAGE, not "image taken in a photography studio".
   
   📸 PHOTOGRAPHY SETUP:
   - Shot with professional full-frame camera, 24mm architectural lens, f/8, ISO 100
   - NATURAL LIGHTING appropriate for the space: daylight through windows, ambient room lighting
   - NO VISIBLE STUDIO EQUIPMENT, NO photography backdrops
   
   🎨 IMAGE QUALITY:
   - Photorealistic image of a REAL SPACE that exists in the real world
   - Commercial catalog photography aesthetic (AD Magazine level)
   - Sharp focus across ENTIRE frame, professional post-production
   
2. DICA PANEL APPLICATION (ABSOLUTE ACCURACY):
   - Panels must be clearly visible and prominent (minimum 40% of image)
   - Apply EXACT texture and colors from DICA catalog - ZERO color shifts
   - Respect material properties based on the decor finish type
   - Use PAROI decors on walls/panels, SOL decors on floors
   
   🚫 CRITICAL - FORBIDDEN SURFACES (ALL CONTEXTS):
   - NEVER apply DICA decor on: cushions, textiles, curtains, fabric seats, mattresses
   - NEVER apply DICA decor on: glass, mirrors, lighting, vegetation, people, dishes
   - DICA panels are RIGID LAMINATE surfaces: walls, cupboard doors, countertops, table tops, floors, decorative panels ONLY
   
   📏 CONTEXT-SPECIFIC SURFACE RULES:
   - ELEVATOR: walls/panels + floor ONLY
   - VAN: cupboards, storage furniture, countertops ONLY (never on cushions/textile/seats)
   - TERRACE/COMPACTOP: table tops and kitchen countertops ONLY (never walls/floors/chairs)
   - OTHER: walls, partitions, decorative panels, panel furniture

3. SPACE FIDELITY:
   - Create exactly: ${detectedSpace.toUpperCase()}
   - Never change space type from user request
   - Maintain realistic proportions and perspective

4. COMPOSITION & PROFESSIONALISM:
   - PREMIUM COMMERCIAL PHOTOGRAPHY composition
   - Strategic angles showcasing DICA panels prominently
   - Result suitable for luxury client presentations

${showReferences ? `
═══════════════════════════════════════════════════════════════════
🏷️ REFERENCE ANNOTATIONS - REQUIRED
═══════════════════════════════════════════════════════════════════

Add DICA decor reference annotations on the image:
- Font: elegant modern sans-serif
- Background: semi-transparent
- Position: bottom of image or near decorated surfaces
- Format: "Decor Name (Ref: REFERENCE_CODE)"
- If multiple decors are visible, annotate EACH of them.
═══════════════════════════════════════════════════════════════════
` : ''}

${orchestrationResult.recommendedFormat ? `
═══════════════════════════════════════════════════════════════════
📐 IMAGE FORMAT - CRITICAL
═══════════════════════════════════════════════════════════════════
Format: ${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.label || orchestrationResult.recommendedFormat}
Aspect ratio: ${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio}
Dimensions: ${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.width}x${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.height}px

YOU MUST generate an image that matches this EXACT aspect ratio.
Compose the scene to work perfectly in ${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio} format.
${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "9:16" || FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "2:5" ? "VERTICAL composition - tall and narrow." : ""}
${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "1.91:1" || FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "16:9" || FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "3.2:1" ? "HORIZONTAL/WIDE composition - panoramic layout." : ""}
${FORMAT_PRESETS[orchestrationResult.recommendedFormat]?.aspectRatio === "1:1" ? "SQUARE composition - centered and balanced." : ""}
═══════════════════════════════════════════════════════════════════
` : ''}

✨ EXPECTED RESULT: 
Professional architectural photography of a REAL ${detectedSpace} space featuring DICA panels.
Photorealistic, commercial catalog quality, natural lighting, NO photo studio.
═══════════════════════════════════════════════════════════════════`;

      console.log("Full orchestrated prompt length:", basePrompt.length, "characters");
      console.log("Show references:", showReferences);
      console.log("Orchestrated decor references:", orchestrationResult.decorReferences);

      // Build message content parts for AI gateway
      const contentParts: any[] = [{ type: "text", text: basePrompt }];

      // ======================================================================
      // Add decor texture URLs as image references (no base64 needed!)
      // ======================================================================
      if (orchestrationResult.decorReferences.length > 0) {
        const limitedRefs = orchestrationResult.decorReferences.slice(0, 2);
        console.log(`Adding ${limitedRefs.length} decor texture URLs...`);

        const { data: decorRows, error: decorErr } = await supabaseAdmin
          .from("decors")
          .select("reference_code,name,texture_image_url")
          .in("reference_code", limitedRefs)
          .eq("is_active", true);

        if (decorErr) {
          console.error("Error fetching decors:", decorErr);
        }

        const byRef = new Map(
          (decorRows || []).map((d: any) => [d.reference_code, d] as const)
        );

        for (const ref of limitedRefs) {
          const row = byRef.get(ref);
          if (!row?.texture_image_url) continue;
          
          let resolvedUrl = row.texture_image_url;
          if (!resolvedUrl.startsWith("http")) {
            const requestOrigin = req.headers.get("origin")
              ?? (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null);
            if (requestOrigin) {
              resolvedUrl = new URL(resolvedUrl, requestOrigin).toString();
            } else {
              continue;
            }
          }
          
          contentParts.push({
            type: "image_url",
            image_url: { url: resolvedUrl }
          });
          console.log(`✓ Decor texture URL added (${ref})`);
        }
      }

      // ======================================================================
      // Add source image URLs
      // ======================================================================
      if (allSourceImages.length > 0) {
        console.log(`Adding ${allSourceImages.length} source image URLs...`);
        for (let i = 0; i < allSourceImages.length; i++) {
          const label = allImageLabels[i] || `Image ${i + 1}`;
          contentParts.push({
            type: "image_url",
            image_url: { url: allSourceImages[i] }
          });
          console.log(`✓ Source image URL added (${label})`);
        }
      }

      console.log(`Sending request via AI gateway with ${contentParts.length - 1} images`);

      // Call AI gateway for image generation
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "user",
              content: contentParts,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        if (response.status === 429) {
          throw new Error("Limite de requêtes atteinte, veuillez réessayer plus tard.");
        }
        if (response.status === 402) {
          throw new Error("Crédits insuffisants. Veuillez recharger votre compte.");
        }
        throw new Error(getErrorMessage(response.status));
      }

      const data = await response.json();
      console.log("AI gateway response received");
      console.log("Response keys:", JSON.stringify(Object.keys(data)));
      console.log("Choice message keys:", JSON.stringify(data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : "no message"));
      console.log("Images array:", JSON.stringify(data.choices?.[0]?.message?.images?.length ?? "no images field"));
      console.log("Content length:", data.choices?.[0]?.message?.content?.length ?? 0);
      
      // Parse response from AI gateway format
      const choice = data.choices?.[0]?.message;
      const imageUrl = choice?.images?.[0]?.image_url?.url || null;
      const text = choice?.content || "Voici votre visualisation :";
      
      if (!imageUrl) {
        console.warn("⚠️ No image in response! Full response structure:", JSON.stringify(data).substring(0, 2000));
      }

      // Build decor references for frontend display
      const decorReferences = showReferences && orchestrationResult.decorReferences.length > 0 
        ? orchestrationResult.decorReferences.map((ref: string, idx: number) => ({
            reference: ref,
            label: orchestrationResult.decorLabels?.[idx] || ref,
          }))
        : [];

      console.log("Returning image response with decor references:", decorReferences);

      const formatInfo = orchestrationResult.recommendedFormat 
        ? FORMAT_PRESETS[orchestrationResult.recommendedFormat] 
        : null;

      return new Response(JSON.stringify({ 
        type: "image",
        imageUrl,
        text: formatInfo 
          ? `${text}\n\n📐 Format: **${formatInfo.label}** (${formatInfo.width}×${formatInfo.height}px)`
          : text,
        decorReferences,
        showReferences,
        format: formatInfo ? { 
          key: orchestrationResult.recommendedFormat, 
          label: formatInfo.label, 
          width: formatInfo.width, 
          height: formatInfo.height,
          aspectRatio: formatInfo.aspectRatio 
        } : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Text Chat Mode (Streaming)
    // ========================================================================
    
    const systemPrompt = `Tu es un assistant expert du catalogue DICA France.

🔒 RÈGLE ABSOLUE N°1: TU N'UTILISES QUE LES DÉCORS DU CATALOGUE CI-DESSOUS
Tu ne peux JAMAIS mentionner, suggérer ou inventer un décor qui n'existe pas dans le catalogue fourni.

═══════════════════════════════════════════════════════════════════
📚 CATALOGUE DICA OFFICIEL (SEULS DÉCORS AUTORISÉS):
═══════════════════════════════════════════════════════════════════
${decorContext}
═══════════════════════════════════════════════════════════════════

🎯 RÈGLE ABSOLUE N°2: Réponds EXACTEMENT à ce que demande le client

⚠️ DIRECTIVES CRITIQUES:
1. Lis attentivement la demande du client
2. Propose UNIQUEMENT des décors qui existent dans le catalogue ci-dessus
3. N'invente JAMAIS de référence ou nom de décor
4. Si le client demande un décor non disponible → Propose des alternatives du catalogue
5. **CONSERVE LE CONTEXTE de la conversation** : tiens compte des messages précédents, des décors déjà évoqués, du projet en cours et des préférences exprimées par le client.

TON RÔLE:
- Conseiller sur les décors DICA listés dans le catalogue
- Suggérer des associations UNIQUEMENT avec des décors du catalogue
- Citer les RÉFÉRENCES EXACTES des décors (Réf: XXXX_XXX)
- Aider le client à choisir parmi les décors DISPONIBLES

🚫 INTERDICTIONS ABSOLUES:
- ❌ N'invente JAMAIS un nom de décor qui n'est pas dans le catalogue
- ❌ N'invente JAMAIS une référence de décor
- ❌ NE DONNE JAMAIS les URLs ou liens vers les textures
- ❌ NE LISTE JAMAIS les chemins des fichiers images
- ❌ NE suggère PAS de décors hors catalogue
- ❌ NE PARTAGE JAMAIS les liens Supabase des décors

✅ OBLIGATIONS:
- VÉRIFIE que chaque décor que tu mentionnes existe dans le catalogue
- CITE les références exactes (Réf: XXXX) quand tu parles d'un décor
- Si un décor demandé n'existe pas → DIS-LE et propose des alternatives
- Si le client veut visualiser → DIS-LUI D'UPLOADER UNE PHOTO

💡 QUAND LE CLIENT DEMANDE UN DÉCOR NON DISPONIBLE:
→ Dis clairement: "Ce décor n'est pas disponible dans notre catalogue"
→ Propose des alternatives EXISTANTES du catalogue
→ Cite les références exactes des alternatives

Réponds en français de manière claire et professionnelle.`;

    // Build conversation for Gemini (system prompt via systemInstruction)
    const geminiContents = [];
    for (const msg of messages) {
      geminiContents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      });
    }

    const geminiUrl = buildStreamingTextUrl(GOOGLE_AI_API_KEY);
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: getErrorMessage(429) }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Google AI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible format + post-stream RAG validation
    const validRefsSet = new Set(allDecorRefs.map((r) => r.toUpperCase()));
    let assistantBuffer = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim() === '[DONE]') continue;
              
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              
              if (content) {
                assistantBuffer += content;
                const openaiFormat = { choices: [{ delta: { content } }] };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
              }
            } catch (_e) {
              // Skip malformed JSON
            }
          }
        }
      },
      flush(controller) {
        // RAG safety net: detect any mentioned reference NOT in the catalog
        if (validRefsSet.size > 0 && assistantBuffer) {
          // Match patterns like "Réf: 1234_AB_CD", "Ref 1234_AB", "(Réf: XXXX)"
          const refRegex = /(?:R[ée]f(?:[ée]rence)?\.?\s*:?\s*|\()([A-Z0-9][A-Z0-9_-]{2,})/gi;
          const mentioned = new Set<string>();
          let m: RegExpExecArray | null;
          while ((m = refRegex.exec(assistantBuffer)) !== null) {
            mentioned.add(m[1].toUpperCase());
          }
          const invented = [...mentioned].filter((ref) => !validRefsSet.has(ref));
          if (invented.length > 0) {
            console.warn("⚠️ RAG violation - invented refs:", invented);
            const warning = `\n\n---\n⚠️ **Vérification catalogue** : la ou les références suivantes ne figurent pas dans le catalogue DICA officiel et ne doivent pas être prises en compte : ${invented.map((r) => `\`${r}\``).join(", ")}. Demande à l'assistant de proposer des alternatives valides.`;
            const warnFormat = { choices: [{ delta: { content: warning } }] };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(warnFormat)}\n\n`));
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Creative chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
