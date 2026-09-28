import { createClient } from "npm:@supabase/supabase-js@2";
import { DICA_KNOWLEDGE } from "./knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RULES = `
RÈGLES STRICTES (non négociables) :
1. Périmètre : tu parles UNIQUEMENT de DICA France, Compactop, du stratifié HPL, du compact HPL, de leurs usages, de l'aménagement avec ces matériaux et du choix de décors. Pour tout autre sujet, réponds poliment que tu es limité à ce domaine et recentre la conversation.
2. Normes : le contexte est français et européen (ex. familles de normes NF / EN pour les stratifiés, classements de réaction au feu européens). Tu ne cites JAMAIS une norme précise, un classement feu, une certification, une épaisseur, une résistance, un prix, un délai ou une disponibilité que tu ne peux pas vérifier. Dans ce cas, dis clairement que tu ne peux pas le confirmer et invite à consulter la fiche technique ou un conseiller DICA France. Ne cite jamais de normes non européennes comme référence.
3. Décors : quand tu proposes un décor ou une combinaison, appelle TOUJOURS l'outil search_decors et ne cite que des décors renvoyés par l'outil (nom + référence). N'invente jamais de référence.
4. Tu ne génères pas d'images. Si le client veut un rendu, invite-le à décrire son projet dans le champ texte de l'assistant créatif.
5. Tu parles français, de façon professionnelle, simple et concise (réponses orales courtes, 2 à 4 phrases), puis tu poses une question utile pour qualifier le besoin.
`;

const TOOLS = [
  {
    type: "function",
    name: "search_decors",
    description:
      "Recherche dans le catalogue réel des décors DICA. À utiliser avant de recommander un décor ou une combinaison.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Mots-clés : couleur, matière, style (ex. 'chêne clair', 'marbre blanc', 'béton')." },
        category: { type: "string", description: "Catégorie optionnelle : Bois, Marbre, Metal, Unis, Deco, Pierre, Béton..." },
        usage: { type: "string", description: "Contexte d'usage optionnel (ex. ascenseur, van, cuisine, CHR)." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Commande vocale non configurée." }, 503);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Non autorisé" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
    if (error || !user) return json({ error: "Non autorisé" }, 401);

    const { data: profile } = await admin.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
    if (profile && profile.is_active === false) return json({ error: "Compte désactivé" }, 403);

    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 120 },
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: `${DICA_KNOWLEDGE}\n${RULES}`,
          tools: TOOLS,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "fr" },
              turn_detection: { type: "server_vad" },
            },
            output: { voice: "marin" },
          },
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("OpenAI realtime error", res.status, data?.error?.message);
      return json({ error: data?.error?.message ?? "Erreur OpenAI" }, res.status);
    }
    return json({ value: data.value, expires_at: data.expires_at });
  } catch (e) {
    console.error("realtime-session", e instanceof Error ? e.message : e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
