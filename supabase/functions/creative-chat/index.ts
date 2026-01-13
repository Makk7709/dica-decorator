// DICA Decorator - Creative Chat Function
// Assistant créatif IA avec génération d'images via Gemini 3 Pro Image Preview
// Developed by KOREV AI for DICA France

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { orchestrateDicaPrompt, type OrchestratorInput } from "./orchestrator.ts";

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
  textModel: "gemini-2.0-flash",
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
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Non autorisé - Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.7.1");
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Authenticated user:", user.id);
    // ========================================================================

    const { messages, decorContext, sourceImageUrls, imageLabels, showReferences = false } = await req.json();
    console.log('Creative chat request received');
    console.log('- Messages:', messages.length);
    console.log('- Decor context length:', decorContext?.length || 0, 'characters');
    console.log('- Source images URLs:', sourceImageUrls?.length || 0);
    console.log('- Image labels:', imageLabels || []);
    
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

   ⚠️ CRITICAL: Generate images of REAL SPACES (kitchen, van, office, etc.), NOT images inside a photo studio!
   "Professional quality" means HIGH-QUALITY IMAGE, not "image taken in a photography studio".
   
   📸 PHOTOGRAPHY SETUP:
   - Shot with professional full-frame camera (Phase One, Hasselblad level)
   - 24mm architectural lens, f/8 aperture for maximum depth of field
   - ISO 100 for absolute clean details, no noise
   - NATURAL LIGHTING appropriate for the space: daylight through windows, ambient room lighting
   - NO VISIBLE STUDIO EQUIPMENT, NO photography backdrops, NO studio environment
   
   🎨 IMAGE QUALITY:
   - Photorealistic image of a REAL SPACE that exists in the real world
   - Commercial catalog photography aesthetic (AD Magazine, Architectural Digest level)
   - Color-graded for luxury commercial quality, natural color accuracy
   - Sharp focus across ENTIRE frame, professional post-production
   - NO artificial CGI appearance, NO fake-looking renders
   
   ✨ REALISM:
   - The space must be a REAL environment (actual kitchen, actual van interior, actual office)
   - NOT a photo studio with white/gray backdrop
   - Natural lighting interaction with surfaces appropriate for the space type
   - Depth and dimension through natural and ambient lighting
   - Result must look like a REAL SPACE photographed by a professional, ON LOCATION

2. DICA PANEL APPLICATION (ABSOLUTE ACCURACY):
   - Panels must be clearly visible and prominent (minimum 40% of image)
   - Apply EXACT texture and colors from DICA catalog - ZERO color shifts or modifications
   - When user specifies a COLOR, use the EXACT DICA decor matching that color:
     * "rouge" → 3178_SPA (DICA Red Unis)
     * "vert olive" → 3179_SPA (DICA Olive Green Unis)  
     * "noir" → 3020_BN (DICA Black Unis)
     * "blanc" → 800_SATIN (DICA White Satin)
   - Respect material properties STRICTLY (metal reflections, wood grain direction, marble veining, etc.)
   - Material authenticity is CRITICAL - textures must look like real physical materials

   🚨 CRITICAL DISTINCTION - REQUEST TYPE:
   IF request mentions "catalogue", "couverture", "éventail", "sélection de décors", "moodboard", "échantillons":
   → Generate FLAT-LAY COMPOSITION of MATERIAL SAMPLES/SWATCHES
   → Decors mentioned are TEXTURES TO DISPLAY, NOT objects to build
   → "Inox Mat" = brushed steel SAMPLE PANEL, NOT an elevator made of steel!
   → Style: elegant arrangement of rectangular panels/swatches on neutral background
   → Each decor = a physical sample panel showing its texture and color

   📐 PANEL/COUNTERTOP THICKNESS (CRITICAL - DO NOT EXAGGERATE):
   ⚠️ THICKNESS values are in MILLIMETERS - very thin in reality!
   * 8-10mm = ULTRA-THIN, like ceramic tile thickness (~1cm)
   * 12-16mm = THIN, like smartphone thickness (~1.5cm)
   * 18-19mm = STANDARD furniture panel (~2cm, book cover thickness)
   * 22-25mm = MEDIUM (~2.5cm)
   * 30-38mm = THICK (~3-4cm, closed laptop thickness)
   * 50mm+ = VERY THICK (~5cm+, industrial)
   
   🚨 CRITICAL ERROR TO AVOID:
   NEVER generate a thin panel INSIDE a thick frame/border!
   "Plateau 10mm" = ONE SINGLE UNIFORM panel of 10mm TOTAL thickness
   NOT a thin marble surface with thick wood frame around it!
   The ENTIRE tabletop must be the specified thickness, viewed from side edge.
   
   🔧 EDGE BANDING (chant) - decorative strip on panel edge:
   * "chant 1-2mm" = thin edge banding FINISH on the panel border (not additional thickness)
   * "chant bois" = wood-finish edge band on panel side (same total thickness)
   Edge banding is a FINISH on the edge, NOT an additional frame!

