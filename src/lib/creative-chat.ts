/**
 * @fileoverview Helpers purs du protocole de chat de l'Assistant Créatif.
 *
 * Extraits de `src/pages/Creative.tsx` (LOT 4 — réduction de complexité
 * cognitive S3776) : la fonction `streamChat` cumulait une complexité de 36.
 * En isolant ici la construction de requête, le parsing des réponses JSON et
 * la consommation du flux SSE, l'orchestration côté composant redescend très
 * largement sous le seuil, à comportement strictement identique.
 *
 * Aucune dépendance React : fonctions pures / I/O réseau uniquement.
 */

import type { Decor, Message, UploadedImage } from "@/components/creative/types";

/**
 * Construit le contexte « catalogue DICA » injecté dans le prompt système.
 * Comportement repris à l'identique de l'ancienne méthode `buildDecorContext`.
 */
export function buildDecorContext(decors: Decor[]): string {
  if (decors.length === 0) {
    console.warn("Aucun décor disponible pour le contexte");
    return "Aucun décor DICA disponible actuellement.";
  }

  const decorsByCategory = decors.reduce((acc, decor) => {
    if (!acc[decor.category]) {
      acc[decor.category] = [];
    }
    acc[decor.category].push(decor);
    return acc;
  }, {} as Record<string, Decor[]>);

  const allReferences = decors.map((d) => d.reference_code);
  const exampleRefs = decors
    .slice(0, 3)
    .map((d) => `- "${d.reference_code}" ✅ ${d.name}`)
    .join("\n");

  let context = `════════════════════════════════════════════════════════════════
🚨 CATALOGUE DICA - LISTE STRICTE (${decors.length} décors)
════════════════════════════════════════════════════════════════

⛔ RÈGLE ABSOLUE: UNIQUEMENT les références ci-dessous.
⛔ INVENTER une référence = ERREUR FATALE BLOQUÉE.

📋 RÉFÉRENCES VALIDES:
${allReferences.join("\n")}

✅ EXEMPLES CORRECTS:
${exampleRefs}

📚 DÉTAIL PAR CATÉGORIE:
`;

  for (const [category, categoryDecors] of Object.entries(decorsByCategory)) {
    context += `\n📁 ${category.toUpperCase()}:\n`;
    categoryDecors.forEach((decor) => {
      context += `  • "${decor.reference_code}" = ${decor.name}\n`;
    });
  }

  context += `\n⛔ COPIE les références EXACTEMENT. Ne modifie PAS, n'invente PAS.\n`;

  console.log(
    `Contexte décors construit: ${decors.length} décors dans ${Object.keys(decorsByCategory).length} catégories`
  );
  return context;
}

interface SendChatParams {
  messages: Message[];
  userMessage: string;
  decorContext: string;
  sourceImages?: UploadedImage[];
  showReferences: boolean;
  accessToken: string;
}

/**
 * Construit la requête et appelle l'edge function `creative-chat`.
 * Lève les mêmes erreurs que l'implémentation d'origine (429/402 → message
 * serveur ; autre statut → message générique).
 */
export async function sendCreativeChatRequest({
  messages,
  userMessage,
  decorContext,
  sourceImages,
  showReferences,
  accessToken,
}: Readonly<SendChatParams>): Promise<Response> {
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creative-chat`;

  const sourceImageUrls = sourceImages?.map((img) => img.url) || [];
  const imageLabels = sourceImages?.map((img) => img.label) || [];

  const resp = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages: [...messages, { role: "user", content: userMessage }],
      decorContext,
      sourceImageUrls,
      imageLabels,
      showReferences,
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429 || resp.status === 402) {
      const errorData = await resp.json();
      throw new Error(errorData.error);
    }
    throw new Error("Échec de la connexion au service IA");
  }

  return resp;
}

interface ChatJsonResponse {
  error?: string;
  type?: "image" | "text";
  text?: string;
  content?: string;
  imageUrl?: string;
  decorReferences?: Message["decorReferences"];
}

/**
 * Transforme une réponse JSON de l'edge function en message assistant.
 * Préserve exactement les branches d'origine (image / texte / erreur /
 * réponse inattendue).
 */
export function parseJsonChatResponse(data: ChatJsonResponse): Message {
  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.type === "image") {
    return {
      role: "assistant",
      content: data.text ?? "",
      imageUrl: data.imageUrl,
      decorReferences: data.decorReferences || [],
    };
  }

  if (data?.type === "text" && typeof data?.content === "string") {
    return { role: "assistant", content: data.content };
  }

  throw new Error("Réponse inattendue du service IA");
}

type SseLine =
  | { kind: "skip" }
  | { kind: "done" }
  | { kind: "data"; json: string; line: string };

/** Classe une ligne SSE brute (nettoyage `\r`, filtrage commentaires/préfixe). */
function classifySseLine(rawLine: string): SseLine {
  let line = rawLine;
  if (line.endsWith("\r")) line = line.slice(0, -1);
  if (line.startsWith(":") || line.trim() === "") return { kind: "skip" };
  if (!line.startsWith("data: ")) return { kind: "skip" };

  const jsonStr = line.slice(6).trim();
  if (jsonStr === "[DONE]") return { kind: "done" };
  return { kind: "data", json: jsonStr, line };
}

/** Extrait le delta de contenu d'un chunk OpenAI-like. */
function extractDeltaContent(json: string): string | null {
  const parsed = JSON.parse(json);
  return (parsed.choices?.[0]?.delta?.content as string | undefined) ?? null;
}

interface DrainResult {
  remaining: string;
  content: string;
  done: boolean;
}

/**
 * Vide le buffer texte ligne par ligne. Reproduit fidèlement la boucle interne
 * d'origine : sur JSON incomplet, la ligne est ré-injectée dans le buffer pour
 * la prochaine lecture ; sur `[DONE]`, le flux est marqué terminé.
 */
function drainSseBuffer(
  buffer: string,
  content: string,
  onContent: (full: string) => void
): DrainResult {
  let textBuffer = buffer;
  let assistantContent = content;
  let newlineIndex = textBuffer.indexOf("\n");

  while (newlineIndex !== -1) {
    const rawLine = textBuffer.slice(0, newlineIndex);
    const rest = textBuffer.slice(newlineIndex + 1);
    const classified = classifySseLine(rawLine);

    if (classified.kind === "done") {
      return { remaining: rest, content: assistantContent, done: true };
    }

    if (classified.kind === "data") {
      try {
        const delta = extractDeltaContent(classified.json);
        if (delta) {
          assistantContent += delta;
          onContent(assistantContent);
        }
      } catch {
        return { remaining: classified.line + "\n" + rest, content: assistantContent, done: false };
      }
    }

    textBuffer = rest;
    newlineIndex = textBuffer.indexOf("\n");
  }

  return { remaining: textBuffer, content: assistantContent, done: false };
}

/**
 * Lit et décode le flux SSE de la réponse, en notifiant le contenu agrégé
 * de l'assistant via `onContent` à chaque mise à jour.
 */
export async function streamAssistantText(
  resp: Response,
  onContent: (full: string) => void
): Promise<void> {
  if (!resp.body) {
    throw new Error("Échec de la connexion au service IA");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let assistantContent = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    const result = drainSseBuffer(textBuffer, assistantContent, onContent);
    textBuffer = result.remaining;
    assistantContent = result.content;
    if (result.done) streamDone = true;
  }
}
