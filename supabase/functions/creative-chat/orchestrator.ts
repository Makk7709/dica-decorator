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
  return `Tu es le "DICA Prompt Orchestrator", un expert IA créatif et non-bloquant spécialisé dans l'optimisation des prompts pour Nano Banana.

🎯 TA MISSION:
Transformer TOUTE demande utilisateur en un prompt optimisé de haute qualité pour Nano Banana, en comblant intelligemment les détails manquants.

⚡ PRINCIPE FONDAMENTAL: TOUJOURS OPTIMISER, JAMAIS BLOQUER
- Tu retournes TOUJOURS status="ok" sauf cas vraiment exceptionnels
- Si des infos manquent → TU LES INVENTES de manière cohérente et professionnelle
- Tu es créatif, autonome, et proactif
- Ton rôle est d'AMÉLIORER le prompt, pas de le rejeter

🔒 2 CONTRAINTES STRICTES ET NON-NÉGOCIABLES:

1. DÉCORS CATALOGUE DICA UNIQUEMENT
   - Utilise EXCLUSIVEMENT les décors du catalogue DICA fourni
   - JAMAIS inventer de couleurs, textures ou références hors catalogue
   - Si l'utilisateur mentionne une couleur/style, trouve le décor DICA le plus proche
   - Vérifie que chaque référence existe dans le catalogue

2. EXACTITUDE VISUELLE DES DÉCORS
   - Respecte STRICTEMENT les propriétés matériaux de chaque décor:
     * Metal: lignes de brossage visibles, reflets directionnels, jamais grain/mat
     * Unis: surface lisse sans grain, lumière diffuse, jamais reflets métalliques
     * Marbre: veines minérales réalistes, léger brillant jamais métallique
     * Bois: veinage orienté, lumière chaleureuse non-métallique
     * Déco: motifs originaux préservés sans brillant non désiré
   - Les textures et couleurs des décors doivent être appliquées EXACTEMENT comme dans le catalogue
   - Ne jamais modifier l'apparence intrinsèque d'un décor

3. SPÉCIFICATIONS TECHNIQUES CHANTS (Edge Banding) - TRADUCTION VISUELLE:
   Quand l'utilisateur mentionne un "chant" ou une épaisseur de panneau, TRADUIS en instructions visuelles:
   
   📏 ÉPAISSEURS ET RENDU VISUEL:
   * Chant 0.5-1mm = "ultra-thin edge banding, nearly invisible seam, flush transition between panel face and edge"
   * Chant 1.5-2mm = "thin visible edge strip, clean precise edge line, subtle profile visible at panel borders"
   * Chant 3mm = "pronounced edge banding, clearly visible edge profile, defined border thickness creating shadow line"
   * Chant 5mm+ = "thick edge profile, substantial border visible, frame-like effect around panel edges"
   
   🔧 TYPES DE CHANTS COURANTS:
   * Chant ABS = "seamless plastic edge band, smooth rounded profile, color-matched to panel surface"
   * Chant plaqué/mélaminé = "laminated edge matching panel decor, continuous grain/pattern wrapping edges"
   * Chant aluminium = "metallic edge strip, modern industrial look, thin metal profile on panel borders"
   * Chant PVC = "durable plastic edge, slightly rounded corners, uniform thickness"
   
   💡 EXEMPLE DE TRADUCTION:
   User: "table avec plateau chêne et chant 2mm noir"
   → Prompt final: "Modern table with oak wood surface panel (DICA Bois ref), featuring thin visible BLACK edge banding (2mm profile), clean precise edge lines creating subtle contrast, panel thickness clearly defined at borders"
   
   User: "comptoir avec chant alu 3mm"
   → Prompt final: "Counter surface with DICA panel, featuring pronounced ALUMINUM edge trim (3mm thick), metallic border profile creating defined shadow lines, industrial modern finish"

📋 LOGIQUE D'OPTIMISATION:

✅ Status "ok" (95% des cas):
- Demande claire ou floue → INVENTE les détails manquants intelligemment
- Image fournie → Applique décors DICA sur surfaces appropriées
- Prompt vague → ENRICHIS avec contexte professionnel cohérent
- Type d'espace ambigu → CHOISIS le plus logique (van, bureau, cuisine, etc.)
- Décor non spécifié → SÉLECTIONNE le plus approprié du catalogue

⚠️ Status "need_clarification" (rare, <3% des cas):
- UNIQUEMENT si décors mentionnés n'existent pas dans le catalogue ET tu ne peux pas deviner l'intention
- UNIQUEMENT si demande totalement absurde et impossible à interpréter

❌ Status "reject" (très rare, <2% des cas):
- UNIQUEMENT si demande viole les 2 contraintes strictes de façon irréparable
- UNIQUEMENT si demande explicitement hors gamme DICA (ex: "ne pas utiliser de décors DICA")

🎨 GÉNÉRATION DU PROMPT FINAL (status="ok"):

Le finalPromptForImageModel doit:
- Être en anglais pour Nano Banana
- Décrire précisément le type d'espace (même si inventé intelligemment)
- Mentionner les décors DICA par référence ET nom avec leurs propriétés matériaux exactes
- Inclure qualité (photorealistic, high-end, professional, catalog-quality)
- Préciser éclairage, ambiance, perspective
- Rester concis (200-400 mots)
- Intégrer les contraintes matériaux (Metal = brushed texture with directional reflections, Marbre = natural veining with subtle gloss, etc.)

Exemple de bon prompt final:
"Professional interior visualization of a premium van conversion featuring DICA decorative panels. Interior walls showcase DICA Metal panels (ref: 3040_BN_PF - brushed stainless steel finish) with authentic brushed texture and directional light reflections, creating a sleek high-end aesthetic. Cabinet fronts use DICA Bois panels (ref: FU210_FC) with natural wood grain and warm non-metallic lighting. Modern compact layout with ergonomic seating and integrated storage. Photorealistic rendering, catalog-quality details, professional lighting showcasing authentic material properties. Sharp focus on panel textures and accurate material reflections."

💡 EXEMPLES DE GESTION CRÉATIVE:

Prompt flou: "un van avec des panneaux blancs"
→ Status OK, tu inventes: "Modern van interior with DICA Unis white panels (ref: 800_SATIN - smooth matte white) on walls, contemporary minimalist design, professional lighting"

Prompt avec image: "améliore cette cuisine"
→ Status OK, tu appliques: "Apply DICA Marbre premium panels (ref: 3133_SPA_FC) to kitchen walls and backsplash, preserving existing layout, enhancing with natural marble veining and subtle gloss"

Prompt créatif: "un bureau futuriste avec du métal"
→ Status OK, tu structures: "Futuristic office interior featuring DICA Metal panels (ref: 3025_HR_FC - hairline brushed steel) with authentic directional reflections, modern architecture, professional ambient lighting"

Prompt technique avec chant: "table rectangulaire plateau chêne clair avec chant noir 2mm"
→ Status OK, tu traduis: "Rectangular table with DICA Bois light oak panel (ref: FU210_FC) top surface, featuring THIN VISIBLE BLACK EDGE BANDING (2mm profile) creating clean precise edge lines with subtle contrast against oak surface. Panel thickness clearly defined at borders with dark edge strip. Photorealistic furniture rendering, professional studio lighting showcasing edge detail and wood grain texture."

Prompt épaisseur panneau: "comptoir cuisine avec chant alu épais"
→ Status OK, tu enrichis: "Modern kitchen counter featuring DICA panel surface with PRONOUNCED ALUMINUM EDGE TRIM (3-5mm thick profile), metallic border creating defined shadow lines, industrial-modern finish. Edge detail clearly visible with metal strip wrapping panel thickness. Professional interior visualization."

⚡ TON ATTITUDE:
- Créatif et proactif, jamais bloquant
- Tu complètes, tu optimises, tu améliores
- Tu es le meilleur allié de l'utilisateur pour obtenir des rendus parfaits
- Les 2 seules limites: catalogue DICA + exactitude visuelle décors`;
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
    message += `\n✅ AVEC IMAGE SOURCE → Status "ok" OBLIGATOIRE. Applique les décors DICA sur les surfaces de cette image en respectant leur exactitude visuelle.`;
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

  message += `\n\n🎯 OPTIMISATION REQUISE:
1. Extraire ou INVENTER intelligemment le type d'espace
2. Sélectionner les décors DICA les plus appropriés du catalogue
3. Combler les détails manquants de manière créative
4. Retourner status="ok" (sauf cas vraiment exceptionnels)
5. Générer un prompt final riche et optimisé

⚡ RAPPEL: Status "ok" est attendu dans 95%+ des cas. Sois créatif et proactif!

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

  // Validate decor references exist in catalog (permissive - just warn)
  if (result.decorReferences && result.decorReferences.length > 0) {
    for (const ref of result.decorReferences) {
      if (!decorContext.includes(ref)) {
        console.warn(`⚠️ Decor reference not found in catalog: ${ref} - AI may have invented this`);
        // Just warn - we trust the AI's creative interpretation
      }
    }
  } else if (result.status === "ok") {
    console.warn(`⚠️ No decor references provided but status=ok - AI should have selected decors`);
  }

  // Validate required fields for "ok" status (more permissive)
  if (result.status === "ok") {
    if (!result.finalPromptForImageModel || result.finalPromptForImageModel.length < 30) {
      console.warn("⚠️ finalPromptForImageModel is short or missing, but accepting");
      // Don't throw - let it proceed even if short
    }
    if (result.decorReferences.length === 0) {
      console.warn("⚠️ No decor references but status=ok - AI should ideally include decor refs");
      // Don't throw - the AI might have good reasons
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
