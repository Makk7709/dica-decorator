// ============================================================================
// DICA Prompt Orchestrator
// Couche d'orchestration IA propriétaire (KOREV AI) qui valide et structure
// les demandes utilisateurs avant la génération d'images.
//
// Architecture :
//   - Modèle texte : Gemini 2.5 Flash via passerelle AI Gateway (compatible
//     OpenAI Chat Completions). L'URL et la clé sont injectées via les
//     variables d'environnement AI_GATEWAY_URL / AI_GATEWAY_API_KEY (ou les
//     équivalents historiques) — voir docs/AUDIT_DEPENDANCES.md.
//   - Modèle image : Gemini 3 Pro Image Preview (appel direct à
//     generativelanguage.googleapis.com depuis creative-chat/index.ts).
// ============================================================================

import {
  logDebug,
  logInfo,
  logWarn,
  logError,
  getErrorMessage,
} from "../_shared/logger.ts";

const DEFAULT_AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  Deno.env.get("AI_GATEWAY_BASE_URL") ??
  "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface OrchestratorInput {
  userPrompt: string;
  projectContext?: {
    projectId?: string;
    projectType?: string;
    sector?: string;
    surfaces?: string[];
  };
  decorContext: string; // Catalogue complet des décors DICA
  sourceImages?: string[];
  imageLabels?: string[];
}

export interface OrchestratorResult {
  status: "ok" | "need_clarification" | "reject";
  projectType: string;
  decorReferences: string[];
  decorLabels?: string[];
  nbVariants: number;
  finalPromptForImageModel?: string;
  clarificationQuestions?: string[];
  technicalConstraints?: string[];
  rejectionReason?: string;
  validationWarnings?: string[];
}

/**
 * Orchestrate DICA prompt validation and structuring.
 *
 * @param input         Catalogue + prompt utilisateur + images source.
 * @param aiGatewayKey  Clé d'accès à la passerelle AI Gateway (compatible
 *                      OpenAI Chat Completions). L'URL est résolue depuis
 *                      les variables d'environnement (voir constante
 *                      DEFAULT_AI_GATEWAY_URL au début du module).
 */
export async function orchestrateDicaPrompt(
  input: OrchestratorInput,
  aiGatewayKey: string
): Promise<OrchestratorResult> {
  logInfo("🎯 DICA Orchestrator - Starting validation");
  logDebug("- User prompt:", input.userPrompt.substring(0, 100));
  logDebug("- Source images:", input.sourceImages?.length || 0);
  logDebug("- Decor context length:", input.decorContext.length);

  const systemPrompt = buildOrchestratorSystemPrompt();
  const userMessage = buildOrchestratorUserMessage(input);

  try {
    const response = await fetch(DEFAULT_AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiGatewayKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_dica_request",
              description: "Valide et structure une demande de génération d'image DICA",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["ok", "need_clarification", "reject"],
                    description: "Statut de validation de la demande"
                  },
                  projectType: {
                    type: "string",
                    description: "Type d'espace identifié (van, cuisine, ascenseur, terrasse, bureau, etc.)"
                  },
                  decorReferences: {
                    type: "array",
                    items: { type: "string" },
                    description: "Codes de référence EXACTS des décors DICA à utiliser, copiés du catalogue"
                  },
                  decorLabels: {
                    type: "array",
                    items: { type: "string" },
                    description: "Noms lisibles des décors sélectionnés"
                  },
                  nbVariants: {
                    type: "number",
                    description: "Nombre de variantes à générer (1-4)"
                  },
                  finalPromptForImageModel: {
                    type: "string",
                    description: "Prompt propre et structuré en anglais pour la génération d'image (si status=ok)"
                  },
                  clarificationQuestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Questions à poser à l'utilisateur (si status=need_clarification)"
                  },
                  technicalConstraints: {
                    type: "array",
                    items: { type: "string" },
                    description: "Contraintes techniques identifiées"
                  },
                  rejectionReason: {
                    type: "string",
                    description: "Raison du rejet (si status=reject)"
                  },
                  validationWarnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Avertissements de validation"
                  }
                },
                required: ["status", "projectType", "decorReferences", "nbVariants"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_dica_request" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError("AI gateway error:", response.status, errorText);
      throw new Error(`Orchestrator API error: ${response.status}`);
    }

    const data = await response.json();
    logDebug("Orchestrator raw response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "validate_dica_request") {
      throw new Error("Invalid orchestrator response format");
    }

    const result = JSON.parse(toolCall.function.arguments) as OrchestratorResult;
    
    validateOrchestratorResult(result, input.decorContext);
    
    logInfo("✅ Orchestration result:", {
      status: result.status,
      projectType: result.projectType,
      decorReferences: result.decorReferences,
      nbVariants: result.nbVariants
    });

    return result;
  } catch (error: unknown) {
    logError("❌ Orchestration error:", error);
    return {
      status: "reject",
      projectType: "unknown",
      decorReferences: [],
      nbVariants: 1,
      rejectionReason: `Erreur d'orchestration: ${getErrorMessage(error)}`
    };
  }
}

