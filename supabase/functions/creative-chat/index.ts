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
    console.log('Creative chat request received with', messages.length, 'messages');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Detect if user wants an image generation
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const imageKeywords = ["mood board", "moodboard", "plaquette", "visualise", "visualisation", "image", "photo", "crée", "créer", "génère", "imagine", "design"];
    const wantsImage = imageKeywords.some(keyword => lastUserMessage.includes(keyword));

    if (wantsImage) {
      // Generate image using Gemini 3 Pro Image Preview
      console.log("Generating image with Gemini 3 Pro Image Preview");
      
      const imagePrompt = `Crée une visualisation professionnelle haute qualité pour DICA France basée sur cette demande: ${lastUserMessage}

DÉCORS DISPONIBLES À UTILISER:
${decorContext}

RÈGLES DE CRÉATION:
- Utilise UNIQUEMENT les décors DICA listés ci-dessus
- Crée une composition professionnelle et esthétique
- Inclus les noms et références des décors dans la composition
- Style: moderne, épuré, premium
- Format: paysage (16:9)
- Qualité: haute résolution`;

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
    const systemPrompt = `Tu es un assistant créatif spécialisé dans la visualisation de décors DICA France.
    
DÉCORS DISPONIBLES:
${decorContext}

RÈGLES IMPORTANTES:
- Tu dois UNIQUEMENT utiliser les décors DICA listés ci-dessus
- Tu peux suggérer des associations de décors pour différents espaces
- Réponds en français de manière professionnelle et créative
- Utilise les noms et références exactes des décors DICA
- Si l'utilisateur veut une visualisation graphique, suggère-lui d'utiliser des mots-clés comme "mood board", "plaquette", "visualise", "crée", "imagine"`;

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