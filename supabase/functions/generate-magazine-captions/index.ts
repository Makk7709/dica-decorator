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
  imageUrl?: string; // Image to analyze for context-aware captions
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

    const { projectName, projectType, decorLabel, decorReference, decorCategory, imageUrl } = await req.json() as CaptionRequest;

    // Validate inputs
    if (!projectName || !projectType) {
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

    // Build editorial AI prompt with IMAGE ANALYSIS
    const systemPrompt = `Tu es un rédacteur éditorial expert pour le magazine AD (Architectural Digest).
Tu vas ANALYSER UNE IMAGE RÉELLE pour générer 4 textes de haute qualité pour une présentation éditoriale DICA DÉCOR.

RÈGLE ABSOLUE — ANALYSER L'IMAGE:
Tu vas recevoir une image réelle du projet.
Tu DOIS observer attentivement ce qui est visible dans l'image avant d'écrire quoi que ce soit.
INTERDIT d'inventer ou supposer un contexte qui n'est pas dans l'image.

CONTEXTE SUGGÉRÉ (à vérifier dans l'image):
- Type d'espace suggéré: ${contextLabel}
- Catégorie de finitions: ${decorCategory || 'Finitions premium'}

IMPORTANT — ANALYSE VISUELLE PRIORITAIRE:
1. Regarde l'image et identifie CE QUI EST VRAIMENT VISIBLE
2. Si l'image montre une terrasse de café → parle de terrasse
3. Si l'image montre un bureau → parle de bureau
4. Si l'image montre une cabine d'ascenseur → parle d'ascenseur
5. NE JAMAIS mentionner un espace qui n'est pas dans l'image

IMPORTANT — TEXTES GÉNÉRIQUES:
NE PAS mentionner de référence ou nom de décor spécifique (pas de "8099", "3012", "marbre", "laiton", etc.).
Les textes doivent être universels pour toute la gamme de finitions DICA.

TEXTES À GÉNÉRER:

1. **headline** (titre principal couverture):
   - 5 à 12 mots MAXIMUM, sur 2 lignes
   - Ton premium, éditorial, émotionnel
   - Évoque l'excellence du design intérieur BASÉ SUR L'IMAGE
   - Parle de l'élégance des finitions DICA sans mentionner de matériau précis
   - Format: 2 lignes maximum, chaque ligne 3-6 mots

2. **subheadline** (sous-titre éditorial):
   - 15 à 25 mots MAXIMUM
   - Paragraphe mini éditorial
   - Décrit comment les finitions DICA transforment l'espace VISIBLE DANS L'IMAGE
   - Reste générique, applicable à plusieurs finitions

3. **slugline** (accroche courte):
   - 3 à 6 mots MAXIMUM
   - Style manuscrit élégant
   - Évoque une sensation ou un style générique
   - Exemple: "Élégance intemporelle", "Luxe raffiné"

4. **caption** (légende magazine):
   - 10 à 15 mots MAXIMUM
   - Ton magazine lifestyle/architecture
   - Décrit les finitions DICA dans l'espace VU DANS L'IMAGE
   - Pas de référence spécifique de matériau

RÈGLES STRICTES:
- ANALYSER L'IMAGE avant tout
- Décrire CE QUI EST VISIBLE, pas ce qui est suggéré
- Langue: français impeccable
- Ton: premium, élégant, émotionnel
- Zero marketing, pure éditorial
- Focus sur la qualité des finitions DICA, pas sur un produit précis
- JAMAIS de ponctuation exclamative
- Headline et sub-headline doivent avoir l'impact d'une vraie couverture AD Magazine

Retourne UNIQUEMENT un JSON valide avec ces 4 clés.`;

    // Build user message with IMAGE
    const userMessageContent: any[] = [
      {
        type: "text",
        text: `Analyse cette image réelle et génère des textes éditoriaux pour le magazine DICA DÉCOR.

Projet: ${projectName}
Type suggéré: ${contextLabel}
Catégorie: ${decorCategory || 'Finitions premium'}

CRITIQUE — ANALYSE L'IMAGE:
Regarde attentivement l'image. Identifie l'espace réel visible (terrasse, bureau, ascenseur, etc.).
Base tes textes UNIQUEMENT sur ce que tu vois, pas sur le "type suggéré".

Retourne un JSON avec {headline, subheadline, slugline, caption}.`
      }
    ];

    // Add image if provided
    if (imageUrl) {
      userMessageContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }

    // Call Lovable AI with tool calling for structured output (with image analysis)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageUrl ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash", // Pro for vision
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessageContent }
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

    // Parse tool call response (primary method)
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: CaptionResponse | null = null;
    
    if (toolCall && toolCall.function?.name === "generate_magazine_caption") {
      // Standard tool call response
      result = JSON.parse(toolCall.function.arguments) as CaptionResponse;
      console.log("✅ Parsed from tool_calls");
    } else {
      // Fallback: try parsing content directly (sometimes AI puts JSON in content)
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          // Try to extract JSON from content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]) as CaptionResponse;
            console.log("✅ Parsed from content JSON");
          }
        } catch (e) {
          console.error("Failed to parse content as JSON:", e);
        }
      }
      
      // If still no result, use generic fallback based on image context
      if (!result) {
        console.warn("⚠️ No valid AI response, using generic fallback");
        result = {
          headline: "L'excellence du design intérieur",
          subheadline: `Découvrez comment les finitions DICA transforment les espaces avec une élégance intemporelle et une précision exceptionnelle.`,
          slugline: "Style et élégance",
          caption: `Les finitions DICA subliment cet espace avec raffinement`
        };
      }
    }

    // Validate output (ensure all fields exist)
    if (!result || !result.headline || !result.subheadline || !result.slugline || !result.caption) {
      console.warn("⚠️ Missing fields in AI response, using fallback");
      result = {
        headline: result?.headline || "L'excellence du design intérieur",
        subheadline: result?.subheadline || `Découvrez comment les finitions DICA transforment les espaces avec une élégance intemporelle et une précision exceptionnelle.`,
        slugline: result?.slugline || "Style et élégance",
        caption: result?.caption || `Les finitions DICA subliment cet espace avec raffinement`
      };
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
