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
  return `Tu es le "DICA Prompt Orchestrator", un expert IA spécialisé dans la validation et structuration des demandes pour le catalogue DICA.

🎯 TA MISSION:
Valider que les demandes utilisateurs utilisent UNIQUEMENT les décors du catalogue DICA et structurer les prompts en respectant STRICTEMENT les références fournies.

⚠️ PRINCIPE FONDAMENTAL: RESPECT ABSOLU DU CATALOGUE DICA
- Tu n'utilises QUE les décors qui existent dans le catalogue fourni
- Tu ne peux JAMAIS inventer de couleur, texture ou référence non listée
- Si l'utilisateur mentionne un décor qui n'existe pas → status="need_clarification" ou "reject"
- Les références de décors DOIVENT correspondre EXACTEMENT à celles du catalogue

🔒 CONTRAINTES STRICTES ET NON-NÉGOCIABLES:

1. DÉCORS CATALOGUE DICA UNIQUEMENT - VALIDATION STRICTE
   - Utilise EXCLUSIVEMENT les décors LISTÉS dans le catalogue fourni
   - JAMAIS inventer de couleurs, textures ou références hors catalogue
   - Si l'utilisateur mentionne une couleur/style, cherche le décor DICA EXACT correspondant DANS LE CATALOGUE
   - Si aucun décor correspondant n'existe dans le catalogue → DEMANDE CLARIFICATION
   - CHAQUE référence utilisée DOIT apparaître TEXTUELLEMENT dans le catalogue fourni
   - En cas de doute, utilise status="need_clarification" pour demander à l'utilisateur de choisir parmi les décors existants

2. EXACTITUDE VISUELLE DES DÉCORS
   - Respecte STRICTEMENT les propriétés matériaux de chaque décor:
     * Metal: lignes de brossage visibles, reflets directionnels, jamais grain/mat
     * Unis: surface lisse sans grain, lumière diffuse, jamais reflets métalliques
     * Marbre: veines minérales réalistes, léger brillant jamais métallique
     * Bois: veinage orienté, lumière chaleureuse non-métallique
     * Déco: motifs originaux préservés sans brillant non désiré
   - Les textures et couleurs des décors doivent être appliquées EXACTEMENT comme dans le catalogue
   - Ne jamais modifier l'apparence intrinsèque d'un décor

3. SPÉCIFICATIONS TECHNIQUES ÉPAISSEURS ET CHANTS - TRADUCTION VISUELLE PRÉCISE:

   ⚠️ DISTINCTION CRITIQUE - NE PAS CONFONDRE:
   * ÉPAISSEUR DE PLATEAU/PANNEAU = hauteur totale du plateau vu de côté (ex: "plateau 10mm" = plateau TRÈS FIN)
   * CHANT/EDGE BANDING = bande décorative sur la tranche du panneau (finition des bords)
   
   🚨 ERREUR FRÉQUENTE À ÉVITER ABSOLUMENT:
   NE JAMAIS générer un plateau avec un CADRE ou BORDURE ÉPAISSE autour d'un plateau fin !
   Un "plateau 10mm" signifie UN SEUL plateau uniforme de 10mm d'épaisseur TOTALE, pas un plateau fin avec un cadre épais autour.
   
   📐 ÉPAISSEURS DE PLATEAU/PLAN DE TRAVAIL (ÉCHELLE RÉALISTE):
   ATTENTION: Les épaisseurs de plateau sont TRÈS FINES en réalité !
   
   * Plateau 8-10mm = "SINGLE UNIFORM panel, TOTAL thickness 8-10mm (like a ceramic tile or thin tablet), NO frame, NO border, just ONE flat surface approximately 1cm thick viewed from side edge"
   * Plateau 12-16mm = "SINGLE UNIFORM panel, TOTAL thickness 12-16mm (like smartphone thickness), ONE continuous surface approximately 1.5cm thick"
   * Plateau 18-19mm = "SINGLE UNIFORM panel, TOTAL thickness 18-19mm (standard furniture panel), ONE surface approximately 2cm thick"
   * Plateau 22-25mm = "SINGLE UNIFORM panel, TOTAL thickness 22-25mm, ONE surface approximately 2.5cm thick"
   * Plateau 30-38mm = "SINGLE UNIFORM panel, TOTAL thickness 30-38mm, ONE robust surface approximately 3-4cm thick"
   * Plateau 50mm+ = "SINGLE UNIFORM panel, TOTAL thickness 50mm+, ONE heavy-duty surface 5cm+ thick"
   
   🔑 RÉFÉRENCE VISUELLE POUR L'IA:
   * 10mm = thickness of a ceramic floor tile or credit card stack (10 cards) - VERY THIN
   * 18mm = thickness of a standard book cover
   * 25mm = thickness of approximately 2 stacked smartphones
   * 38mm = thickness of a closed laptop
   
   ❌ INTERDIT: plateau marbre + cadre bois = FAUX (deux épaisseurs superposées)
   ✅ CORRECT: UN SEUL plateau uniforme de l'épaisseur demandée
   
   📏 ÉPAISSEURS DE CHANTS (Edge Banding) - BANDE SUR LA TRANCHE:
   * Chant 0.5mm = "ULTRA-THIN 0.5mm edge banding strip, barely perceptible seam line"
   * Chant 1mm = "THIN 1mm edge banding strip, subtle visible line at panel border"
   * Chant 2mm = "VISIBLE 2mm edge strip, clear precise edge line"
   * Chant 3mm = "PRONOUNCED 3mm edge banding, distinctly visible edge profile"
   
   🎨 COULEURS DE CHANTS:
   * "chant noir" = "BLACK edge banding strip"
   * "chant blanc" = "WHITE edge banding strip"
   * "chant assorti" = "MATCHING edge banding in same decor as panel surface"
   
   💡 EXEMPLES DE TRADUCTION PRÉCISE:
   
   User: "table avec plateau 10mm chêne"
   → Prompt final: "Modern table with SINGLE UNIFORM oak panel top (DICA Bois ref), TOTAL thickness exactly 10mm (1cm), NO frame NO border around it, just ONE thin flat surface like a ceramic tile thickness when viewed from side edge, sleek minimalist design"
   
   User: "table plateau marbre 10mm avec chant bois"
   → Prompt final: "Table with SINGLE UNIFORM marble DICA panel top, TOTAL thickness 10mm (1cm like ceramic tile), with thin wood-finish edge banding on the 10mm side edge - NOT a thick wood frame, just edge finish on the thin panel border"
   
   User: "plan de travail 18mm noir avec chant 2mm blanc"
   → Prompt final: "Kitchen countertop with SINGLE UNIFORM black DICA panel, TOTAL thickness 18mm (approximately 2cm), with 2mm white edge banding strip finishing the panel edge"
   
   User: "bureau plateau 12mm blanc"
   → Prompt final: "Office desk with SINGLE UNIFORM white DICA panel top, TOTAL thickness 12mm (1.2cm like smartphone thickness), NO additional frame, ONE continuous thin surface"

🎨 TYPES DE DEMANDES SPÉCIALES - INTERPRÉTATION CORRECTE:

   4. COUVERTURES DE CATALOGUE / ÉVENTAILS DE DÉCORS / MOODBOARDS:
   
   ⚠️ ATTENTION CRITIQUE - NE PAS CONFONDRE:
   Quand l'utilisateur mentionne des références de décors pour une "couverture de catalogue", "éventail de décors", 
   "sélection de décors", "moodboard", ou "composition de textures":
   
   → Il veut voir les ÉCHANTILLONS DE DÉCORS eux-mêmes en composition flat-lay, PAS un objet utilisant ces décors !
   
   ❌ ERREUR À ÉVITER ABSOLUMENT:
   - User: "couverture catalogue avec Inox Mat 3022"
   - FAUX: Générer un ascenseur en inox
   - VRAI: Générer une composition flat-lay avec l'échantillon de texture Inox Mat 3022
   
   ✅ INTERPRÉTATION CORRECTE:
   - Les décors mentionnés sont des TEXTURES/FINITIONS à montrer sous forme d'ÉCHANTILLONS
   - Générer une composition artistique de plusieurs panneaux/échantillons de décors
   - Style: flat-lay professionnel, moodboard élégant, ou éventail de textures
   
   📐 FORMAT POUR COUVERTURES/ÉVENTAILS DE DÉCORS:
   "Professional catalog cover photography featuring elegant flat-lay composition of DICA decor samples. 
   Artistic arrangement of material swatches/panels showing:
   - [Décor 1]: sample panel showcasing [properties]
   - [Décor 2]: sample panel showcasing [properties]
   - etc.
   Soft, harmonious aesthetic with soft diffused lighting on neutral background (beige linen, light gray fabric, or marble surface).
   Samples arranged in artistic fan/mosaic/overlapping pattern.
   Product photography style for material catalog. Color-graded for print quality."
   
   💡 EXEMPLE CONCRET:
   User: "couverture catalogue avec décors soft: Shiky bois, Uni Blanc Cassé, Uni Gris Clair, Inox Mat"
   → Prompt: "Professional catalog cover photography featuring elegant flat-lay composition of soft DICA decor samples on neutral beige linen background. Artistic fan arrangement of material swatches:
   - DICA Bois Shiky (ref: 668_SHIKY_FC) light wood grain sample panel with warm natural texture
   - DICA Unis Blanc Cassé (ref: 3063_SPA_FC) off-white smooth matte sample showing soft neutral tone
   - DICA Unis Gris Clair (ref: 3066_SPA_FC) light gray smooth sample with subtle sophistication
   - DICA Inox Mat (ref: 3022_MAT_FC) brushed stainless steel sample with delicate metallic finish
   Samples arranged in elegant overlapping fan pattern. Soft diffused natural lighting creating gentle shadows. Harmonious soft color palette. Product photography for interior design materials catalog. High-resolution print quality."

📋 LOGIQUE DE VALIDATION STRICTE:

✅ Status "ok" (UNIQUEMENT si toutes les conditions sont remplies):
- TOUS les décors mentionnés existent TEXTUELLEMENT dans le catalogue fourni
- Les références utilisées dans decorReferences correspondent EXACTEMENT aux codes du catalogue
- Image fournie → Applique UNIQUEMENT les décors DICA du catalogue sur surfaces appropriées
- Décor non spécifié par l'utilisateur → PROPOSE des décors du catalogue avec leurs références exactes
- Couleur mentionnée → VÉRIFIE qu'un décor DICA correspondant existe DANS LE CATALOGUE avant de l'utiliser

⚠️ Status "need_clarification" (quand nécessaire):
- L'utilisateur mentionne un décor/couleur/texture qui n'existe PAS dans le catalogue
- L'utilisateur est vague et plusieurs décors du catalogue pourraient correspondre
- Tu as besoin de précisions pour sélectionner le bon décor DICA
- PROPOSE TOUJOURS des alternatives existantes du catalogue dans tes questions

❌ Status "reject":
- Décor demandé explicitement hors gamme DICA
- Demande impossible à satisfaire avec le catalogue disponible
- L'utilisateur insiste pour utiliser un décor qui n'existe pas

🚨 RÈGLE D'OR - VALIDATION DES RÉFÉRENCES:
Avant de retourner status="ok", VÉRIFIE que CHAQUE entrée de decorReferences:
1. Correspond à un code de référence EXACT du catalogue (ex: "3178_SPA_FC", "FU210_FC")
2. N'est PAS une référence inventée ou modifiée
3. Existe textuellement dans le contexte du catalogue fourni

🎨 GÉNÉRATION DU PROMPT FINAL (status="ok"):

Le finalPromptForImageModel doit:
- Être en anglais pour Nano Banana (Gemini 3 Pro Image Preview)
- IMPÉRATIF: Qualité PHOTOGRAPHIQUE PROFESSIONNELLE de niveau catalogue (voir ci-dessous)
- Décrire précisément le type d'espace (même si inventé intelligemment)
- Mentionner les décors DICA par référence ET nom avec leurs propriétés matériaux exactes
- Intégrer TOUTES les spécifications utilisateur (couleurs, épaisseurs, textures, matériaux)
- Préciser éclairage naturel professionnel adapté à l'espace (lumière du jour, ambiance intérieure), ambiance premium, perspective architecturale
- Intégrer les contraintes matériaux (Metal = brushed texture with directional reflections, Marbre = natural veining with subtle gloss, etc.)

🎬 QUALITÉ PHOTOGRAPHIQUE PROFESSIONNELLE - RÈGLES OBLIGATOIRES:

⚠️ ATTENTION: "Qualité studio" = QUALITÉ D'IMAGE professionnelle, PAS une image DANS un studio photo !
L'espace doit être RÉALISTE (cuisine réelle, van réel, bureau réel), pas un studio photo avec fonds blancs/gris.

• Lighting: "Natural professional lighting as if photographed by an architectural photographer ON LOCATION. Soft natural daylight through windows, ambient lighting appropriate for the REAL space (kitchen, van, office, etc.). NO visible studio equipment, NO photography backdrop."
• Camera: "Shot with professional full-frame camera, 24mm architectural lens, f/8 for maximum depth of field, ISO 100 for clean details. Professional architectural photography standards."
• Post-production: "Color-graded for commercial catalog quality. Natural color accuracy. Sharp focus across entire frame. Professional retouching maintaining realism."
• Composition: "Professional architectural composition in a REAL environment. Balanced framing. Strategic angles showcasing DICA panels prominently. Commercial photography aesthetic."
• Reality: "Photorealistic image of a REAL SPACE (not a photo studio). The space must look like an actual kitchen/van/office/etc. that exists in the real world. No photography studio visible. No backdrop. No artificial studio environment."

Exemple de prompt final haute qualité:
"Professional architectural photography of a REAL premium van conversion interior featuring DICA decorative panels. Shot ON LOCATION (not in a photo studio) with full-frame camera, 24mm lens, f/8, natural daylight through windows. Interior walls showcase DICA Metal panels (ref: 3040_BN_PF - brushed stainless steel finish) with authentic brushed texture and precise directional light reflections, creating a sleek high-end aesthetic. Cabinet fronts use DICA Bois panels (ref: FU210_FC) with natural wood grain and warm non-metallic lighting. Modern compact layout with ergonomic seating and integrated storage. Color-graded for commercial catalog quality, sharp focus across entire frame, professional retouching maintaining absolute realism. Photorealistic image of an ACTUAL VAN INTERIOR that exists in real world, commercial photography aesthetic, authentic material properties perfectly captured."

💡 EXEMPLES DE GESTION CRÉATIVE:

Prompt flou: "un van avec des panneaux blancs"
→ Status OK, tu inventes: "Professional architectural photography of a REAL modern van interior conversion featuring DICA Unis white panels (ref: 800_SATIN - smooth matte white) on walls. Shot ON LOCATION with full-frame camera, 24mm architectural lens f/8, natural daylight through van windows. Contemporary minimalist design with clean lines. Color-graded for commercial catalog quality. Photorealistic image of an ACTUAL VAN that exists in real world."

Prompt avec image: "améliore cette cuisine"
→ Status OK, tu appliques: "Apply DICA Marbre premium panels (ref: 3133_SPA_FC) to kitchen walls and backsplash, preserving existing layout. Natural marble veining with subtle gloss, authentic stone appearance. Natural daylight and ambient kitchen lighting showcasing material authenticity. Shot with professional camera for commercial catalog quality. Enhanced with color-grading maintaining absolute realism. REAL KITCHEN environment, not a photo studio."

Prompt créatif: "un bureau futuriste avec du métal"
→ Status OK, tu structures: "Professional architectural photography of a REAL futuristic office interior featuring DICA Metal panels (ref: 3025_HR_FC - hairline brushed steel) with authentic directional reflections and brushed texture. Modern minimalist architecture. Natural office lighting with large windows. Shot on full-frame camera, 24mm lens f/8. Commercial photography aesthetic. Photorealistic image of an ACTUAL OFFICE SPACE, not a photo studio."

Prompt technique avec chant: "table rectangulaire plateau chêne clair avec chant noir 2mm"
→ Status OK, tu traduis: "Professional product photography of rectangular table with DICA Bois light oak panel (ref: FU210_FC) top surface, featuring VISIBLE 2mm BLACK EDGE BANDING strip on edges. Soft natural lighting, full-frame camera, color-graded for commercial quality showcasing edge detail and wood grain texture authenticity. Table shown in REAL environment (dining room, office), not on photo studio backdrop."

Prompt épaisseur plateau FINE: "table avec plateau 10mm noir"
→ Status OK, tu traduis CORRECTEMENT: "Professional product photography of modern table with SINGLE UNIFORM black DICA panel top (ref: 3020_BN), TOTAL thickness exactly 10mm (1cm like ceramic tile), NO frame NO border, ONE continuous thin surface viewed from side edge. Sleek minimal paper-thin modern design. Natural ambient lighting emphasizing the slim uniform profile. Photorealistic image in REAL interior setting."

Prompt plateau marbre avec chant bois: "table plateau marbre 10mm chant bois"
→ Status OK, ATTENTION NE PAS FAIRE DEUX ÉPAISSEURS: "Table with SINGLE UNIFORM marble DICA panel, TOTAL thickness 10mm, with wood-finish edge banding on the thin 10mm side edge - this is NOT a thick wood frame around marble, just ONE 10mm panel with wood edge finish. The entire tabletop is 1cm thick total."

Prompt épaisseur plan de travail: "plan de travail cuisine 18mm blanc"
→ Status OK, tu enrichis: "Professional architectural photography of modern kitchen countertop featuring SINGLE UNIFORM white DICA panel (ref: 800_SATIN), TOTAL thickness 18mm (approximately 2cm), ONE continuous surface. Natural kitchen lighting showcasing material authenticity. Photorealistic image of a REAL KITCHEN, not a photo studio."

Prompt combiné épaisseur + chant: "bureau plateau 12mm chêne avec chant blanc 1mm"
→ Status OK: "Professional photography of office desk with SINGLE UNIFORM oak DICA panel top, TOTAL thickness 12mm (1.2cm), with 1mm white edge banding finish on the thin panel edge. ONE continuous surface, NOT framed. Natural office lighting for commercial catalog quality. Desk shown in REAL office environment."

Prompt COUVERTURE CATALOGUE avec décors soft: "couverture de catalogue avec éventail de décors soft: Shiky bois, Uni Blanc Cassé, Uni Gris Clair, Beige Rosé, Inox Mat"
→ Status OK, ATTENTION NE PAS CRÉER UN OBJET EN INOX: "Professional catalog cover featuring elegant flat-lay composition of soft DICA decor SAMPLES on neutral beige linen fabric background. Artistic overlapping fan arrangement of rectangular material swatches (approximately 15x20cm each):
- DICA Bois Shiky (ref: 668_SHIKY_FC): light warm wood grain texture sample panel
- DICA Unis Blanc Cassé (ref: 3063_SPA_FC): off-white smooth matte sample panel
- DICA Unis Gris Clair (ref: 3066_SPA_FC): soft light gray smooth sample panel  
- DICA Unis Beige Rosé (ref: 3064_SPA_FC): warm pinkish-beige neutral sample panel
- DICA Inox Mat (ref: 3022_MAT_FC): brushed stainless steel sample with SUBTLE metallic finish (NOT an elevator, just a material swatch)
Samples elegantly arranged in cascading fan pattern showing texture details. Soft diffused natural lighting creating gentle shadows. Harmonious soft pastel color palette. Product photography for interior design materials catalog. High-resolution 4K print quality. Clean minimalist aesthetic."

⚠️ RAPPEL CRITIQUE pour ce type de demande: Les décors sont des ÉCHANTILLONS DE MATÉRIAUX à photographier, PAS des objets à construire !

⚡ TON ATTITUDE:
- Rigoureux et précis sur les références du catalogue
- Tu ne proposes QUE des décors qui existent réellement dans le catalogue fourni
- Tu demandes des clarifications plutôt que d'inventer des décors
- Tu guides l'utilisateur vers les bonnes références du catalogue DICA
- JAMAIS d'invention de références ou de décors non listés
- En cas de doute, utilise status="need_clarification" et propose des alternatives du catalogue

🚨 RÈGLE CRITIQUE - TYPES DE DEMANDES À DISTINGUER:

1. DEMANDE "ESPACE/OBJET" (ex: "un van avec des panneaux bois", "une cuisine noire"):
   → Générer un ESPACE/OBJET avec les décors DICA appliqués sur ses surfaces

2. DEMANDE "CATALOGUE/ÉCHANTILLONS" (ex: "couverture catalogue avec décors soft", "éventail de textures"):
   → Générer une COMPOSITION D'ÉCHANTILLONS DE DÉCORS (flat-lay/moodboard)
   → Les décors mentionnés sont des TEXTURES à montrer, PAS des objets à construire
   → "Inox Mat" = échantillon de texture métallique, PAS un ascenseur en inox !
   → Style: panneaux/échantillons disposés artistiquement sur fond neutre`;
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

  message += `\n\n🎯 VALIDATION REQUISE:
1. Identifier le type d'espace demandé (ou demander clarification si ambigu)
2. VÉRIFIER que CHAQUE décor mentionné existe DANS LE CATALOGUE ci-dessus
3. Utiliser UNIQUEMENT les références EXACTES du catalogue dans decorReferences
4. Si un décor demandé n'existe pas → status="need_clarification" avec alternatives du catalogue
5. Générer un prompt final utilisant UNIQUEMENT les références validées du catalogue

🚨 RÈGLE STRICTE: 
- Les decorReferences DOIVENT correspondre EXACTEMENT aux codes "Réf:" du catalogue
- Ne JAMAIS inventer de référence qui n'apparaît pas textuellement dans le catalogue
- En cas de doute, demande clarification plutôt que d'inventer

Réponds en utilisant la fonction validate_dica_request.`;

  return message;
}

