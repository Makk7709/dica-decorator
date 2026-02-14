import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    // ========================================================================
    // Authentication Check - Verify user is logged in
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let payload: Record<string, unknown> | null = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.exp && (payload.exp as number) < Math.floor(Date.now() / 1000)) payload = null;
      }
    } catch { payload = null; }
    
    if (!payload?.sub || typeof payload.sub !== "string") {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user: verifiedUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(payload.sub as string);
    
    if (authError || !verifiedUser) {
      return new Response(
        JSON.stringify({ error: "Non autorisé - Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const user = verifiedUser;
    console.log("Authenticated user:", user.id);
    // ========================================================================

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

    // Build editorial AI prompt with IMAGE ANALYSIS and STORYTELLING + EXPERTISE
    const systemPrompt = `Tu es rédacteur en chef pour DICA DÉCOR, un magazine premium de décoration intérieure.
Tu allies l'élégance narrative d'AD Magazine avec une expertise subtile sur les matériaux.

TON STYLE:
- Storytelling élégant et évocateur (comme les magazines de luxe)
- Quelques touches d'expertise technique (sans jargon lourd)
- Émotionnel et inspirant, jamais froid ou commercial
- Tu racontes une histoire, pas un rapport technique

CATÉGORIE DU DÉCOR: ${decorCategory || 'Finitions premium'}
CONTEXTE: ${contextLabel}

RÈGLE: ANALYSER L'IMAGE pour baser ton récit sur ce que tu vois réellement.

🚨 OBLIGATOIRE: Tu DOIS générer les 5 textes suivants (pas 4, pas 3, mais 5) :

1. **headline** (titre couverture): 5-12 mots, 2 lignes max, poétique et premium

2. **subheadline** (accroche): 15-25 mots, évocateur et élégant

3. **slugline** (signature): 3-6 mots, comme une signature manuscrite

4. **caption** (légende): 10-15 mots, ton lifestyle raffiné

5. **article** (récit éditorial - OBLIGATOIRE): 80-120 mots minimum
   
   ⚠️ L'ARTICLE EST OBLIGATOIRE - Ne JAMAIS l'omettre !
   
   STYLE NARRATIF pour l'article:
   - Commence par une observation poétique de l'espace
   - Évoque l'atmosphère, la lumière, les sensations
   - Glisse subtilement 2-3 qualités techniques (résistance, durabilité, entretien facile)
   - Termine sur l'émotion ou l'expérience que procure cet espace
   
   ÉQUILIBRE À RESPECTER:
   - 70% storytelling et émotion
   - 30% expertise technique (intégrée naturellement)
   
   EXEMPLES DE FORMULATIONS ÉLÉGANTES pour l'article:
   - "La lumière caresse les surfaces aux reflets subtils..."
   - "Une matière qui traverse le temps sans jamais faillir..."
   - "L'œil se pose, la main effleure, l'esprit s'apaise..."
   - "Derrière cette élégance, une technologie qui défie l'usure..."
   - "Les surfaces respirent avec l'espace, dans une harmonie parfaite..."
   - "Chaque détail raconte une histoire de savoir-faire..."
   
   ${decorCategory === 'metal' ? 'TOUCHE TECHNIQUE pour l\'article: évoquer les reflets, la modernité, la facilité d\'entretien, les surfaces anti-trace' : ''}
   ${decorCategory === 'bois' ? 'TOUCHE TECHNIQUE pour l\'article: évoquer la chaleur naturelle, l\'authenticité du toucher, la pérennité, la stabilité dimensionnelle' : ''}
   ${decorCategory === 'unis' ? 'TOUCHE TECHNIQUE pour l\'article: évoquer la pureté des lignes, l\'intemporalité, la sérénité, la lumière diffuse' : ''}
   ${decorCategory === 'marbre' ? 'TOUCHE TECHNIQUE pour l\'article: évoquer le prestige minéral, la légèreté inattendue, la perfection des veines, la reproduction haute définition' : ''}

RÈGLES GÉNÉRALES:
- Français littéraire et élégant
- JAMAIS de ponctuation exclamative
- Créer du désir, pas informer froidement
- Le lecteur doit ressentir l'espace

⚠️ IMPORTANT: Retourne un JSON avec EXACTEMENT 5 clés: headline, subheadline, slugline, caption, article
Si tu oublies l'article, la fonction échouera !`;

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

🚨 RAPPEL CRITIQUE: Tu dois générer 5 textes (headline, subheadline, slugline, caption, ET article).
L'article de 80-120 mots est OBLIGATOIRE - ne l'oublie pas !

Retourne un JSON avec {headline, subheadline, slugline, caption, article}.`
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
                    description: "Article éditorial narratif OBLIGATOIRE (80-120 mots minimum) mêlant storytelling élégant et touches d'expertise technique. Commence par une évocation poétique, intègre 2-3 qualités matérielles (résistance, entretien, durabilité), termine sur l'émotion. Style magazine premium, pas catalogue produit. CE CHAMP EST OBLIGATOIRE."
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
          headline: "Quand la lumière rencontre la matière",
          subheadline: `Un dialogue subtil entre l'espace et les surfaces, où chaque reflet raconte une histoire d'élégance intemporelle.`,
          slugline: "L'art du raffinement",
          caption: `Les finitions DICA subliment cet espace avec une grâce naturelle`,
          article: `La lumière du jour glisse sur les surfaces avec une douceur inattendue. Dans cet espace, chaque détail a été pensé pour créer une harmonie visuelle qui apaise autant qu'elle fascine. Les finitions DICA, avec leur texture subtile et leurs reflets maîtrisés, transforment les murs en véritables tableaux vivants. Derrière cette élégance se cache une robustesse remarquable : des matériaux conçus pour traverser le temps sans jamais perdre de leur éclat. Un simple geste d'entretien suffit à leur redonner toute leur splendeur. C'est ainsi que le beau rejoint le durable, dans une alliance rare et précieuse.`
        };
      }
    }

    // Validate output (ensure all fields exist)
    if (!result || !result.headline || !result.subheadline || !result.slugline || !result.caption || !result.article) {
      console.warn("⚠️ Missing fields in AI response, using fallback");
      result = {
        headline: result?.headline || "Quand la lumière rencontre la matière",
        subheadline: result?.subheadline || `Un dialogue subtil entre l'espace et les surfaces, où chaque reflet raconte une histoire d'élégance intemporelle.`,
        slugline: result?.slugline || "L'art du raffinement",
        caption: result?.caption || `Les finitions DICA subliment cet espace avec une grâce naturelle`,
        article: result?.article || `La lumière du jour glisse sur les surfaces avec une douceur inattendue. Dans cet espace, chaque détail a été pensé pour créer une harmonie visuelle qui apaise autant qu'elle fascine. Les finitions DICA, avec leur texture subtile et leurs reflets maîtrisés, transforment les murs en véritables tableaux vivants. Derrière cette élégance se cache une robustesse remarquable : des matériaux conçus pour traverser le temps sans jamais perdre de leur éclat. Un simple geste d'entretien suffit à leur redonner toute leur splendeur. C'est ainsi que le beau rejoint le durable, dans une alliance rare et précieuse.`
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