3. SPACE FIDELITY:
   - Create exactly: ${detectedSpace.toUpperCase()}
   - Never change space type from user request
   - Maintain realistic proportions and perspective
   - Preserve existing lighting and shadows

4. COMPOSITION & PROFESSIONALISM:
   - PREMIUM COMMERCIAL PHOTOGRAPHY composition
   - Strategic angles showcasing DICA panels prominently and beautifully
   - Professional architectural framing with balanced composition
   - Result suitable for luxury client presentations and AD Magazine editorial
   - High-end, sophisticated visual result that sells the space

${showReferences ? `
═══════════════════════════════════════════════════════════════════
🏷️ REFERENCE ANNOTATIONS - REQUIRED
═══════════════════════════════════════════════════════════════════

You MUST add DICA decor references on the image.

ANNOTATION FORMAT (professional catalog style):
• Font: elegant modern sans-serif
• Background: semi-transparent (black or white depending on contrast)
• Position: bottom of image or near decorated surfaces
• Size: readable but not dominant

ANNOTATION STRUCTURE:
┌─────────────────────────────┐
│  Decor Name                 │
│  (Ref: REFERENCE_CODE)      │
└─────────────────────────────┘

EXAMPLES:
• "Inox Brossé 3020BN"
• "Uni Olive FC (Ref: 3179_SPA_FC)"
• "Marble décor - Laiton Brossé 3012 FC"

If multiple decors are visible, annotate EACH of them.
Annotations must be professional and harmoniously integrated.
═══════════════════════════════════════════════════════════════════
` : ''}

