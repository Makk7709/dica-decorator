// DICA Decorator - Creative Chat Function
// Assistant créatif IA avec génération d'images via Gemini 3 Pro Image Preview
// Developed by KOREV AI for DICA France

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Detect if user wants an image generation
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const imageKeywords = [
      // Création
      "mood board", "moodboard", "plaquette", "visualise", "visualisation", 
      "image", "photo", "crée", "créer", "génère", "générer", "imagine", 
      "design", "montre", "compose", "création", "visuel", "présentation", "planche",
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
      
      // Extract key elements from user request
      const userRequest = messages[messages.length - 1]?.content || "";
      
      // Detect what type of space/object the user wants
      const spaceKeywords = {
        van: ["van", "volkswagen", "vw", "combi", "fourgon", "camper", "camping-car", "aménagé"],
        cuisine: ["cuisine", "kitchen", "îlot", "plan de travail", "crédence"],
        sdb: ["salle de bain", "bathroom", "douche", "baignoire", "wc", "toilettes"],
        terrasse: ["terrasse", "balcon", "extérieur", "patio", "pergola"],
        ascenseur: ["ascenseur", "cabine", "lift", "elevator"],
        bureau: ["bureau", "office", "desk", "workspace"],
        salon: ["salon", "living", "séjour"],
        meuble: ["meuble", "armoire", "placard", "rangement", "commode", "table"]
      };
      
      let detectedSpace = "espace personnalisé";
      const lowerRequest = userRequest.toLowerCase();
      for (const [space, keywords] of Object.entries(spaceKeywords)) {
        if (keywords.some(kw => lowerRequest.includes(kw))) {
          detectedSpace = space;
          break;
        }
      }
      console.log("Detected space type:", detectedSpace);

      // Build multi-image description
      let imageDescription = "";
      if (allSourceImages.length > 0) {
        if (allSourceImages.length === 1) {
          const label = allImageLabels[0] || "Image source";
          imageDescription = `
📷 IMAGE SOURCE FOURNIE - "${label}":
- REPRODUIS fidèlement cet espace/objet
- CONSERVE la structure, les proportions et l'angle de vue
- APPLIQUE les panneaux DICA sur les surfaces planes visibles
- NE CHANGE PAS le type d'espace (si c'est un van, garde un van)`;
        } else {
          imageDescription = `
📷 ${allSourceImages.length} IMAGES À COMBINER:
${allImageLabels.map((label, i) => `  • Image ${i + 1}: ${label || "Élément"}`).join('\n')}

INSTRUCTIONS DE COMBINAISON:
- FUSIONNE ces éléments dans UNE SEULE scène cohérente
- RESPECTE chaque élément fourni
- INTÈGRE les panneaux DICA de manière visible et réaliste`;
        }
      }
      
      // Build the master prompt - ULTRA STRICT
      const basePrompt = `═══════════════════════════════════════════════════════════════════
🎯 MISSION CRITIQUE - GÉNÉRATION D'IMAGE DICA
═══════════════════════════════════════════════════════════════════

DEMANDE CLIENT (À RESPECTER À 100%):
"${userRequest}"

TYPE D'ESPACE DÉTECTÉ: ${detectedSpace.toUpperCase()}

═══════════════════════════════════════════════════════════════════
🚨 RÈGLE ABSOLUE #1 - AUCUNE EXCEPTION POSSIBLE
═══════════════════════════════════════════════════════════════════

LE TYPE D'ESPACE EST: ${detectedSpace.toUpperCase()}

TU DOIS CRÉER EXACTEMENT: ${detectedSpace.toUpperCase()}

⚠️ ATTENTION CRITIQUE:
- Si c'est un VAN → Crée l'INTÉRIEUR d'un VAN AMÉNAGÉ (camping-car, fourgon)
- Si c'est une CUISINE → Crée une CUISINE avec meubles, plan de travail
- Si c'est un ASCENSEUR → Crée une CABINE D'ASCENSEUR
- Si c'est une TERRASSE → Crée un ESPACE EXTÉRIEUR/BALCON

🚫 INTERDICTION ABSOLUE:
- NE CRÉE JAMAIS UN ASCENSEUR si le client demande un VAN
- NE CRÉE JAMAIS UN VAN si le client demande une CUISINE
- NE TE LAISSE PAS INFLUENCER par les "contextes d'usage" des décors
- Les contextes d'usage (ascenseur, van, terrasse) sont des SUGGESTIONS, pas des ORDRES

VÉRIFIE AVANT DE GÉNÉRER:
✓ Est-ce que je crée bien un ${detectedSpace} ?
✓ Est-ce que l'image correspondra à la demande "${userRequest}" ?
✓ Ai-je ignoré les "contextes d'usage" des décors pour respecter la demande ?

═══════════════════════════════════════════════════════════════════
⚠️ RÈGLES NON-NÉGOCIABLES - ÉCHEC = IMAGE REJETÉE
═══════════════════════════════════════════════════════════════════

1. ✅ SUJET OBLIGATOIRE: ${detectedSpace.toUpperCase()}
   → Tu DOIS créer un(e) ${detectedSpace}, PAS autre chose
   → Les décors peuvent être utilisés PARTOUT, même si leur "contexte d'usage" dit autre chose
   → SEULE la demande du client compte, pas les métadonnées des décors

2. ✅ PANNEAUX DICA OBLIGATOIREMENT VISIBLES
   → Les panneaux stratifiés DICA doivent occuper MIN 40% de l'image
   → Ils doivent être le SUJET PRINCIPAL de la visualisation
   → Montrer clairement la TEXTURE et la QUALITÉ des panneaux
   → Le client doit voir EXACTEMENT à quoi ressemblera son projet

3. ✅ QUALITÉ PHOTOGRAPHIQUE PREMIUM
   → Photo de catalogue professionnel haut de gamme
   → Éclairage naturel réaliste (pour un van, lumière douce comme un jour de pluie)
   → Netteté maximale sur les panneaux DICA
   → Rendu hyperréaliste type publicité luxe

═══════════════════════════════════════════════════════════════════
🎯 EXEMPLES CONCRETS PAR TYPE D'ESPACE
═══════════════════════════════════════════════════════════════════

SI C'EST UN VAN:
- Intérieur d'un fourgon aménagé / camping-car
- Avec banquettes, rangements, mini-cuisine
- Espace cosy et compact
- Lumière naturelle venant des fenêtres latérales
- Panneaux DICA sur les murs intérieurs, placards, comptoir

SI C'EST UNE CUISINE:
- Espace cuisine avec îlot ou plan de travail
- Meubles hauts et bas
- Crédence derrière la zone de cuisson
- Panneaux DICA sur les façades de meubles ou la crédence

SI C'EST UN ASCENSEUR:
- Cabine d'ascenseur avec portes métalliques
- Parois verticales
- Rampes de maintien
- Panneaux DICA sur les murs de la cabine

${imageDescription}

═══════════════════════════════════════════════════════════════════
📦 CATALOGUE PANNEAUX DICA DISPONIBLES
═══════════════════════════════════════════════════════════════════
${decorContext}

⚠️ IMPORTANT: Les "contextes d'usage" listés (ascenseur, van, terrasse) 
sont des EXEMPLES, pas des LIMITATIONS. Tous les décors peuvent être 
utilisés dans N'IMPORTE QUEL espace selon la demande du client.

═══════════════════════════════════════════════════════════════════
🎨 RÈGLES D'APPLICATION DES PANNEAUX PAR CATÉGORIE
═══════════════════════════════════════════════════════════════════

MÉTAL (Inox brossé, Aluminium, etc.):
- Surface brillante avec reflets directionnels
- Effet brossé visible
- Lumière se reflétant de manière réaliste

UNIS (Couleurs unies mates):
- Surface parfaitement lisse et mate
- Couleur uniforme sans variations
- Pas de reflets métalliques

BOIS (Chêne, Noyer, etc.):
- Veinage naturel visible et réaliste
- Texture bois authentique
- Tons chauds naturels

MARBRE (Carrare, Noir, etc.):
- Veines minérales naturelles
- Surface légèrement brillante
- Motifs uniques et élégants

═══════════════════════════════════════════════════════════════════
🚨 RÈGLES IMPÉRATIVES DE FIDÉLITÉ TEXTURE
═══════════════════════════════════════════════════════════════════

1. TEXTURE SOURCE EXCLUSIVE
   → Le décor provient UNIQUEMENT des panneaux DICA du catalogue
   → JAMAIS inventer, modifier ou recolorer un décor

2. FIDÉLITÉ ABSOLUE DES PANNEAUX DICA
   → Teinte exacte (pas de shift colorimétrique)
   → Motif intact (pas de déformation)
   → Grain précis (direction, densité, échelle)
   → Reflets naturels selon le matériau

3. ALIGNEMENT DU GRAIN OBLIGATOIRE
   → Bois: veinage cohérent avec la direction naturelle
   → Métal brossé: lignes de brossage correctement orientées
   → Marbre: veines continues et réalistes

4. SI IMAGE SOURCE FOURNIE
   → Analyser l'espace AVANT de générer
   → Respecter la structure et les proportions
   → Appliquer les panneaux sur surfaces compatibles uniquement

═══════════════════════════════════════════════════════════════════
🚫 INTERDICTIONS ABSOLUES
═══════════════════════════════════════════════════════════════════
- ❌ PAS de scène urbaine/rue si non demandé
- ❌ PAS de personnages sauf si demandé
- ❌ PAS d'environnement différent de la demande
- ❌ PAS d'image sans panneaux DICA visibles
- ❌ PAS de qualité médiocre ou floue
- ❌ PAS d'invention ou d'interprétation libre
- ❌ NE CHANGE JAMAIS LE TYPE D'ESPACE (van ≠ ascenseur ≠ cuisine)
- ❌ PAS de modification des couleurs/teintes des panneaux DICA
- ❌ PAS de texture inventée ou extrapolée

═══════════════════════════════════════════════════════════════════
✅ CHECKLIST FINALE AVANT GÉNÉRATION
═══════════════════════════════════════════════════════════════════
Avant de générer l'image, VÉRIFIE:
□ L'espace créé est bien un ${detectedSpace.toUpperCase()}
□ L'image correspondra à la demande: "${userRequest}"
□ Les panneaux DICA sont clairement visibles (40%+ de l'image)
□ La qualité est professionnelle et réaliste
□ Tu n'as PAS créé un ascenseur si la demande était un van
□ Tu n'as PAS créé un autre type d'espace que celui demandé

═══════════════════════════════════════════════════════════════════
✨ RÉSULTAT ATTENDU
═══════════════════════════════════════════════════════════════════
Une image de ${detectedSpace} aménagé(e) avec des panneaux DICA,
de qualité catalogue professionnel, où les panneaux sont mis en
valeur et clairement visibles. Le client doit pouvoir se projeter
immédiatement dans son futur projet.

EFFET WOW OBLIGATOIRE - Le client doit être impressionné dès la première image.
═══════════════════════════════════════════════════════════════════

${showReferences ? `
═══════════════════════════════════════════════════════════════════
🏷️ ANNOTATIONS RÉFÉRENCES DICA - OBLIGATOIRE
═══════════════════════════════════════════════════════════════════

Tu DOIS ajouter sur l'image les références des décors DICA utilisés.

FORMAT D'ANNOTATION (style catalogue professionnel):
• Police: sans-serif élégante et moderne
• Fond: semi-transparent (noir ou blanc selon contraste)
• Position: en bas de l'image ou près des surfaces décorées
• Taille: lisible mais pas dominante

STRUCTURE DES ANNOTATIONS:
┌─────────────────────────────┐
│  Nom du décor               │
│  (Réf: CODE_REFERENCE)      │
└─────────────────────────────┘

EXEMPLES:
• "Inox Brossé 3020BN"
• "Uni Olive FC (Réf: 3179_SPA_FC)"
• "Marble décor - Laiton Brossé 3012 FC"

Si plusieurs décors sont visibles, annote CHACUN d'eux.
Les annotations doivent être professionnelles et intégrées harmonieusement.
═══════════════════════════════════════════════════════════════════
` : ''}`;

      console.log("Full image prompt length:", basePrompt.length, "characters");
      console.log("Show references:", showReferences);

      // Build request parts
      const requestParts: any[] = [{ text: basePrompt }];
      
      // Add ALL source images
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

      console.log(`Sending request with ${allSourceImages.length} source images`);

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

      return new Response(JSON.stringify({ 
        type: "image",
        imageUrl,
        text
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Text Chat Mode (Streaming)
    // ========================================================================
    
    const systemPrompt = `Tu es un assistant créatif pour DICA France.

🎯 RÈGLE ABSOLUE: Tu DOIS suivre EXACTEMENT ce que demande le client

DÉCORS DISPONIBLES:
${decorContext}

⚠️ DIRECTIVES CRITIQUES:
1. Lis attentivement la demande du client
2. Crée UNIQUEMENT ce qui est demandé
3. N'invente PAS de contenu différent de la demande
4. N'utilise PAS ta mémoire des conversations précédentes
5. Chaque demande est INDÉPENDANTE

TON RÔLE:
- Conseiller sur les décors DICA disponibles
- Suggérer des associations de matières pertinentes
- Répondre précisément aux questions sur les décors
- Aider le client à choisir les bons décors pour son projet

🚫 INTERDICTIONS ABSOLUES:
- Ne suggère PAS des ascenseurs si non demandés
- Ne suggère PAS des mood boards si non demandés
- N'invente PAS un contexte différent de celui demandé
- Ne réutilise PAS d'éléments de conversations précédentes
- ❌ NE DONNE JAMAIS les URLs ou liens vers les textures
- ❌ NE LISTE JAMAIS les chemins des fichiers images
- ❌ NE PARTAGE JAMAIS les liens Supabase des décors

✅ OBLIGATIONS:
- Utilise UNIQUEMENT les décors du catalogue DICA
- Reste dans le contexte demandé par le client
- Si le client veut visualiser un aménagement → DIS-LUI D'UPLOADER UNE PHOTO et de décrire ce qu'il veut
- Si le client a uploadé une photo et veut appliquer des décors → GÉNÈRE UNE IMAGE (ne donne pas les liens)

💡 QUAND LE CLIENT VEUT VISUALISER:
Si le client demande de visualiser, aménager, décorer, ou appliquer des couleurs sur une photo:
→ Génère une IMAGE avec les décors demandés
→ Ne donne PAS les liens vers les textures
→ Ne liste PAS les URLs des fichiers
→ CRÉE directement le rendu visuel

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
