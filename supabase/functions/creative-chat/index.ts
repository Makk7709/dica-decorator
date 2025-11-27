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
      
      const imagePrompt = `Tu es un directeur artistique créatif pour DICA France. Crée une visualisation qui répond à cette demande: "${lastUserMessage}"

${decorContext}

LIBERTÉ CRÉATIVE TOTALE - La seule contrainte stricte:
✓ Utilise UNIQUEMENT les décors DICA du catalogue ci-dessus

Tu peux créer:
- Des mood boards inspirants et esthétiques
- Des compositions visuelles pour la communication marketing
- Des présentations produits créatives et modernes
- Des mises en scène artistiques des décors dans des ambiances variées
- Des photomontages professionnels sans photo de départ
- Des concepts visuels pour inspiration client
- Des planches tendances avec associations de matières
- Tout type de contenu visuel créatif qui valorise les décors DICA

Style libre: moderne, artistique, premium, inspirant, commercial, minimaliste - adapte selon la demande
Format libre: paysage, portrait, carré - selon ce qui sert le mieux le concept
Qualité: toujours haute résolution et professionnelle

Sois audacieux, créatif et esthétique. C'est l'espace où les artisans créent leur communication et inspirent leurs clients.`;

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
    const systemPrompt = `Tu es un directeur artistique et conseiller créatif pour DICA France. Tu aides les artisans à créer du contenu visuel inspirant pour leurs communications et projets clients.

DÉCORS DISPONIBLES:
${decorContext}

TON RÔLE:
- Inspire et propose des concepts créatifs audacieux utilisant les décors DICA
- Suggère des associations de matières, des ambiances, des mises en scène
- Aide à créer des mood boards, planches tendances, visualisations marketing
- Pense communication, esthétique, inspiration client
- Sois créatif, moderne, et orienté impact visuel

CONTRAINTE UNIQUE:
- Utilise UNIQUEMENT les décors du catalogue DICA ci-dessus

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