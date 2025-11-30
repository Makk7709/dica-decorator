// ============================================================================
// DICA Prompt Orchestrator
// Couche d'orchestration IA qui valide et structure les demandes utilisateurs
// avant la génération d'images avec Nano Banana
// ============================================================================

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
 * Orchestrate DICA prompt validation and structuring
 */
export async function orchestrateDicaPrompt(
  input: OrchestratorInput,
  lovableApiKey: string
): Promise<OrchestratorResult> {
  console.log("🎯 DICA Orchestrator - Starting validation");
  console.log("- User prompt:", input.userPrompt.substring(0, 100));
  console.log("- Source images:", input.sourceImages?.length || 0);
  console.log("- Decor context length:", input.decorContext.length);

  // Build system prompt for orchestrator
  const systemPrompt = buildOrchestratorSystemPrompt();
  
  // Build user message with all context
  const userMessage = buildOrchestratorUserMessage(input);

  // Call Lovable AI for orchestration
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Fast model for orchestration
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
                    description: "Codes de référence des décors DICA à utiliser (ex: 3040_BN_PF)"
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
                    description: "Prompt propre et structuré pour Nano Banana (si status=ok)"
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
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Orchestrator API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Orchestrator raw response:", JSON.stringify(data, null, 2));

    // Parse tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "validate_dica_request") {
      throw new Error("Invalid orchestrator response format");
    }

    const result = JSON.parse(toolCall.function.arguments) as OrchestratorResult;
    
    // Validate result structure
    validateOrchestratorResult(result, input.decorContext);
    
    console.log("✅ Orchestration result:", {
      status: result.status,
      projectType: result.projectType,
      decorReferences: result.decorReferences,
      nbVariants: result.nbVariants
    });

    return result;
  } catch (error: any) {
    console.error("❌ Orchestration error:", error);
    // Return safe fallback result
    return {
      status: "reject",
      projectType: "unknown",
      decorReferences: [],
      nbVariants: 1,
      rejectionReason: `Erreur d'orchestration: ${error.message}`
    };
  }
}

/**
 * Build system prompt for orchestrator
 */
function buildOrchestratorSystemPrompt(): string {
  return `Tu es le "DICA Prompt Orchestrator", un expert IA spécialisé dans la validation et la structuration des demandes de visualisation de décors DICA.

🎯 TA MISSION:
1. Analyser la demande utilisateur
2. Vérifier la conformité métier DICA
3. Extraire les éléments structurants (type d'espace, décors, contraintes)
4. Produire un JSON strictement valide

📋 RÈGLES DE VALIDATION:

1. DÉCORS AUTORISÉS UNIQUEMENT
   - Tu dois utiliser UNIQUEMENT les décors du catalogue DICA fourni
   - JAMAIS inventer de couleurs, textures ou références
   - Vérifier que les références existent dans le catalogue

2. TYPE D'ESPACE OBLIGATOIRE
   - Identifier clairement: van, cuisine, ascenseur, terrasse, bureau, salon, sdb, etc.
   - Si ambigu ou flou → status="need_clarification"
   - Si impossible/hors gamme → status="reject"

3. COHÉRENCE MÉTIER
   - Les décors Metal conviennent aux ascenseurs, vans, cuisines modernes
   - Les décors Bois pour ambiances chaleureuses (vans, bureaux, salons)
   - Les décors Marbre pour espaces premium (sdb, cuisines, halls)
   - Les Unis pour minimalisme moderne (tous espaces)

4. CONTRAINTES TECHNIQUES
   - Secteur santé/écoles → résistance au feu requise
   - Ascenseurs → robustesse et entretien facile
   - Extérieur/terrasse → résistance intempéries

🚨 STATUTS DE SORTIE:

✅ "ok" = Demande claire, décors valides, type d'espace identifié
   → Générer finalPromptForImageModel propre et précis

⚠️ "need_clarification" = Infos insuffisantes ou ambiguës
   → Poser 1-3 questions précises dans clarificationQuestions

❌ "reject" = Demande impossible, hors gamme, ou décors inexistants
   → Expliquer pourquoi dans rejectionReason

🎨 GÉNÉRATION DU PROMPT FINAL:

Si status="ok", le finalPromptForImageModel doit:
- Être en anglais pour Nano Banana
- Décrire précisément le type d'espace
- Mentionner les décors DICA par leur référence ET nom
- Inclure les contraintes de qualité (photorealistic, high-end, professional)
- Préciser l'éclairage et l'ambiance
- Rester concis (300-500 mots max)

Exemple de bon prompt final:
"Professional interior visualization of a modern van conversion with DICA decorative panels. The space features DICA Metal panels (ref: 3040_BN_PF - brushed stainless steel) on interior walls and cabinet fronts, creating a sleek contemporary aesthetic. Soft natural daylight from side windows, cozy compact layout with bench seating and storage. Photorealistic rendering, high-end catalog quality, sharp details on panel textures."

⚡ RÉPONSE RAPIDE REQUISE:
- Analyse en <3 secondes
- JSON valide obligatoire
- Pas de blabla inutile`;
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
    message += `\n⚠️ L'utilisateur souhaite probablement appliquer des décors sur ces images existantes.`;
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

  message += `\n\n🎯 ANALYSE REQUISE:
1. Extraire le type d'espace demandé
2. Identifier les décors DICA appropriés du catalogue
3. Vérifier la cohérence métier
4. Décider du statut (ok/need_clarification/reject)
5. Générer le prompt final si ok

Réponds en utilisant la fonction validate_dica_request.`;

  return message;
}

/**
 * Validate orchestrator result against business rules
 */
function validateOrchestratorResult(result: OrchestratorResult, decorContext: string): void {
  // Validate status
  if (!["ok", "need_clarification", "reject"].includes(result.status)) {
    throw new Error(`Invalid status: ${result.status}`);
  }

  // Validate decor references exist in catalog
  if (result.decorReferences && result.decorReferences.length > 0) {
    for (const ref of result.decorReferences) {
      if (!decorContext.includes(ref)) {
        console.warn(`⚠️ Decor reference not found in catalog: ${ref}`);
        // Don't throw, just warn - the orchestrator might have made a mistake
        // but we can still try to proceed
      }
    }
  }

  // Validate required fields for "ok" status
  if (result.status === "ok") {
    if (!result.finalPromptForImageModel || result.finalPromptForImageModel.length < 50) {
      throw new Error("finalPromptForImageModel is required and must be substantive for status=ok");
    }
    if (result.decorReferences.length === 0) {
      throw new Error("At least one decor reference is required for status=ok");
    }
  }

  // Validate clarification questions for "need_clarification"
  if (result.status === "need_clarification") {
    if (!result.clarificationQuestions || result.clarificationQuestions.length === 0) {
      throw new Error("clarificationQuestions required for status=need_clarification");
    }
  }

  // Validate rejection reason for "reject"
  if (result.status === "reject") {
    if (!result.rejectionReason) {
      throw new Error("rejectionReason required for status=reject");
    }
  }

  // Validate nbVariants
  if (result.nbVariants < 1 || result.nbVariants > 4) {
    console.warn(`⚠️ Invalid nbVariants: ${result.nbVariants}, defaulting to 1`);
    result.nbVariants = 1;
  }
}
