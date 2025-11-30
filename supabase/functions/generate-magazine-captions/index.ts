import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptionRequest {
  projectName: string;
  projectType: string;
  decorLabel: string;
  decorReference: string;
  decorCategory?: string;
}

interface CaptionResponse {
  headline: string;
  subheadline: string;
  slugline: string;
  caption: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎨 Magazine Captions - Starting generation");

    const { projectName, projectType, decorLabel, decorReference, decorCategory } = await req.json() as CaptionRequest;

    // Validate inputs
    if (!projectName || !projectType || !decorLabel || !decorReference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build editorial AI prompt
    const systemPrompt = `Tu es un rédacteur éditorial expert pour des magazines d'architecture et de décoration haut de gamme (style AD, Architectural Digest).

Tu dois générer 4 types de textes pour un projet DICA DÉCOR:

1. HEADLINE (5-12 mots, 2 lignes max)
   - Style: COUVERTURE MAGAZINE, premium, impactant
   - Ton: émotionnel fort, aspirationnel, luxueux
   - Doit capturer l'essence du projet en quelques mots puissants
   - Exemples: "La nouvelle ère du design intérieur", "Quand l'élégance rencontre l'innovation"
   - Format: 2 lignes maximum, chaque ligne 3-6 mots

2. SUB-HEADLINE (15-25 mots)
   - Style: mini paragraphe éditorial premium
   - Ton: descriptif sophistiqué, contexte émotionnel et technique
   - Complète le headline avec détails précis et impact
   - Exemples: "Dans cet espace contemporain, les finitions DICA révèlent une sophistication inédite. Le décor métal sublime chaque surface avec une précision architecturale."

3. SLUGLINE (3-6 mots maximum)
   - Style: handwritten, poétique, évocateur
   - Ton: émotionnel, sensoriel, inspirant
   - Utilise des mots qui évoquent l'atmosphère et le ressenti
   - Exemples: "Élégance intemporelle", "Lumière et matière", "Harmonie moderne"

4. CAPTION (10-15 mots maximum)
   - Style: éditorial magazine, professionnel mais accessible
   - Ton: descriptif et valorisant, sans marketing forcé
   - Décrit l'ambiance, le décor, et l'impact visuel
   - Exemples: "Les panneaux DICA métallisés révèlent une sophistication subtile dans cet intérieur contemporain"

CONTRAINTES STRICTES:
- JAMAIS de ton marketing ou commercial ("achetez", "découvrez", "offre")
- JAMAIS de ponctuation exclamative
- JAMAIS de répétition du type de projet dans le slugline (si c'est un van, ne pas écrire "Van moderne")
- Les textes doivent s'adapter PARFAITEMENT au projectType fourni
- Valoriser le décor DICA de manière organique et naturelle
- Headline et sub-headline doivent avoir l'impact d'une vraie couverture AD Magazine

Réponds en JSON avec {headline, subheadline, slugline, caption}.`;

    const userPrompt = `Génère un headline, sub-headline, slugline et caption pour ce projet DICA DÉCOR:

Projet: ${projectName}
Type d'espace: ${projectType}
Décor appliqué: ${decorLabel}
Référence: ${decorReference}
${decorCategory ? `Catégorie: ${decorCategory}` : ''}

Le projectType indique le contexte (van, restaurant, bureau, ascenseur, etc.).
Tous les textes doivent refléter l'atmosphère de ce type d'espace avec le décor DICA.

Exemples de qualité attendue:

Van aménagé + décor Metal:
- headline: "La route devient un art de vivre"
- subheadline: "Dans ce van aménagé, les panneaux DICA métal brossé créent un espace nomade où luxe et liberté se rejoignent. Chaque détail respire la sophistication itinérante."
- slugline: "Liberté nomade"
- caption: "L'acier brossé DICA transforme ce van en cocon d'aventure raffiné"

Restaurant + décor Marbre:
- headline: "Quand la gastronomie rencontre le design"
- subheadline: "Les finitions marbre DICA redéfinissent l'expérience culinaire. Dans cet espace, chaque surface raconte une histoire d'élégance intemporelle et de raffinement absolu."
- slugline: "Élégance naturelle"
- caption: "Le marbre DICA sublime l'expérience culinaire dans une ambiance intemporelle"

Bureau + décor Unis blanc:
- headline: "Réinventer l'espace de travail"
- subheadline: "La finition satinée DICA transforme ce bureau en sanctuaire de créativité. Lumière, clarté et design épuré convergent pour inspirer l'excellence quotidienne."
- slugline: "Clarté inspirante"
- caption: "La finition satinée DICA crée un espace de travail lumineux et apaisant"`;

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_magazine_caption",
              description: "Génère headline, sub-headline, slugline et caption pour couverture magazine DICA",
              parameters: {
                type: "object",
                properties: {
                  headline: {
                    type: "string",
                    description: "Headline principal (5-12 mots, 2 lignes max) style couverture magazine"
                  },
                  subheadline: {
                    type: "string",
                    description: "Sub-headline éditorial (15-25 mots) mini paragraphe premium"
                  },
                  slugline: {
                    type: "string",
                    description: "Accroche courte (3-6 mots) style handwritten"
                  },
                  caption: {
                    type: "string",
                    description: "Légende éditoriale (10-15 mots) style magazine"
                  }
                },
                required: ["headline", "subheadline", "slugline", "caption"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_magazine_caption" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Parse tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "generate_magazine_caption") {
      throw new Error("Invalid AI response format");
    }

    const result = JSON.parse(toolCall.function.arguments) as CaptionResponse;

    // Validate output
    if (!result.headline || !result.subheadline || !result.slugline || !result.caption) {
      throw new Error("AI did not generate required fields");
    }

    // Truncate if needed
    if (result.headline.split(' ').length > 15) {
      console.warn("Headline too long, truncating");
      result.headline = result.headline.split(' ').slice(0, 12).join(' ');
    }

    if (result.subheadline.split(' ').length > 30) {
      console.warn("Sub-headline too long, truncating");
      result.subheadline = result.subheadline.split(' ').slice(0, 25).join(' ');
    }

    if (result.slugline.split(' ').length > 8) {
      console.warn("Slugline too long, truncating");
      result.slugline = result.slugline.split(' ').slice(0, 6).join(' ');
    }

    if (result.caption.split(' ').length > 20) {
      console.warn("Caption too long, truncating");
      result.caption = result.caption.split(' ').slice(0, 15).join(' ');
    }

    console.log("✅ Generated captions:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Caption generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        headline: "",
        subheadline: "",
        slugline: "",
        caption: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
