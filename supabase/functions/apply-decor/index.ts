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
  // Max image size in bytes (12MB to keep original photos instead of dropping them)
  maxImageSize: 12 * 1024 * 1024,
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

    const authSupabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authSupabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2.7.1");
    const authSupabase = createAuthClient(authSupabaseUrl, authSupabaseAnonKey);
    
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
    const { photoUrl, textureUrl, photoId, decorId, useCase, renderCount = 1, format = "square", showReferences = false } = await req.json();
    
    // Get origin from request headers for constructing absolute URLs
    const requestOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, '') || "";
    
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
      requestOrigin,
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
    
    // Layer 0: CRITICAL TASK DEFINITION - READ THIS FIRST
    const taskDefinition = `╔═══════════════════════════════════════════════════════════════════╗
║ 🚨 TÂCHE: RETOUCHE PHOTO UNIQUEMENT - PAS DE GÉNÉRATION DE SCÈNE ║
╚═══════════════════════════════════════════════════════════════════╝

⚠️ AVERTISSEMENT CRITIQUE ⚠️
Tu es en train de faire une RETOUCHE PHOTO, pas une génération créative.
Tu DOIS utiliser la première image fournie comme base INTÉGRALE.

❌ STRICTEMENT INTERDIT:
• Inventer une nouvelle scène
• Générer un nouvel ascenseur/van/terrasse
• Créer une nouvelle perspective ou angle de vue
• Modifier l'architecture ou la géométrie de l'espace
• Ajouter ou supprimer des objets
• Changer l'éclairage ou l'ambiance
• Imaginer à quoi "pourrait ressembler" la surface

✅ CE QUE TU DOIS FAIRE:
• Prendre l'IMAGE RÉELLE fournie (première image)
• Identifier les panneaux/surfaces spécifiques visibles
• Appliquer UNIQUEMENT la texture du décor (deuxième image)
• Conserver TOUT LE RESTE intact

═══════════════════════════════════════════════════════════════════
VÉRIFICATION PRÉ-TRAITEMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Est-ce que je vois la photo réelle du client dans l'image 1? → OUI
2. Est-ce que je vais utiliser cette photo comme base? → OUI
3. Est-ce que je vais conserver EXACTEMENT le cadrage? → OUI
4. Est-ce que je vais conserver EXACTEMENT l'environnement? → OUI
5. Est-ce que je vais juste appliquer la texture sur les surfaces? → OUI

Si UNE seule réponse est NON → ARRÊTE TOI ET RECOMMENCE
═══════════════════════════════════════════════════════════════════`;

    // Layer 1: IMPERATIVE RULES - NEVER VIOLATE (Règles impératives)
    const imperativeRules = `═══════════════════════════════════════════════════════════════════
🔒 MODE: PROJECT - RETOUCHE PHOTO STRICTE
═══════════════════════════════════════════════════════════════════

RÈGLE ABSOLUE #0: UTILISATION DE LA PHOTO SOURCE
→ La PREMIÈRE image est la photo réelle à retoucher
→ Tu DOIS conserver cette photo comme base intégrale
→ INTERDIT d'imaginer ou générer une autre scène
→ INTERDIT de créer un nouvel espace à partir de zéro

RÈGLE #1: FIDÉLITÉ À LA PHOTO ORIGINALE
→ Cadrage: IDENTIQUE (même angle, mêmes limites)
→ Géométrie: IDENTIQUE (mêmes proportions, mêmes dimensions)
→ Éclairage: IDENTIQUE (mêmes sources lumineuses, mêmes ombres)
→ Objets: IDENTIQUES (tout doit rester en place)
→ Architecture: IDENTIQUE (aucune modification structurelle)

RÈGLE #2: SOURCE EXCLUSIVE DU DÉCOR
→ Le décor "${decor.name}" (réf ${decor.reference_code}) provient UNIQUEMENT de la 2ème image
→ Appliquer cette texture UNIQUEMENT sur les surfaces autorisées
→ JAMAIS inventer, modifier, recolorer ou extrapoler

RÈGLE #3: FIDÉLITÉ ABSOLUE DE LA TEXTURE
→ Teinte: EXACTE (pas de shift colorimétrique)
→ Motif: EXACT (pas de déformation)
→ Grain: EXACT (direction, densité, échelle respectées)
→ Luminosité: NATIVE (pas d'éclaircissement/assombrissement)
→ Finition: PRÉSERVÉE (mat reste mat, brillant reste brillant)

RÈGLE #4: ALIGNEMENT DU GRAIN
→ Bois: veinage selon orientation des panneaux originaux
→ Métal brossé: lignes de brossage dans la direction correcte
→ Marbre: veines continues sans rupture artificielle

═══════════════════════════════════════════════════════════════════`;

    // Layer 2: Surface identification rules (NO spatial context suggestion)
    let surfaceRules = "";
    switch (useCase) {
      case "ascenseur":
        surfaceRules = `═══════════════════════════════════════════════════════════════════
IDENTIFICATION DES SURFACES - PAS DE SUGGESTION D'ESPACE
═══════════════════════════════════════════════════════════════════

⚠️ ATTENTION: Tu travailles sur la PHOTO RÉELLE fournie, quel que soit le type d'espace
(bureau, cuisine, salon, chambre, etc.). Le contexte "ascenseur" sert UNIQUEMENT à 
identifier les TYPES de surfaces compatibles, PAS à suggérer de générer un ascenseur.

SURFACES COMPATIBLES avec le décor:
• Panneaux muraux verticaux
• Surfaces de portes/battants
• Sections murales basses (soubassements)
• Revêtements muraux lisses

SURFACES INTERDITES (ne JAMAIS modifier):
• Plafonds et luminaires
• Sols et planchers
• Éléments techniques (boutons, interrupteurs, prises)
• Barres de maintien, poignées, quincaillerie
• Miroirs et surfaces vitrées
• Indicateurs et signalétique
• Structures apparentes
• Accessoires décoratifs ou techniques

RÈGLE ABSOLUE: Travaille UNIQUEMENT sur la photo fournie. Si c'est un bureau, 
reste sur le bureau. Si c'est une cuisine, reste sur la cuisine. NE JAMAIS inventer 
un autre type d'espace.
═══════════════════════════════════════════════════════════════════`;
        break;
      case "van":
        surfaceRules = `═══════════════════════════════════════════════════════════════════
IDENTIFICATION DES SURFACES - PAS DE SUGGESTION D'ESPACE
═══════════════════════════════════════════════════════════════════

⚠️ ATTENTION: Tu travailles sur la PHOTO RÉELLE fournie, quel que soit le type d'espace.
Le contexte "van" sert UNIQUEMENT à identifier les TYPES de surfaces compatibles,
PAS à suggérer de générer un véhicule.

SURFACES COMPATIBLES avec le décor:
• Revêtements muraux verticaux
• Cloisons latérales
• Panneaux de paroi

SURFACES INTERDITES (ne JAMAIS modifier):
• Mobilier (sièges, placards, lits)
• Plans de travail et comptoirs
• Objets et équipements
• Surfaces vitrées (fenêtres, hublots)
• Électroménager et appareils
• Poignées et quincaillerie
• Accessoires et fixations
• Sièges et assises

RÈGLE ABSOLUE: Travaille UNIQUEMENT sur la photo fournie. Si c'est un bureau,
reste sur le bureau. NE JAMAIS inventer un autre type d'espace.
═══════════════════════════════════════════════════════════════════`;
        break;
      case "terrasse":
        surfaceRules = `╔═══════════════════════════════════════════════════════════════════╗
║ 🚨🚨🚨 TERRASSE: DÉCOR SUR PLATEAUX DE TABLES UNIQUEMENT 🚨🚨🚨 ║
╚═══════════════════════════════════════════════════════════════════╝

██████████████████████████████████████████████████████████████████████
█ STOP! LIS CECI 5 FOIS AVANT DE COMMENCER:                         █
█                                                                    █
█ LE DÉCOR VA SUR LES DESSUS DE TABLES.                             █
█ LE DÉCOR VA SUR LES DESSUS DE TABLES.                             █
█ LE DÉCOR VA SUR LES DESSUS DE TABLES.                             █
█ LE DÉCOR VA SUR LES DESSUS DE TABLES.                             █
█ LE DÉCOR VA SUR LES DESSUS DE TABLES.                             █
█                                                                    █
█ PAS SUR LES CHAISES. PAS SUR LES MURS. PAS SUR LE SOL.           █
██████████████████████████████████████████████████████████████████████

═══════════════════════════════════════════════════════════════════
✅ SEULE CIBLE AUTORISÉE: SURFACES HORIZONTALES DES TABLES
═══════════════════════════════════════════════════════════════════
OÙ APPLIQUER (EXCLUSIVEMENT):
→ Les DESSUS DE TABLES (plateaux horizontaux où on pose les verres)
→ Les PLATEAUX DE GUÉRIDONS (petites tables rondes de café)
→ Les SURFACES HORIZONTALES DE COMPTOIRS (si au premier plan)

C'EST TOUT. RIEN D'AUTRE.

═══════════════════════════════════════════════════════════════════
❌❌❌ INTERDICTION ABSOLUE - NE JAMAIS APPLIQUER SUR: ❌❌❌
═══════════════════════════════════════════════════════════════════

🚫 CHAISES = INTERDIT (dossiers, assises, accoudoirs)
🚫 PIEDS DE TABLES = INTERDIT (structure métallique/bois)
🚫 MURS = INTERDIT (façades, cloisons, parois)
🚫 SOL = INTERDIT (carrelage, béton, pavés)
🚫 PARASOLS = INTERDIT
🚫 STORES = INTERDIT
🚫 VÉGÉTATION = INTERDIT (plantes, arbres)
🚫 PERSONNES = INTERDIT
🚫 VAISSELLE = INTERDIT (verres, assiettes, couverts)
🚫 BÂTIMENT = INTERDIT (façade, fenêtres, portes)
🚫 MOBILIER AUTRE = INTERDIT (banquettes, canapés, fauteuils)

SI TU APPLIQUES LE DÉCOR SUR UNE CHAISE → ERREUR GRAVE
SI TU APPLIQUES LE DÉCOR SUR UN MUR → ERREUR GRAVE
SI TU APPLIQUES LE DÉCOR SUR LE SOL → ERREUR GRAVE

═══════════════════════════════════════════════════════════════════
📋 CHECKLIST TERRASSE - VALIDATION OBLIGATOIRE:
═══════════════════════════════════════════════════════════════════
AVANT de générer, vérifie:
□ J'ai identifié les TABLES dans la photo → OUI
□ Je vais appliquer le décor UNIQUEMENT sur les DESSUS de tables → OUI
□ Les CHAISES restent 100% intactes sans aucun décor → OUI
□ Les MURS restent 100% intacts sans aucun décor → OUI
□ Le SOL reste 100% intact sans aucun décor → OUI
□ Les PIEDS DE TABLES restent intacts → OUI

Si UNE réponse est NON → RECOMMENCE TA RÉFLEXION

RAPPEL COMMERCIAL: Un restaurateur veut visualiser ses TABLES de 
terrasse avec un nouveau revêtement. Il veut voir le DESSUS de ses 
tables transformé, PAS ses chaises, PAS ses murs.
═══════════════════════════════════════════════════════════════════`;
        break;
      default:
        surfaceRules = `═══════════════════════════════════════════════════════════════════
IDENTIFICATION DES SURFACES - MODE GÉNÉRAL
═══════════════════════════════════════════════════════════════════

⚠️ ATTENTION: Tu travailles sur la PHOTO RÉELLE fournie. 
ANALYSE le sujet principal et applique le décor de manière intelligente.

SURFACES PRIORITAIRES (dans cet ordre):
• SUJET PRINCIPAL de la photo (meuble, table, comptoir, panneau)
• Surfaces horizontales de travail visibles
• Panneaux de meubles au premier plan
• Étagères et plateaux principaux

RÈGLE D'IDENTIFICATION:
1. Identifie le SUJET CENTRAL de la photo
2. Si c'est une TABLE/BUREAU → applique sur le dessus
3. Si c'est un MEUBLE → applique sur les panneaux visibles
4. Si c'est un PANNEAU → applique sur la surface

SURFACES INTERDITES (ne JAMAIS modifier):
• Murs d'arrière-plan (sauf si c'est le sujet)
• Sol de l'environnement
• Accessoires et objets posés
• Équipements électroniques
• Personnes ou reflets

RÈGLE CRITIQUE: CIBLE le sujet principal. Si la photo montre une table,
applique sur LA TABLE. Si la photo montre un mur, applique sur LE MUR.
═══════════════════════════════════════════════════════════════════`;
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
    const qualityDirective = `═══════════════════════════════════════════════════════════════════
DIRECTIVES UNIVERSELLES
═══════════════════════════════════════════════════════════════════

PRÉSERVATION OBLIGATOIRE:
• Perspective de la photo originale
• Ombres et reflets existants
• Joints et reliefs entre panneaux
• Éclairage et ambiance générale

CIBLAGE PRÉCIS:
• Identifier les surfaces compatibles (panneaux, revêtements)
• En cas de doute sur une surface → NE PAS la modifier
• Ne JAMAIS modifier les surfaces techniques (boutons, lumières, etc.)
• Le décor doit épouser la surface (pas flotter au-dessus)

RÉSULTAT ATTENDU:
• Photo crédible pour un professionnel
• Rendu réaliste et plausible
• Texture appliquée de manière convaincante

⚠️ RAPPEL FINAL: Tu es en train de RETOUCHER une photo existante, 
pas de générer une nouvelle scène. La photo du client EST ta base de travail.
═══════════════════════════════════════════════════════════════════`;

    // Assemble final prompt with TASK DEFINITION FIRST
    const prompt = `${taskDefinition}

${imperativeRules}

${surfaceRules}

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
    // Strategy: Try Supabase Storage first (most reliable), then fallback to other URLs
    try {
      if (textureUrl) {
        let absoluteTextureUrl = textureUrl;
        let textureLoaded = false;
        
        // Extract filename from texture URL path
        const textureFilename = textureUrl.split('/').pop() || '';
        
        // Strategy 1: Try Supabase Storage bucket (most reliable)
        const supabaseStorageUrl = `https://urkftxznsynmvkskytih.supabase.co/storage/v1/object/public/decor-textures/${textureFilename}`;
        console.log("Trying Supabase Storage URL:", supabaseStorageUrl);
        
        try {
          const storageResponse = await fetchWithTimeout(supabaseStorageUrl, undefined, 10000);
          const storageContentType = storageResponse.headers.get("content-type") ?? "";
          
          if (storageResponse.ok && storageContentType.startsWith("image/")) {
            const arrayBuffer = await storageResponse.arrayBuffer();
            textureBase64 = arrayBufferToBase64(arrayBuffer);
            textureMimeType = storageContentType;
            textureLoaded = true;
            console.log(`Texture loaded from Supabase Storage (${arrayBuffer.byteLength} bytes)`);
          } else {
            console.warn("Supabase Storage failed:", storageResponse.status, storageContentType);
          }
        } catch (e) {
          console.warn("Supabase Storage fetch error:", e instanceof Error ? e.message : e);
        }
        
        // Strategy 2: Try origin-based URL if Supabase Storage failed (use request origin)
        if (!textureLoaded && !textureUrl.startsWith("http") && requestOrigin) {
          const originUrl = `${requestOrigin}${textureUrl}`;
          console.log("Trying origin-based URL:", originUrl);
          
          try {
            const originResponse = await fetchWithTimeout(originUrl, undefined, 10000);
            const originContentType = originResponse.headers.get("content-type") ?? "";
            
            if (originResponse.ok && originContentType.startsWith("image/")) {
              const arrayBuffer = await originResponse.arrayBuffer();
              textureBase64 = arrayBufferToBase64(arrayBuffer);
              textureMimeType = originContentType;
              textureLoaded = true;
              console.log(`Texture loaded from origin URL (${arrayBuffer.byteLength} bytes)`);
            } else {
              console.warn("Origin URL failed:", originResponse.status, originContentType);
            }
          } catch (e) {
            console.warn("Origin URL fetch error:", e instanceof Error ? e.message : e);
          }
        }
        
        // Strategy 3: Try the original URL (might be absolute already)
        if (!textureLoaded && textureUrl.startsWith("http")) {
          absoluteTextureUrl = textureUrl;
          console.log("Trying original absolute URL:", absoluteTextureUrl);
          
          const response = await fetchWithTimeout(absoluteTextureUrl);
          const contentType = response.headers.get("content-type") ?? "";
          
          if (response.ok && contentType.startsWith("image/")) {
            const arrayBuffer = await response.arrayBuffer();
            textureBase64 = arrayBufferToBase64(arrayBuffer);
            textureMimeType = contentType;
            textureLoaded = true;
            console.log(`Texture loaded from original URL (${arrayBuffer.byteLength} bytes)`);
          }
        }
        
        if (!textureLoaded) {
          console.error("CRITICAL: All texture fetch strategies failed for:", textureFilename);
          console.error("Please upload texture to Supabase Storage bucket 'decor-textures'");
          // Return error immediately - cannot generate render without texture
          return new Response(
            JSON.stringify({
              success: false,
              error: `Texture introuvable: ${textureFilename}. Veuillez contacter l'administrateur pour vérifier le catalogue de décors.`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    } catch (e) {
      console.error("Error fetching/converting texture:", e);
      if (e instanceof Error && e.name === "AbortError") {
        console.error("Texture fetch timed out");
      }
      // Return error for texture fetch failures
      return new Response(
        JSON.stringify({
          success: false,
          error: "Impossible de charger la texture du décor. Veuillez réessayer.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
