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
    const { messages, decorContext } = await req.json();
    console.log('Creative chat request received');
    console.log('- Messages:', messages.length);
    console.log('- Decor context length:', decorContext?.length || 0, 'characters');
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
      
      if (!decorContext || decorContext.trim().length < 50) {
        console.error("Decor context is empty or too short!");
        throw new Error("Contexte des décors non disponible");
      }
      
      const imagePrompt = `🧠 MODE: ASSISTANT_CREA (Liberté créative contrôlée)

Tu es un directeur artistique pour DICA France. Crée une visualisation qui répond à: "${lastUserMessage}"

${decorContext}

RÈGLES DU MODE CRÉATIF:
✓ Tu PEUX inventer une scène réaliste d'usage (ex: cabine d'ascenseur moderne, van aménagé premium, terrasse design)
✓ Tu DOIS absolument utiliser les décors DICA du catalogue ci-dessus
✓ Tu PEUX imaginer: proportions, architecture, ambiance lumineuse, contexte décoratif
✓ Tu DOIS rester dans le même type d'environnement si un useCase est mentionné (ascenseur, van, terrasse)

CONTRAINTES DE COHÉRENCE:
- Une cabine d'ascenseur reste une cabine d'ascenseur (pas une cuisine, pas un loft)
- Un van aménagé reste un van (pas une chambre, pas un bureau)
- Une terrasse reste une terrasse (pas un jardin tropical, pas une piscine)
- Pas de fantaisie hors sujet métier

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

      console.log("Full image prompt length:", imagePrompt.length, "characters");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            { role: "user", content: imagePrompt }
          ],
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
    const systemPrompt = `Tu es un directeur artistique et conseiller créatif pour DICA France, opérant en 🧠 MODE ASSISTANT_CREA.

DÉCORS DISPONIBLES:
${decorContext}

TON RÔLE (mode créatif avec liberté contrôlée):
- Inspire et propose des concepts créatifs audacieux utilisant UNIQUEMENT les décors DICA
- Suggère des associations de matières, des ambiances, des mises en scène réalistes
- Aide à créer des mood boards, planches tendances, visualisations marketing premium
- Pense communication professionnelle, esthétique DICA, inspiration client
- Reste dans le métier: ascenseur = ascenseur, van = van, terrasse = terrasse
- Sois créatif mais crédible et cohérent avec l'univers DICA France

CONTRAINTES:
- Utilise UNIQUEMENT les décors du catalogue DICA ci-dessus
- Respecte les propriétés des matériaux (Métal/Unis/Bois/Marbres/Déco)
- Reste dans des scénarios d'usage réalistes pour le métier
- Qualité visuelle: photographique, premium, marketing haut de gamme

Réponds en français de manière inspirante et professionnelle. Encourage l'utilisateur à demander des visualisations en utilisant des verbes d'action: "crée", "imagine", "montre-moi", "visualise", "compose", "génère".`;

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