✨ EXPECTED RESULT: 
Professional architectural photography of a REAL ${detectedSpace} space featuring DICA panels.
⚠️ CRITICAL: This must be an image of a REAL ${detectedSpace.toUpperCase()}, NOT a photo studio!
Quality level: COMMERCIAL CATALOG PHOTOGRAPHY (Architectural Digest, AD Magazine editorial standard).
The ${detectedSpace} must look like an ACTUAL REAL SPACE that exists in the real world, photographed ON LOCATION by a professional photographer.
NO photo studio environment, NO white/gray backdrops, NO visible photography equipment.
Panels must be clearly visible, prominently showcased, and applied with EXACT colors and specifications requested by user.
If user specified edge thickness or color, it MUST be visible and accurate.
Natural lighting appropriate for a ${detectedSpace} (daylight through windows, ambient lighting).
Result must enable client to immediately envision their future REAL project with absolute realism.
═══════════════════════════════════════════════════════════════════`;

      console.log("Full orchestrated prompt length:", basePrompt.length, "characters");
      console.log("Show references:", showReferences);
      console.log("Orchestrated decor references:", orchestrationResult.decorReferences);

      // Build request parts
      const requestParts: any[] = [{ text: basePrompt }];

      // ======================================================================
      // Add decor texture reference images (to prevent the model from inventing)
      // ======================================================================
      if (orchestrationResult.decorReferences.length > 0) {
        console.log(`Fetching ${orchestrationResult.decorReferences.length} decor texture images from database...`);

        const { data: decorRows, error: decorErr } = await authSupabase
          .from("decors")
          .select("reference_code,name,texture_image_url")
          .in("reference_code", orchestrationResult.decorReferences)
          .eq("is_active", true);

        if (decorErr) {
          console.error("Error fetching decors:", decorErr);
          throw new Error("Impossible de récupérer les textures des décors");
        }

        const byRef = new Map(
          (decorRows || []).map((d) => [d.reference_code, d] as const)
        );

         const requestOrigin = req.headers.get("origin")
           ?? (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null);

         for (const ref of orchestrationResult.decorReferences) {
           const row = byRef.get(ref);
           if (!row?.texture_image_url) {
             console.warn("Missing texture_image_url for decor (skipping texture grounding):", ref);
             continue;
           }

           // Accept relative URLs by resolving them against the request origin when possible.
           // Also properly encode URLs with spaces
           let resolvedTextureUrl: string | null = null;
           
           if (row.texture_image_url.startsWith("http")) {
             resolvedTextureUrl = row.texture_image_url;
           } else if (requestOrigin) {
             // Encode spaces and special characters in the path
             const encodedPath = row.texture_image_url.includes('%') 
               ? row.texture_image_url // Already encoded
               : row.texture_image_url.split('/').map((part: string) => encodeURIComponent(part)).join('/').replace(/%2F/g, '/');
             resolvedTextureUrl = new URL(encodedPath, requestOrigin).toString();
           }

           if (!resolvedTextureUrl) {
             console.warn(
               "Non-absolute texture_image_url without origin (skipping texture grounding):",
               ref,
               row.texture_image_url,
             );
             continue;
           }

           try {
             const label = row.name || ref;
             console.log(`Fetching decor texture (${label}):`, resolvedTextureUrl);
             const imageResponse = await fetch(resolvedTextureUrl);
             if (!imageResponse.ok) {
               console.error("Failed fetching decor texture", ref, "status", imageResponse.status);
               continue;
             }

             const arrayBuffer = await imageResponse.arrayBuffer();
             const bytes = new Uint8Array(arrayBuffer);
             let binary = "";
             for (let i = 0; i < bytes.byteLength; i++) {
               binary += String.fromCharCode(bytes[i]);
             }
             const imageBase64 = btoa(binary);
             const imageMimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";

             requestParts.push({
               inlineData: {
                 mimeType: imageMimeType,
                 data: imageBase64,
               },
             });
             console.log(`✓ Decor texture added (${ref})`);
           } catch (e) {
             console.error("Error fetching decor texture", ref, e);
           }
         }
      }

      // ======================================================================
      // Add ALL source images (space photos, inspiration, etc.)
      // ======================================================================
      if (allSourceImages.length > 0) {
        console.log(`Fetching ${allSourceImages.length} source images for Gemini...`);

        for (let i = 0; i < allSourceImages.length; i++) {
          const imageUrl = allSourceImages[i];
          const label = allImageLabels[i] || `Image ${i + 1}`;

          try {
            console.log(`Fetching image ${i + 1} (${label}):`, imageUrl);
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              let binary = "";
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const imageBase64 = btoa(binary);
              const imageMimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";

              requestParts.push({
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              });
              console.log(`✓ Image ${i + 1} (${label}) added to request`);
            }
          } catch (e) {
            console.error(`Error fetching image ${i + 1} (${label}):`, e);
          }
        }
      }

      console.log(
        `Sending request with ${orchestrationResult.decorReferences.length} decor textures + ${allSourceImages.length} source images`
      );

      // Call Gemini API for image generation
      const geminiUrl = buildImageGenerationUrl(GOOGLE_AI_API_KEY);
      
      const response = await fetch(geminiUrl, {
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
            responseModalities: GEMINI_CONFIG.imageResponseModalities,
            // Configuration image 4K haute qualité
            imageConfig: {
              imageSize: "4K",        // Résolution 4K (4096px minimum)
              aspectRatio: "16:9",    // Format paysage professionnel
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google AI error:", response.status, errorText);
        throw new Error(getErrorMessage(response.status));
      }

      const data = await response.json();
      console.log("Gemini response received");
      
      // Parse response
      const { imageBase64, textResponse } = parseImageResponse(data);
      
      const imageUrl = imageBase64 ? `data:image/png;base64,${imageBase64}` : null;
      const text = textResponse || "Voici votre visualisation :";

      // Build decor references for frontend display
      const decorReferences = showReferences && orchestrationResult.decorReferences.length > 0 
        ? orchestrationResult.decorReferences.map((ref, idx) => ({
            reference: ref,
            label: orchestrationResult.decorLabels?.[idx] || ref,
          }))
        : [];

      console.log("Returning image response with decor references:", decorReferences);

      return new Response(JSON.stringify({ 
        type: "image",
        imageUrl,
        text,
        decorReferences, // Include decor references for frontend display
        showReferences,  // Whether user wants to see references
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
5. Chaque demande est INDÉPENDANTE

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

    // Build conversation for Gemini
    const geminiContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Compris. Je suis prêt à vous aider avec les décors DICA." }] },
    ];
    
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

    // Transform Gemini SSE to OpenAI-compatible format for frontend
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim() === '[DONE]') {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                return;
              }
              
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              
              if (content) {
                const openaiFormat = {
                  choices: [{ delta: { content } }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
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