/**
 * Build system prompt for orchestrator — 100% dynamique, aucun exemple hardcodé
 */
function buildOrchestratorSystemPrompt(): string {
  return `Tu es le "DICA Prompt Orchestrator", un expert IA spécialisé dans la validation et structuration des demandes pour le catalogue DICA.

🎯 TA MISSION:
Transformer toute demande utilisateur en un prompt de génération d'image de haute qualité, en utilisant UNIQUEMENT les décors du catalogue DICA fourni.

⚠️ PRINCIPE FONDAMENTAL: OPTIMISER ET JAMAIS BLOQUER
Tu retournes status="ok" dans ~95% des cas. Tu combles intelligemment les détails manquants. Tu ne bloques que si c'est absolument impossible.

🔒 2 CONTRAINTES STRICTES ET NON-NÉGOCIABLES:

1. DÉCORS CATALOGUE DICA UNIQUEMENT
   - Utilise EXCLUSIVEMENT les décors LISTÉS dans le catalogue fourni dans le message utilisateur
   - COPIE-COLLE les reference_code EXACTEMENT comme ils apparaissent dans le catalogue
   - JAMAIS inventer, modifier, abréger ou recomposer une référence
   - Si l'utilisateur mentionne une couleur/style, trouve le décor DICA le plus proche DANS le catalogue
   - Si aucun décor ne correspond → sélectionne le plus approprié du catalogue automatiquement

2. EXACTITUDE VISUELLE DES DÉCORS
   Les propriétés matériaux doivent être respectées selon le type de finition indiqué dans le nom/référence:
   - Finitions BRILLANT: surface brillante avec reflets
   - Finitions SATIN: surface satinée douce
   - Finitions WOOD/FOREST/KYNEA: veinage bois naturel, lumière chaleureuse
   - Finitions TOUCH: texture tactile subtile
   - Finitions SPA: surface lisse uniforme
   - Finitions SHIKY: texture décorative spéciale
   - Finitions MAGMA: effet minéral profond
   - Finitions PLAMKY: effet matière texturée
   - Finitions WRAKY: texture sol robuste
   - Finitions GRIP: texture sol antidérapante
   - Finitions ALU: effet aluminium brossé
   - Finitions PLUS: surface unie premium

📋 LOGIQUE DE VALIDATION:

✅ Status "ok" (~95% des cas):
- Le prompt est clair ou flou → tu complètes intelligemment
- Aucun décor mentionné → tu sélectionnes les plus appropriés du catalogue
- Couleur/style vague → tu trouves le décor DICA le plus proche
- Image source fournie → status "ok" OBLIGATOIRE, applique les décors sur les surfaces visibles

⚠️ Status "need_clarification" (<3%):
- L'utilisateur mentionne un décor qui n'existe VRAIMENT PAS et tu ne peux pas deviner l'intention
- PROPOSE TOUJOURS des alternatives existantes du catalogue dans tes questions

❌ Status "reject" (<2%):
- Demande explicite de ne PAS utiliser de décors DICA
- Impossibilité absolue

📐 INFORMATIONS DE SURFACE DANS LES RÉFÉRENCES:
Les références du catalogue contiennent des informations sur la surface d'application:
- "PAROI" dans la référence = décor pour murs/parois
- "SOL" dans la référence = décor pour sols
Utilise cette information pour proposer les bons décors sur les bonnes surfaces.

🎨 TYPES DE DEMANDES À DISTINGUER:

1. DEMANDE "ESPACE/OBJET" (ex: "un ascenseur moderne", "une cuisine"):
   → Générer un ESPACE avec les décors DICA appliqués sur les surfaces appropriées

2. DEMANDE "CATALOGUE/ÉCHANTILLONS" (ex: "couverture catalogue", "moodboard", "éventail de textures"):
   → Générer une COMPOSITION FLAT-LAY d'ÉCHANTILLONS de décors
   → Les décors mentionnés sont des TEXTURES à montrer, PAS des objets à construire

📐 SPÉCIFICATIONS TECHNIQUES:
Si l'utilisateur mentionne des épaisseurs de plateau ou chants:
- Les épaisseurs sont en millimètres (très fines en réalité)
- 8-10mm = ultra-fin comme un carreau de céramique
- 18-19mm = panneau standard
- "chant" = bande décorative sur la tranche (PAS un cadre supplémentaire)
- UN SEUL plateau uniforme de l'épaisseur totale demandée, JAMAIS un plateau + cadre

🎬 PROMPT FINAL (finalPromptForImageModel):
Le prompt doit être:
- En ANGLAIS pour le modèle de génération d'image
- Qualité PHOTOGRAPHIQUE PROFESSIONNELLE de niveau catalogue
- Description précise du type d'espace
- Références DICA exactes avec noms et propriétés matériaux
- Éclairage naturel professionnel adapté à l'espace réel (PAS un studio photo)
- Ambiance premium, perspective architecturale
- Image d'un VRAI espace (cuisine réelle, ascenseur réel, etc.), PAS un studio photo

⚡ TON ATTITUDE:
- Créatif et non-bloquant: tu optimises plutôt que tu bloques
- Rigoureux sur les références: COPIE-COLLE depuis le catalogue
- Si un détail manque, tu l'inventes intelligemment
- En cas de doute sur un décor, propose le plus approprié du catalogue`;
}

