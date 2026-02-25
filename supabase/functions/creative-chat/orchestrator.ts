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
  recommendedFormat?: string;
}

// ============================================================================
// Format Detection - Maps content types to optimal image dimensions
// ============================================================================

export interface ImageFormat {
  width: number;
  height: number;
  label: string;
  aspectRatio: string;
}

export const FORMAT_PRESETS: Record<string, ImageFormat> = {
  "linkedin_post":      { width: 1200, height: 627,  label: "LinkedIn Post",           aspectRatio: "1.91:1" },
  "linkedin_square":    { width: 1080, height: 1080, label: "LinkedIn Carré",           aspectRatio: "1:1" },
  "linkedin_portrait":  { width: 1080, height: 1350, label: "LinkedIn Portrait",        aspectRatio: "4:5" },
  "instagram_post":     { width: 1080, height: 1080, label: "Instagram Post",           aspectRatio: "1:1" },
  "instagram_story":    { width: 1080, height: 1920, label: "Instagram Story",          aspectRatio: "9:16" },
  "instagram_portrait": { width: 1080, height: 1350, label: "Instagram Portrait",       aspectRatio: "4:5" },
  "facebook_post":      { width: 1200, height: 630,  label: "Facebook Post",            aspectRatio: "1.91:1" },
  "kakemono":           { width: 800,  height: 2000, label: "Kakémono / Roll-up",       aspectRatio: "2:5" },
  "affiche_a3":         { width: 1191, height: 1684, label: "Affiche A3 Portrait",      aspectRatio: "1:1.41" },
  "affiche_paysage":    { width: 1684, height: 1191, label: "Affiche A3 Paysage",       aspectRatio: "1.41:1" },
  "catalogue_cover":    { width: 1080, height: 1527, label: "Couverture Catalogue A4",  aspectRatio: "1:1.41" },
  "catalogue_spread":   { width: 1920, height: 1080, label: "Double page Catalogue",    aspectRatio: "16:9" },
  "banner_web":         { width: 1920, height: 600,  label: "Bannière Web",             aspectRatio: "3.2:1" },
  "presentation_16_9":  { width: 1920, height: 1080, label: "Présentation 16:9",        aspectRatio: "16:9" },
  "square":             { width: 1080, height: 1080, label: "Carré",                    aspectRatio: "1:1" },
  "portrait":           { width: 1080, height: 1440, label: "Portrait",                 aspectRatio: "3:4" },
  "landscape":          { width: 1440, height: 1080, label: "Paysage",                  aspectRatio: "4:3" },
};

/**
 * Detect optimal format from user prompt keywords
 */
