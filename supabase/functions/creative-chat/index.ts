import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, decorContext, sourceImageUrl } = await req.json();
    console.log('Creative chat request received');
    console.log('- Messages:', messages.length);
    console.log('- Decor context length:', decorContext?.length || 0, 'characters');
    console.log('- Current source image URL:', sourceImageUrl || 'none');
    
    // Find all source images from conversation history
    const sourceImages = messages
      .filter((m: any) => m.role === 'user' && m.sourceImageUrl)
      .map((m: any) => m.sourceImageUrl);
    console.log('- Source images in history:', sourceImages.length);
    
    console.log('- Decor context preview:', decorContext?.substring(0, 200));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Detect if user wants an image generation
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const imageKeywords = ["mood board", "moodboard", "plaquette", "visualise", "visualisation", "image", "photo", "crée", "créer", "génère", "générer", "imagine", "design", "montre", "compose", "création", "visuel", "présentation", "planche"];
    const wantsImage = imageKeywords.some(keyword => lastUserMessage.includes(keyword));

    if (wantsImage) {
      // Generate image using Gemini 3 Pro Image Preview
      console.log("=== IMAGE GENERATION REQUESTED ===");
      console.log("User message:", lastUserMessage);
      console.log("Available decors context:", decorContext?.substring(0, 500));
      
      // Find the most recent source image from history or current request
      const mostRecentSourceImage = sourceImageUrl || sourceImages[sourceImages.length - 1];
      console.log("Most recent source image:", mostRecentSourceImage || 'none');
      
      if (!decorContext || decorContext.trim().length < 50) {
        console.error("Decor context is empty or too short!");
        throw new Error("Contexte des décors non disponible");
      }
      
      const basePrompt = `🎯 DIRECTIVE ABSOLUE: TU DOIS CRÉER EXACTEMENT CE QUE LE CLIENT DEMANDE

Demande du client: "${lastUserMessage}"

⚠️ RÈGLES STRICTES - NON NÉGOCIABLES:
1. Tu DOIS créer EXACTEMENT ce que demande le client, RIEN D'AUTRE
2. Tu NE DOIS PAS inventer de scénario si le client n'en demande pas
3. Tu NE DOIS PAS créer de mood board sauf si explicitement demandé
4. Tu NE DOIS PAS créer d'ascenseur sauf si explicitement demandé dans la demande
5. Si le client demande "une terrasse", crée une terrasse (pas un ascenseur)
6. Si le client demande "un van", crée un van (pas un ascenseur)
7. Si le client demande "une salle de bain", crée une salle de bain (pas un ascenseur)
8. OUBLIE toutes tes générations précédentes - seule compte la demande actuelle

${mostRecentSourceImage ? `
📷 IMAGE SOURCE FOURNIE PAR LE CLIENT:
Tu DOIS utiliser cette image comme référence OBLIGATOIRE. Cette photo montre ce que le client veut visualiser.
- Analyse l'espace visible dans cette photo
- Comprends le type d'environnement (terrasse, van, salle de bain, cuisine, etc.)
- Respecte les proportions et volumes de cette photo
- Applique les décors DICA sur les surfaces compatibles de CETTE photo
- Ne change PAS le type d'environnement montré dans la photo
` : ''}

${decorContext}

🚫 INTERDICTIONS ABSOLUES:
- N'invente JAMAIS un type d'environnement différent de celui demandé
- Ne crée JAMAIS un ascenseur si ce n'est pas demandé
- Ne crée JAMAIS un mood board si ce n'est pas demandé
- N'utilise PAS ta mémoire des conversations précédentes
- Ne suppose RIEN qui n'est pas dans la demande actuelle

✅ OBLIGATIONS:
- Utilise UNIQUEMENT les décors DICA du catalogue
- Crée EXACTEMENT ce que le client demande
- Si une photo source est fournie, suis-la STRICTEMENT
- Respecte le type d'environnement demandé (terrasse = terrasse, van = van, etc.)

QUALITÉ VISUELLE:
- Rendu photographique haut de gamme
- Style marketing premium DICA
- Comme si DICA avait rénové un environnement modèle pour son catalogue
- Crédibilité réaliste maximale

Types de créations possibles:
- Mood boards inspirants et esthétiques
- Compositions visuelles pour communication marketing
- Présentations produits créatives et modernes
- Mises en scène artistiques des décors dans des ambiances variées
- Concepts visuels pour inspiration client
- Planches tendances avec associations de matières

Applique les décors DICA selon leur matériau:
- Métal → brossage + reflets directionnels
- Unis → matte, uniforme, sans reflets métalliques
- Bois → grain et ton bois cohérents
- Marbres → veines minérales, pas d'effet chromé
- Déco → motif intact, contrastes respectés

Le résultat doit inspirer et convaincre les clients tout en restant crédible professionnellement.`;

      console.log("Full image prompt length:", basePrompt.length, "characters");

      // Build messages array with source image if available
      const imageMessages = mostRecentSourceImage 
        ? [
            {
              role: "user",
              content: [
                { type: "text", text: basePrompt },
                { type: "image_url", image_url: { url: mostRecentSourceImage } }
              ]
            }
          ]
        : [
            { role: "user", content: basePrompt }
          ];

      console.log("Sending request with source image:", mostRecentSourceImage ? 'YES' : 'NO');

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: imageMessages,
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = data.choices?.[0]?.message?.content || "Voici votre visualisation :";

      return new Response(JSON.stringify({ 
        type: "image",
        imageUrl,
        text: textContent
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text-only response using streaming
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
- Aider à visualiser des concepts créatifs DEMANDÉS par le client
- Répondre précisément aux questions sur les décors

🚫 INTERDICTIONS:
- Ne suggère PAS des ascenseurs si non demandés
- Ne suggère PAS des mood boards si non demandés
- N'invente PAS un contexte différent de celui demandé
- Ne réutilise PAS d'éléments de conversations précédentes

✅ OBLIGATIONS:
- Utilise UNIQUEMENT les décors du catalogue DICA
- Reste dans le contexte demandé par le client
- Propose des visualisations UNIQUEMENT si demandées

Réponds en français de manière claire et professionnelle.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédit insuffisant, veuillez recharger votre compte Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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