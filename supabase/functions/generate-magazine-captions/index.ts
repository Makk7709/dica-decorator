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

Tu dois générer 2 types de textes pour un visuel de projet DICA DÉCOR:

1. SLUGLINE (3-6 mots maximum)
   - Style: handwritten, poétique, évocateur
   - Ton: émotionnel, sensoriel, inspirant
   - Utilise des mots qui évoquent l'atmosphère et le ressenti
   - Exemples: "Élégance intemporelle", "Lumière et matière", "Harmonie moderne"

2. CAPTION (10-15 mots maximum)
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
- Rester court, impactant, magazine-quality

Réponds en JSON avec {slugline, caption}.`;

    const userPrompt = `Génère un slugline et une caption pour ce projet DICA DÉCOR:

Projet: ${projectName}
Type d'espace: ${projectType}
Décor appliqué: ${decorLabel}
Référence: ${decorReference}
${decorCategory ? `Catégorie: ${decorCategory}` : ''}

Le projectType indique le contexte (van, restaurant, bureau, ascenseur, etc.).
Le slugline et la caption doivent refléter l'atmosphère de ce type d'espace avec le décor DICA.

Exemples de qualité attendue:
- Van aménagé + décor Metal → slugline: "Liberté nomade", caption: "L'acier brossé DICA transforme ce van en cocon d'aventure raffiné"
- Restaurant + décor Marbre → slugline: "Élégance naturelle", caption: "Le marbre DICA sublime l'expérience culinaire dans une ambiance intemporelle"
- Bureau + décor Unis blanc → slugline: "Clarté inspirante", caption: "La finition satinée DICA crée un espace de travail lumineux et apaisant"`;

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
              description: "Génère un slugline et une caption pour un visuel magazine DICA",
              parameters: {
                type: "object",
                properties: {
                  slugline: {
                    type: "string",
                    description: "Accroche courte (3-6 mots) style handwritten"
                  },
                  caption: {
                    type: "string",
                    description: "Légende éditoriale (10-15 mots) style magazine"
                  }
                },
                required: ["slugline", "caption"],
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
    if (!result.slugline || !result.caption) {
      throw new Error("AI did not generate required fields");
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
        slugline: "",
        caption: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