export function detectFormatFromPrompt(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  
  const formatPatterns: Array<{ keywords: string[]; format: string }> = [
    // LinkedIn
    { keywords: ["linkedin", "linked in"], format: "linkedin_post" },
    // Instagram
    { keywords: ["instagram", "insta", "ig"], format: "instagram_post" },
    { keywords: ["story", "stories", "reel"], format: "instagram_story" },
    // Facebook
    { keywords: ["facebook", "fb"], format: "facebook_post" },
    // Print formats
    { keywords: ["kakemono", "kakémono", "roll-up", "rollup", "roll up", "totem"], format: "kakemono" },
    { keywords: ["affiche", "poster"], format: "affiche_a3" },
    // Catalog / brochure
    { keywords: ["couverture catalogue", "cover catalogue", "couverture brochure"], format: "catalogue_cover" },
    { keywords: ["catalogue", "brochure", "plaquette"], format: "catalogue_cover" },
    { keywords: ["double page", "spread"], format: "catalogue_spread" },
    // Web
    { keywords: ["bannière", "banniere", "banner", "bandeau"], format: "banner_web" },
    // Presentation
    { keywords: ["présentation", "presentation", "slide", "diapo", "powerpoint", "ppt"], format: "presentation_16_9" },
    // Generic
    { keywords: ["carré", "carre", "square"], format: "square" },
    { keywords: ["portrait", "vertical"], format: "portrait" },
    { keywords: ["paysage", "landscape", "horizontal", "panoramique"], format: "landscape" },
  ];

  // Check for story/reel variant for instagram
  if ((lower.includes("instagram") || lower.includes("insta")) && (lower.includes("story") || lower.includes("stories") || lower.includes("reel"))) {
    return "instagram_story";
  }
  // Check for portrait variant for linkedin/instagram
  if ((lower.includes("linkedin") || lower.includes("instagram")) && lower.includes("portrait")) {
    return lower.includes("linkedin") ? "linkedin_portrait" : "instagram_portrait";
  }
  // Check for square variant for linkedin
  if (lower.includes("linkedin") && (lower.includes("carré") || lower.includes("carre") || lower.includes("square"))) {
    return "linkedin_square";
  }

  for (const { keywords, format } of formatPatterns) {
    if (keywords.some(kw => lower.includes(kw))) {
      return format;
    }
  }

  return null; // No specific format detected = default square
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

  // Detect format from user prompt
  const detectedFormat = detectFormatFromPrompt(input.userPrompt);
  if (detectedFormat) {
    const preset = FORMAT_PRESETS[detectedFormat];
    console.log(`📐 Format détecté: ${preset.label} (${preset.width}x${preset.height})`);
  }
  console.log("- Decor context length:", input.decorContext.length);

  const systemPrompt = buildOrchestratorSystemPrompt();
  const userMessage = buildOrchestratorUserMessage(input);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
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
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Orchestrator API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Orchestrator raw response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "validate_dica_request") {
      throw new Error("Invalid orchestrator response format");
    }

    const result = JSON.parse(toolCall.function.arguments) as OrchestratorResult;
    
    validateOrchestratorResult(result, input.decorContext);
    
    // Attach detected format
    if (detectedFormat) {
      result.recommendedFormat = detectedFormat;
    }

    console.log("✅ Orchestration result:", {
      status: result.status,
      projectType: result.projectType,
      decorReferences: result.decorReferences,
      nbVariants: result.nbVariants,
      recommendedFormat: result.recommendedFormat || "default (square)"
    });

    return result;
  } catch (error: any) {
    console.error("❌ Orchestration error:", error);
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
 * Build system prompt for orchestrator — 100% dynamique, aucun exemple hardcodé
 */
function buildOrchestratorSystemPrompt(): string {
  return `Tu es le "DICA Prompt Orchestrator", un expert IA spécialisé dans la validation et structuration des demandes pour le catalogue DICA.

🎯 TA MISSION:
Transformer toute demande utilisateur en un prompt de génération d'image de haute qualité, en utilisant UNIQUEMENT les décors du catalogue DICA fourni.

⚠️ PRINCIPE FONDAMENTAL: OPTIMISER ET JAMAIS BLOQUER
Tu retournes status="ok" dans ~95% des cas. Tu combles intelligemment les détails manquants.

═══════════════════════════════════════════════════════════════════
🔒 RÈGLE #1 - SÉLECTION STRICTE PAR GAMME (CRITIQUE!)
═══════════════════════════════════════════════════════════════════

Le catalogue est organisé en GAMMES. Tu DOIS respecter ces règles:

🏢 ASCENSEUR / CABINE / ÉLÉVATEUR:
- Mots-clés: ascenseur, cabine, élévateur, lift, elevator
- → GAMME ASCENSEUR uniquement
- → Décors "Parois" sur les PAROIS/MURS de la cabine
- → Décors "Sol" sur le SOL de la cabine
- → Génère un INTÉRIEUR D'ASCENSEUR, jamais un salon ou autre espace
- → SURFACES AUTORISÉES: parois intérieures, sol de cabine
- → SURFACES INTERDITES: plafond, boutons, portes métalliques, éclairage, mains courantes

🚐 VAN / ÉVASION / FOURGON:
- Mots-clés: van, évasion, fourgon, camping-car, van life, véhicule
- → GAMME ÉVASION uniquement pour les aménagements intérieurs
- → Génère un INTÉRIEUR DE VAN AMÉNAGÉ, jamais un salon ou autre espace
- → SURFACES AUTORISÉES: placards, meubles de rangement, plans de travail, aménagements bois/panneaux
- → SURFACES INTERDITES: coussins, textile, rideaux, matelas, sièges tissu, volant, tableau de bord
- → Si le prompt demande un SOL de van: utiliser le catalogue SOL de la GAMME ASCENSEUR
- → ⚠️ JAMAIS appliquer de décor DICA sur du textile, des coussins ou du tissu

☀️ TERRASSE / TABLE / RESTAURANT / CAFÉ / CUISINE (plans de travail):
- Mots-clés: terrasse, table, restaurant, café, plateau, compact, compactop, plan de travail, cuisine (comptoir)
- → GAMME COMPACTOP uniquement
- → SURFACES AUTORISÉES EXCLUSIVEMENT: dessus de tables, plateaux de table, plans de travail de cuisine
- → ⚠️ JAMAIS appliquer sur: murs, sols, chaises, pieds de table, parasols, végétation, vaisselle, personnes, façades, mobilier autre que plateau
- → Le décor Compactop est un REVÊTEMENT DE SURFACE HORIZONTALE (table/comptoir)

📦 AUTRE (si aucune gamme ci-dessus ne correspond):
- → Utilise la GAMME AUTRE (catalogue généraliste DICA)
- → Surfaces autorisées: murs, cloisons, panneaux décoratifs, mobilier à panneaux
- → Surfaces interdites: textile, coussins, rideaux, vêtements, objets non-panneau

⚠️ SI LE PROMPT EST VAGUE et qu'aucune gamme n'est identifiable:
- → Choisis la gamme avec le plus de décors et génère un espace cohérent

═══════════════════════════════════════════════════════════════════
🚫 RÈGLE ABSOLUE - SURFACES INTERDITES (TOUTES GAMMES)
═══════════════════════════════════════════════════════════════════
Les décors DICA sont des PANNEAUX STRATIFIÉS / REVÊTEMENTS DE SURFACE RIGIDE.
Ils ne s'appliquent JAMAIS sur:
- Textile, tissu, coussins, rideaux, matelas, sièges rembourrés
- Verre, vitres, miroirs
- Éclairage, luminaires
- Végétation, plantes
- Personnes, vêtements
- Vaisselle, objets décoratifs
- Parties mécaniques (moteurs, volants, tableaux de bord)

Les décors DICA s'appliquent UNIQUEMENT sur des surfaces planes et rigides:
murs, cloisons, portes de placard, plans de travail, plateaux de table, sols, panneaux décoratifs

═══════════════════════════════════════════════════════════════════
🔒 RÈGLE #2 - DÉCORS CATALOGUE UNIQUEMENT
═══════════════════════════════════════════════════════════════════
- COPIE-COLLE les reference_code EXACTEMENT depuis le catalogue
- JAMAIS inventer, modifier ou abréger une référence
- Si l'utilisateur mentionne une couleur/style → trouve le décor DICA le plus proche DANS LA BONNE GAMME

═══════════════════════════════════════════════════════════════════
🔒 RÈGLE #3 - EXACTITUDE VISUELLE
═══════════════════════════════════════════════════════════════════
Respecter les propriétés matériaux selon le type de finition:
- BRILLANT: surface brillante avec reflets
- SATIN: surface satinée douce
- WOOD/FOREST/KYNEA: veinage bois TOUJOURS VERTICAL (grain de haut en bas, JAMAIS horizontal), lumière chaleureuse
- SPA: surface lisse uniforme
- WRAKY: texture sol robuste
- ALU: effet aluminium brossé

═══════════════════════════════════════════════════════════════════
🔒 RÈGLE #4 - FIDÉLITÉ DE L'ESPACE GÉNÉRÉ
═══════════════════════════════════════════════════════════════════
- Si le client dit "van" → tu génères un VAN, pas un salon
- Si le client dit "ascenseur" → tu génères un ASCENSEUR, pas une cuisine
- Si le client dit "terrasse" → tu génères des TABLES EN TERRASSE, pas un intérieur
- JAMAIS changer le type d'espace demandé par le client

📋 LOGIQUE DE VALIDATION:
✅ Status "ok" (~95%): Le prompt est clair ou flou → tu complètes intelligemment EN RESPECTANT la bonne gamme
⚠️ Status "need_clarification" (<3%): Décor introuvable et intention impossible à deviner
❌ Status "reject" (<2%): Demande explicite de ne PAS utiliser DICA

📐 INFORMATIONS DE SURFACE:
- "PAROI" dans la référence = murs/parois
- "SOL" dans la référence = sols

🎬 PROMPT FINAL (finalPromptForImageModel):
- En ANGLAIS pour le modèle de génération
- Qualité PHOTOGRAPHIQUE PROFESSIONNELLE
- Espace RÉEL (pas un studio photo)
- Références DICA exactes avec propriétés matériaux
- Éclairage naturel professionnel
- ⚠️ Pour les décors BOIS/WOOD: TOUJOURS préciser "with VERTICAL wood grain running top to bottom, NEVER horizontal grain" dans le prompt final

⚡ TON ATTITUDE:
- Créatif et non-bloquant: tu optimises plutôt que tu bloques
- ULTRA-STRICT sur la sélection de gamme: tu ne mélanges JAMAIS les gammes
- Rigoureux sur les références: COPIE-COLLE depuis le catalogue
- Si un détail manque, tu l'inventes intelligemment DANS la bonne gamme`;
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
      console.log(`📋 Extracted ${validRefs.size} refs from JSON`);
    }
  } catch (e) {
    console.log("JSON parsing failed, using pattern matching");
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
  
  console.log(`📋 Total extracted: ${validRefs.size} valid reference codes`);
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
  console.log(`🔍 Valid refs available: ${validRefs.size} references`);
  
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
        console.log(`✅ VALID: ${ref}`);
      } else {
        const bestMatch = findBestMatch(ref, validRefs);
        if (bestMatch) {
          validatedRefs.push(bestMatch);
          if (originalLabels[i]) validatedLabels.push(originalLabels[i]);
          correctedRefs.push({ from: ref, to: bestMatch });
          console.log(`🔄 AUTO-CORRECTED: "${ref}" → "${bestMatch}"`);
        } else {
          invalidRefs.push(ref);
          console.error(`❌ REJECTED (no match): "${ref}"`);
        }
      }
    }
    
    if (correctedRefs.length > 0) {
      console.log(`🔧 Auto-corrected ${correctedRefs.length} references`);
    }
    
    if (invalidRefs.length > 0 && result.status === "ok") {
      console.error(`🚫 ${invalidRefs.length} unmatched refs: ${invalidRefs.join(', ')}`);
      
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
    
    console.log(`📊 Final: ${originalCount} refs → ${validatedRefs.length} valid (${correctedRefs.length} corrected, ${invalidRefs.length} rejected)`);
  } else if (result.status === "ok") {
    console.warn(`⚠️ No decor references provided but status=ok`);
  }

  if (result.status === "ok") {
    if (!result.finalPromptForImageModel || result.finalPromptForImageModel.length < 30) {
      console.warn("⚠️ finalPromptForImageModel is short or missing");
    }
    if (result.decorReferences.length === 0) {
      console.warn("⚠️ No valid decor references after validation");
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
