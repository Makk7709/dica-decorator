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

    // Context safety mapping
    const contextLabels: Record<string, string> = {
      ascenseur: "cabine d'ascenseur",
      van: "van aménagé",
      terrasse: "terrasse",
      restaurant: "restaurant",
      hotel: "hôtel",
      bureau: "bureau",
      cuisine: "cuisine",
      autre: "espace intérieur"
    };

    const contextLabel = contextLabels[projectType] || "espace";
    const forbiddenContexts = Object.keys(contextLabels)
      .filter(k => k !== projectType)
      .map(k => contextLabels[k]);

    // Build editorial AI prompt with context safety
    const systemPrompt = `Tu es un rédacteur éditorial expert pour le magazine AD (Architectural Digest).
Tu dois générer 4 textes de haute qualité pour une présentation éditoriale DICA DÉCOR.

CONTEXTE DU PROJET:
- Type d'espace: ${contextLabel}
- Décor appliqué: ${decorLabel}
- Référence: ${decorReference}
${decorCategory ? `- Catégorie: ${decorCategory}` : ''}

CONTRAINTE CRITIQUE — SÉCURITÉ DE CONTEXTE:
Tu dois ABSOLUMENT respecter le type d'espace "${contextLabel}".
INTERDICTIONS STRICTES — Ne jamais mentionner:
${forbiddenContexts.map(c => `- ${c}`).join('\n')}

Si le projet est un ${contextLabel}, tous les textes doivent parler d'un ${contextLabel}.
Aucune exception. Aucune hallucination de contexte.

TEXTES À GÉNÉRER:

1. **headline** (titre principal couverture):
   - 5 à 12 mots MAXIMUM, sur 2 lignes
   - Ton premium, éditorial, émotionnel
   - Évoque l'excellence du design intérieur dans un ${contextLabel}
   - Format: 2 lignes maximum, chaque ligne 3-6 mots

2. **subheadline** (sous-titre éditorial):
   - 15 à 25 mots MAXIMUM
   - Paragraphe mini éditorial
   - Décrit l'impact du décor dans ce ${contextLabel} spécifiquement

3. **slugline** (accroche courte):
   - 3 à 6 mots MAXIMUM
   - Style manuscrit élégant
   - Évoque une sensation ou un style

4. **caption** (légende magazine):
   - 10 à 15 mots MAXIMUM
   - Ton magazine lifestyle/architecture
   - Décrit le décor dans ce ${contextLabel} précisément

RÈGLES STRICTES:
- Respecter EXACTEMENT le type d'espace: ${contextLabel}
- Langue: français impeccable
- Ton: premium, élégant, émotionnel
- Zero marketing, pure éditorial
- Focus sur le matériau (${decorLabel}) et son intégration
- JAMAIS de ponctuation exclamative
- Headline et sub-headline doivent avoir l'impact d'une vraie couverture AD Magazine

Retourne UNIQUEMENT un JSON valide avec ces 4 clés.`;

    const userPrompt = `Génère un headline, sub-headline, slugline et caption pour ce projet DICA DÉCOR:

Projet: ${projectName}
Type d'espace: ${contextLabel}
Décor appliqué: ${decorLabel}
Référence: ${decorReference}

RAPPEL CRITIQUE:
Le type d'espace est: ${contextLabel}
Tous les textes doivent refléter UNIQUEMENT ce type d'espace avec le décor DICA.
Ne jamais inventer ou mentionner d'autres types d'espaces.

Retourne un JSON avec {headline, subheadline, slugline, caption}.`;

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