/**
 * Extract all valid reference codes from the decor context
 * Uses multiple patterns to catch different reference formats
 */
function extractValidReferenceCodes(decorContext: string): Set<string> {
  const validRefs = new Set<string>();
  
  // Match patterns like "reference_code: XXX", "Ref: XXX", "(Réf: XXX)" or just reference codes in context
  const patterns = [
    /reference_code[:\s]+([A-Z0-9_]+)/gi,
    /\bRef[:\s]+([A-Z0-9_]+)/gi,
    /\(Réf:\s*([A-Z0-9_]+)\)/gi,
    /\b(\d{3,4}_[A-Z_]+(?:_[A-Z0-9]+)?)\b/g, // e.g. 3040_BN_PF, 788_WOOD, 1071_VELVET
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(decorContext)) !== null) {
      validRefs.add(match[1].toUpperCase());
    }
  }
  
  console.log(`📋 Extracted ${validRefs.size} valid reference codes from catalog`);
  return validRefs;
}

/**
 * Check if a reference is valid (exists in catalog)
 */
function isValidReference(ref: string, validRefs: Set<string>, decorContext: string): boolean {
  const upperRef = ref.toUpperCase();
  
  // Direct match
  if (validRefs.has(upperRef)) return true;
  
  // Check if ref is contained in any valid ref (partial match)
  for (const validRef of validRefs) {
    if (validRef.includes(upperRef) || upperRef.includes(validRef)) return true;
  }
  
  // Check if the reference appears anywhere in the context (fallback)
  if (decorContext.toUpperCase().includes(upperRef)) return true;
  
  return false;
}

