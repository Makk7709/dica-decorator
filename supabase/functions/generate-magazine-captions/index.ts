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
  article: string; // Article technique complet
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

    // Build editorial AI prompt with IMAGE ANALYSIS and EXPERT PERSONA
    const systemPrompt = `Tu es Jean-Marc Delacroix, expert reconnu en panneaux stratifiés HPL (High Pressure Laminate) avec 25 ans d'expérience.
Tu écris pour le magazine DICA DÉCOR, la référence en design intérieur et architecture.

TON EXPERTISE TECHNIQUE:
- Spécialiste des stratifiés haute pression (HPL)
- Connaissance approfondie des propriétés: résistance aux chocs, à l'abrasion, aux UV, à l'humidité
- Expert en applications: cabines d'ascenseur, mobilier, façades, agencement, cuisines professionnelles
- Maîtrise des finitions: brillant, mat, texturé, grain bois, effet métal, surface anti-trace
- Certification PEFC, FSC, normes feu M1/B-s1-d0

CATÉGORIE DU DÉCOR: ${decorCategory || 'Stratifié premium'}
CONTEXTE D'APPLICATION: ${contextLabel}

RÈGLE ABSOLUE — ANALYSER L'IMAGE:
Tu vas recevoir une image réelle du projet.
Observe attentivement l'espace visible et base ton article sur CE QUE TU VOIS.

TEXTES À GÉNÉRER:

1. **headline** (titre couverture): 5-12 mots, 2 lignes max, ton premium éditorial

2. **subheadline** (accroche): 15-25 mots, mini paragraphe éditorial

3. **slugline** (signature courte): 3-6 mots, style manuscrit élégant

4. **caption** (légende): 10-15 mots, ton magazine lifestyle

5. **article** (article technique complet): 80-120 mots
   CONTENU OBLIGATOIRE:
   - Analyse de l'espace visible dans l'image
   - Propriétés techniques pertinentes du stratifié HPL pour cet usage
   - Avantages concrets pour les professionnels (architectes, décorateurs)
   - Résistance et durabilité adaptées au contexte
   - Entretien et pérennité
   - Ton: expert mais accessible, jamais commercial
   
   PROPRIÉTÉS TECHNIQUES À MENTIONNER (selon contexte):
   ${decorCategory === 'metal' ? '- Finition métallisée anti-trace\n   - Résistance aux rayures\n   - Effet visuel premium' : ''}
   ${decorCategory === 'bois' ? '- Reproduction fidèle du veinage naturel\n   - Toucher texturé authentique\n   - Stabilité dimensionnelle' : ''}
   ${decorCategory === 'unis' ? '- Uniformité chromatique parfaite\n   - Résistance aux UV (pas de jaunissement)\n   - Surface facile d'entretien' : ''}
   ${decorCategory === 'marbre' ? '- Imitation marbre haute définition\n   - Légèreté vs marbre naturel\n   - Pose simplifiée' : ''}
   - Norme feu adaptée aux ERP (M1 ou B-s1-d0)
   - Résistance à l'humidité pour zones techniques
   - Durabilité garantie 10+ ans en usage intensif

RÈGLES STRICTES:
- Ton expert mais accessible
- Français impeccable
- JAMAIS de ponctuation exclamative
- Focus technique et qualitatif
- Crédibilité d'un vrai article de magazine professionnel

Retourne UNIQUEMENT un JSON valide avec ces 5 clés.`;

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
              description: "Génère headline, sub-headline, slugline, caption ET article technique pour magazine DICA",
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
                  },
                  article: {
                    type: "string",
                    description: "Article technique complet (80-120 mots) avec propriétés HPL, avantages pros, résistance, entretien"
                  }
                },
                required: ["headline", "subheadline", "slugline", "caption", "article"],
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
          caption: `Les finitions DICA subliment cet espace avec raffinement`,
          article: `Les panneaux stratifiés haute pression DICA représentent l'aboutissement de décennies de recherche en matériaux de surface. Leur structure multicouche confère une résistance exceptionnelle aux chocs, à l'abrasion et aux produits chimiques. La technologie HPL garantit une stabilité dimensionnelle parfaite, même dans les environnements exigeants. Les finitions anti-trace facilitent l'entretien quotidien. Certifiés pour les établissements recevant du public (classement feu M1), ces revêtements allient performance technique et esthétique premium pour les professionnels les plus exigeants.`
        };
      }
    }

    // Validate output (ensure all fields exist)
    if (!result || !result.headline || !result.subheadline || !result.slugline || !result.caption || !result.article) {
      console.warn("⚠️ Missing fields in AI response, using fallback");
      result = {
        headline: result?.headline || "L'excellence du design intérieur",
        subheadline: result?.subheadline || `Découvrez comment les finitions DICA transforment les espaces avec une élégance intemporelle et une précision exceptionnelle.`,
        slugline: result?.slugline || "Style et élégance",
        caption: result?.caption || `Les finitions DICA subliment cet espace avec raffinement`,
        article: result?.article || `Les panneaux stratifiés haute pression DICA représentent l'aboutissement de décennies de recherche en matériaux de surface. Leur structure multicouche confère une résistance exceptionnelle aux chocs, à l'abrasion et aux produits chimiques. La technologie HPL garantit une stabilité dimensionnelle parfaite, même dans les environnements exigeants. Les finitions anti-trace facilitent l'entretien quotidien. Certifiés pour les établissements recevant du public (classement feu M1), ces revêtements allient performance technique et esthétique premium pour les professionnels les plus exigeants.`
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