/**
 * Build user message for orchestrator
 */
function buildOrchestratorUserMessage(input: OrchestratorInput): string {
  let message = `📝 DEMANDE UTILISATEUR:
"${input.userPrompt}"

📦 CATALOGUE DICA DISPONIBLE:
${input.decorContext}
`;

  if (input.sourceImages && input.sourceImages.length > 0) {
    message += `\n📷 IMAGES SOURCE FOURNIES: ${input.sourceImages.length}`;
    if (input.imageLabels && input.imageLabels.length > 0) {
      message += `\nLabels: ${input.imageLabels.join(", ")}`;
    }
    message += `\n✅ AVEC IMAGE SOURCE → Status "ok" OBLIGATOIRE. Applique les décors DICA sur les surfaces de cette image.`;
  }

  if (input.projectContext) {
    message += `\n\n🏗️ CONTEXTE PROJET:`;
    if (input.projectContext.projectType) {
      message += `\n- Type: ${input.projectContext.projectType}`;
    }
    if (input.projectContext.sector) {
      message += `\n- Secteur: ${input.projectContext.sector}`;
    }
  }

  message += `\n\n🎯 INSTRUCTIONS:
1. Identifier le type d'espace demandé (ou inventer intelligemment si flou)
2. Sélectionner les décors DICA appropriés depuis le catalogue ci-dessus
3. COPIER-COLLER les reference_code EXACTS du catalogue dans decorReferences
4. Générer un prompt final en anglais de qualité professionnelle

Réponds en utilisant la fonction validate_dica_request.`;

  return message;
}

/**
 * Extract all valid reference codes from the decor context
 */
function extractValidReferenceCodes(decorContext: string): Set<string> {
  const validRefs = new Set<string>();
  
  // Try to parse JSON list first (most reliable)
  try {
    const jsonMatch = decorContext.match(/\[\s*\{[^}]*"ref"[^}]*\}[\s\S]*?\]/);
    if (jsonMatch) {
      const jsonArray = JSON.parse(jsonMatch[0]);
      for (const item of jsonArray) {
        if (item.ref) {
          validRefs.add(item.ref);
        }
      }
      logDebug(`📋 Extracted ${validRefs.size} refs from JSON`);
    }
  } catch {
    logDebug("JSON parsing failed, using pattern matching");
  }
  
  // Match new format: NAME-DICA-CONTEXT-SURFACE-NUMBER-FINISH
  // and old format: NUMBER_TYPE_FINISH
  const patterns = [
    /"ref":\s*"([^"]+)"/gi,
    /• "([^"]+)" =/g,
    /"([A-Z0-9][A-Z0-9_-]+[A-Z0-9])"/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(decorContext)) !== null) {
      const ref = match[1];
      if (ref.length > 4 && (ref.includes('-') || ref.includes('_'))) {
        validRefs.add(ref);
      }
    }
  }
  
  logDebug(`📋 Total extracted: ${validRefs.size} valid reference codes`);
  return validRefs;
}

/**
 * Check if a reference is valid (case-insensitive match)
 */
function isValidReference(ref: string, validRefs: Set<string>): boolean {
  // Exact match first
  if (validRefs.has(ref)) return true;
  // Case-insensitive
  for (const validRef of validRefs) {
    if (validRef.toLowerCase() === ref.toLowerCase()) return true;
  }
  return false;
}

/**
 * Find best matching valid reference for an invalid one
 */