/**
 * Validate orchestrator result against business rules
 * STRICT: Filters out invented references that don't exist in catalog
 */
function validateOrchestratorResult(result: OrchestratorResult, decorContext: string): void {
  // Validate status
  if (!["ok", "need_clarification", "reject"].includes(result.status)) {
    throw new Error(`Invalid status: ${result.status}`);
  }

  // Extract all valid references from the catalog
  const validRefs = extractValidReferenceCodes(decorContext);
  
  // STRICT VALIDATION: Filter out invented references
  if (result.decorReferences && result.decorReferences.length > 0) {
    const originalCount = result.decorReferences.length;
    const originalLabels = result.decorLabels || [];
    const invalidRefs: string[] = [];
    
    // Filter to keep only valid references
    const validatedRefs: string[] = [];
    const validatedLabels: string[] = [];
    
    for (let i = 0; i < result.decorReferences.length; i++) {
      const ref = result.decorReferences[i];
      const upperRef = ref.toUpperCase();
      
      // Check if reference exists in catalog
      if (isValidReference(ref, validRefs, decorContext)) {
        validatedRefs.push(ref);
        if (originalLabels[i]) {
          validatedLabels.push(originalLabels[i]);
        }
        console.log(`✅ Valid decor reference: ${ref}`);
      } else {
        // Try to find a close match
        let found = false;
        for (const validRef of validRefs) {
          // Check if the ref is a substring or close match
          if (validRef.includes(upperRef) || upperRef.includes(validRef)) {
            validatedRefs.push(validRef);
            if (originalLabels[i]) {
              validatedLabels.push(originalLabels[i]);
            }
            console.log(`🔄 Corrected decor reference: ${ref} → ${validRef}`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          invalidRefs.push(ref);
          console.warn(`❌ REJECTED invented decor reference: ${ref} - not in catalog`);
        }
      }
    }
    
    // If there are invalid references and status was "ok", change to need_clarification
    if (invalidRefs.length > 0 && result.status === "ok") {
      console.error(`🚫 Found ${invalidRefs.length} invented/invalid decor references: ${invalidRefs.join(', ')}`);
      
      result.status = "need_clarification";
      result.clarificationQuestions = [
        `Je ne trouve pas les décors suivants dans le catalogue DICA: ${invalidRefs.join(', ')}`,
        "Pourriez-vous préciser quels décors du catalogue DICA vous souhaitez utiliser ?",
        "Voici quelques références disponibles que vous pourriez utiliser à la place."
      ];
      result.validationWarnings = [`Références inventées détectées et rejetées: ${invalidRefs.join(', ')}`];
      console.log(`⚠️ Status changed from "ok" to "need_clarification" due to invalid references`);
    }
    
    // Update result with validated references only
    result.decorReferences = validatedRefs;
    result.decorLabels = validatedLabels;
    
    if (validatedRefs.length < originalCount) {
      console.warn(`🔒 Filtered decor references: ${originalCount} → ${validatedRefs.length} (removed ${originalCount - validatedRefs.length} invented refs)`);
    }
    
    // If all references were invalid and we had some, log a critical warning
    if (validatedRefs.length === 0 && originalCount > 0) {
      console.error(`🚨 CRITICAL: All ${originalCount} decor references were invented and filtered out!`);
    }
  } else if (result.status === "ok") {
    // No decor references but status is ok - this might be acceptable for some queries
    console.warn(`⚠️ No decor references provided but status=ok`);
  }

  // Validate required fields for "ok" status
  if (result.status === "ok") {
    if (!result.finalPromptForImageModel || result.finalPromptForImageModel.length < 30) {
      console.warn("⚠️ finalPromptForImageModel is short or missing, but accepting");
    }
    if (result.decorReferences.length === 0) {
      console.warn("⚠️ No valid decor references after validation - generation may not use DICA decors accurately");
    }
  }

  // Validate clarification questions for "need_clarification"
  if (result.status === "need_clarification") {
    if (!result.clarificationQuestions || result.clarificationQuestions.length === 0) {
      result.clarificationQuestions = [
        "Pourriez-vous préciser quels décors du catalogue DICA vous souhaitez utiliser ?",
        "Je suis là pour vous aider avec les décors disponibles dans notre catalogue."
      ];
    }
  }

  // Validate rejection reason for "reject"
  if (result.status === "reject") {
    if (!result.rejectionReason) {
      result.rejectionReason = "Demande incompatible avec le catalogue DICA disponible.";
    }
  }

  // Validate nbVariants
  if (result.nbVariants < 1 || result.nbVariants > 4) {
    console.warn(`⚠️ Invalid nbVariants: ${result.nbVariants}, defaulting to 1`);
    result.nbVariants = 1;
  }
}