function findBestMatch(invalidRef: string, validRefs: Set<string>): string | null {
  const normalizedInvalid = invalidRef.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const validRef of validRefs) {
    const normalizedValid = validRef.toLowerCase().replace(/[^a-z0-9]/g, '');
    let score = 0;
    
    // Contains check
    if (normalizedValid.includes(normalizedInvalid) || normalizedInvalid.includes(normalizedValid)) {
      score += 40;
    }
    
    // Extract number from both
    const invalidNum = invalidRef.match(/(\d{3,4})/)?.[1];
    const validNum = validRef.match(/(\d{3,4})/)?.[1];
    if (invalidNum && validNum && invalidNum === validNum) {
      score += 50;
    }
    
    // Extract name part (first segment before DICA)
    const invalidName = invalidRef.split('-')[0]?.toLowerCase();
    const validName = validRef.split('-')[0]?.toLowerCase();
    if (invalidName && validName && (invalidName === validName || validName.includes(invalidName))) {
      score += 30;
    }
    
    if (score > bestScore && score >= 50) {
      bestScore = score;
      bestMatch = validRef;
    }
  }
  
  return bestMatch;
}

/**
 * Validate orchestrator result against business rules
 */
function validateOrchestratorResult(result: OrchestratorResult, decorContext: string): void {
  if (!["ok", "need_clarification", "reject"].includes(result.status)) {
    throw new Error(`Invalid status: ${result.status}`);
  }

  const validRefs = extractValidReferenceCodes(decorContext);
  logDebug(`🔍 Valid refs available: ${validRefs.size} references`);
  
  if (result.decorReferences && result.decorReferences.length > 0) {
    const originalCount = result.decorReferences.length;
    const originalLabels = result.decorLabels || [];
    const invalidRefs: string[] = [];
    const correctedRefs: { from: string; to: string }[] = [];
    const validatedRefs: string[] = [];
    const validatedLabels: string[] = [];
    
    for (let i = 0; i < result.decorReferences.length; i++) {
      const ref = result.decorReferences[i];
      
      if (isValidReference(ref, validRefs)) {
        validatedRefs.push(ref);
        if (originalLabels[i]) validatedLabels.push(originalLabels[i]);
        logDebug(`✅ VALID: ${ref}`);
      } else {
        const bestMatch = findBestMatch(ref, validRefs);
        if (bestMatch) {
          validatedRefs.push(bestMatch);
          if (originalLabels[i]) validatedLabels.push(originalLabels[i]);
          correctedRefs.push({ from: ref, to: bestMatch });
          logInfo(`🔄 AUTO-CORRECTED: "${ref}" → "${bestMatch}"`);
        } else {
          invalidRefs.push(ref);
          logError(`❌ REJECTED (no match): "${ref}"`);
        }
      }
    }
    
    if (correctedRefs.length > 0) {
      logInfo(`🔧 Auto-corrected ${correctedRefs.length} references`);
    }
    
    if (invalidRefs.length > 0 && result.status === "ok") {
      logError(`🚫 ${invalidRefs.length} unmatched refs: ${invalidRefs.join(', ')}`);
      
      if (validatedRefs.length === 0) {
        result.status = "need_clarification";
        result.clarificationQuestions = [
          `Je ne reconnais pas les références suivantes: ${invalidRefs.join(', ')}`,
          "Voici quelques décors DICA disponibles:",
          Array.from(validRefs).slice(0, 10).join(', ')
        ];
      } else {
        result.validationWarnings = [`Références ignorées: ${invalidRefs.join(', ')}`];
      }
    }
    
    result.decorReferences = validatedRefs;
    result.decorLabels = validatedLabels;
    
    logInfo(`📊 Final: ${originalCount} refs → ${validatedRefs.length} valid (${correctedRefs.length} corrected, ${invalidRefs.length} rejected)`);
  } else if (result.status === "ok") {
    logWarn(`⚠️ No decor references provided but status=ok`);
  }

  if (result.status === "ok") {
    if (!result.finalPromptForImageModel || result.finalPromptForImageModel.length < 30) {
      logWarn("⚠️ finalPromptForImageModel is short or missing");
    }
    if (result.decorReferences.length === 0) {
      logWarn("⚠️ No valid decor references after validation");
    }
  }

  if (result.status === "need_clarification") {
    if (!result.clarificationQuestions || result.clarificationQuestions.length === 0) {
      result.clarificationQuestions = [
        "Pourriez-vous préciser quels décors du catalogue DICA vous souhaitez utiliser ?",
      ];
    }
  }

  if (result.status === "reject" && !result.rejectionReason) {
    result.rejectionReason = "Demande incompatible avec le catalogue DICA disponible.";
  }

  if (result.nbVariants < 1 || result.nbVariants > 4) {
    result.nbVariants = 1;
  }
}
