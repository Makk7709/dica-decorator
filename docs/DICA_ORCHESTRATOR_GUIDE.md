# Guide DICA Prompt Orchestrator

## Vue d'ensemble

Le DICA Prompt Orchestrator est une couche d'intelligence artificielle **créative et non-bloquante** qui se situe entre les demandes utilisateurs et le modèle de génération d'images (Nano Banana / Gemini 3 Pro Image Preview).

### Principe fondamental

**TOUJOURS OPTIMISER, JAMAIS BLOQUER** : L'orchestrateur retourne presque toujours `status="ok"` (~95% des cas) en comblant intelligemment les détails manquants, avec seulement 2 contraintes strictes et non-négociables.

## Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌────────────────┐
│   Utilisateur│  -->  │  Orchestrateur   │  -->  │  Nano Banana   │
│   (Prompt)   │       │  (Lovable AI)    │       │  (Génération)  │
└─────────────┘       └──────────────────┘       └────────────────┘
                              │
                              ├── Optimisation créative
                              ├── Respect décors catalogue DICA
                              └── Exactitude visuelle stricte
```

## Workflow détaillé

### 1. Réception de la demande

L'orchestrateur reçoit:
- `userPrompt`: Le texte brut de l'utilisateur
- `decorContext`: Le catalogue complet des décors DICA actifs
- `sourceImages`: Les images de référence uploadées (optionnel)
- `imageLabels`: Les labels pour chaque image source
- `projectContext`: Contexte du projet (type, secteur, etc.)

### 2. Analyse et optimisation créative

L'orchestrateur (via Lovable AI GPT model) effectue:
- ✅ Identification ou **invention intelligente** du type d'espace (van, cuisine, ascenseur, etc.)
- ✅ Extraction ou **sélection automatique** des décors DICA appropriés
- ✅ Vérification stricte que les décors existent dans le catalogue
- ✅ Validation de l'exactitude visuelle des décors (propriétés matériaux respectées)
- ✅ **Comblement créatif** des informations manquantes ou ambiguës
- ✅ Enrichissement du prompt avec contexte professionnel cohérent

### 3. Statuts de sortie (approche non-bloquante)

#### ✅ Status: "ok" (~95% des cas)
La demande est optimisée et prête pour la génération, avec détails manquants complétés intelligemment.

Contient:
- `projectType`: Type d'espace identifié ou inventé intelligemment
- `decorReferences`: Codes de référence DICA à utiliser (catalogue uniquement)
- `decorLabels`: Noms lisibles des décors
- `nbVariants`: Nombre de variantes à générer (1-4)
- `finalPromptForImageModel`: Prompt enrichi et structuré en anglais pour Nano Banana
- `technicalConstraints`: Contraintes techniques identifiées

**L'orchestrateur retourne "ok" même si :**
- Le prompt utilisateur est flou ou vague (il invente les détails)
- Le type d'espace n'est pas spécifié (il choisit le plus logique)
- Aucun décor n'est mentionné (il sélectionne le plus approprié)
- Des détails manquent (il les complète créativement)

Exemple de prompt généré:
```
Professional interior visualization of a modern van conversion 
with DICA decorative panels. The space features DICA Metal panels 
(ref: 3040_BN_PF - brushed stainless steel with authentic brushed 
texture and directional light reflections) on interior walls and 
cabinet fronts, creating a sleek contemporary aesthetic. Soft 
natural daylight from side windows, cozy compact layout with bench 
seating and storage. Photorealistic rendering, high-end catalog 
quality, sharp details on authentic material properties.
```

#### ⚠️ Status: "need_clarification" (<3% des cas)
La demande est vraiment impossible à interpréter ou les décors mentionnés n'existent pas.

Contient:
- `clarificationQuestions`: Liste de 1-3 questions précises à poser

**Cas d'usage extrêmement rares :**
- Décors mentionnés inexistants ET intention impossible à deviner
- Demande totalement absurde

Exemple:
```json
{
  "status": "need_clarification",
  "clarificationQuestions": [
    "Le décor 'ULTRA_GOLD_9999' n'existe pas dans notre catalogue. Souhaitez-vous utiliser un décor Metal brillant ou Unis doré à la place ?"
  ]
}
```

#### ❌ Status: "reject" (<2% des cas)
La demande viole les contraintes strictes de façon irréparable.

Contient:
- `rejectionReason`: Explication claire du rejet

**Cas d'usage exceptionnels :**
- Demande explicite de ne pas utiliser de décors DICA
- Impossibilité absolue de respecter les 2 contraintes strictes

Exemple:
```json
{
  "status": "reject",
  "rejectionReason": "La demande exige explicitement de ne pas utiliser le catalogue DICA, ce qui viole notre contrainte métier fondamentale."
}
```

## Contraintes strictes (2 seules règles non-négociables)

### 1. Décors catalogue DICA uniquement
- ✅ Utiliser EXCLUSIVEMENT les décors du catalogue DICA fourni
- ❌ JAMAIS inventer de couleurs, textures ou références hors catalogue
- ✅ Si l'utilisateur mentionne une couleur/style, trouver le décor DICA le plus proche
- ✅ Vérifier que chaque référence existe dans le catalogue

### 2. Exactitude visuelle des décors
Respecter STRICTEMENT les propriétés matériaux de chaque décor :

- **Metal** : lignes de brossage visibles, reflets directionnels, jamais grain/mat
- **Unis** : surface lisse sans grain, lumière diffuse, jamais reflets métalliques
- **Marbre** : veines minérales réalistes, léger brillant jamais métallique, profondeur mate avec reflets subtils
- **Bois** : veinage orienté suivant panneaux existants, lumière chaleureuse non-métallique, structure bois préservée
- **Déco** : motifs originaux préservés, pas de brillant non désiré, contraste/densité/répétition respectés

Les textures et couleurs des décors doivent être appliquées EXACTEMENT comme dans le catalogue, sans modification de l'apparence intrinsèque.

## Approche créative et non-bloquante

### Philosophie
L'orchestrateur est un **optimiseur créatif**, pas un validateur strict. Son rôle est d'améliorer et compléter les prompts, pas de les rejeter.

### Exemples de gestion créative

#### Prompt flou
```
Entrée: "un van avec des panneaux blancs"
Sortie: Status "ok" avec invention créative
→ "Modern van interior with DICA Unis white panels (ref: 800_SATIN - smooth matte white) 
   on walls and ceiling, contemporary minimalist design, professional lighting"
```

#### Prompt avec image source
```
Entrée: "améliore cette cuisine" + [photo fournie]
Sortie: Status "ok" avec application intelligente
→ "Apply DICA Marbre premium panels (ref: 3133_SPA_FC - natural marble with realistic veining) 
   to kitchen walls and backsplash, preserving existing layout, enhancing with subtle gloss finish"
```

#### Prompt créatif libre
```
Entrée: "un bureau futuriste avec du métal"
Sortie: Status "ok" avec structuration professionnelle
→ "Futuristic office interior featuring DICA Metal panels (ref: 3025_HR_FC - hairline brushed steel 
   with authentic directional reflections), modern architecture, clean lines, professional lighting"
```

#### Prompt totalement vague
```
Entrée: "quelque chose de joli"
Sortie: Status "ok" avec choix intelligent
→ "Premium interior space with DICA Unis panels (ref: 800_SATIN) creating a sophisticated minimalist 
   aesthetic, modern furniture, soft natural lighting, clean contemporary design"
```

### Règles d'optimisation

1. **Toujours compléter** : Si type d'espace manquant → choisir le plus logique
2. **Toujours enrichir** : Ajouter contexte professionnel, éclairage, ambiance
3. **Toujours sélectionner** : Si aucun décor mentionné → choisir le plus approprié du catalogue
4. **Toujours respecter** : Catalogue DICA + exactitude visuelle décors

## Intégration technique

### Edge Function (supabase/functions/creative-chat/)

```typescript
import { orchestrateDicaPrompt } from "./orchestrator.ts";

// 1. Préparer l'input
const orchestratorInput: OrchestratorInput = {
  userPrompt: messages[messages.length - 1].content,
  decorContext: buildDecorContext(),
  sourceImages: allSourceImages,
  imageLabels: allImageLabels,
  projectContext: {
    projectType: "assistant_crea"
  }
};

// 2. Appeler l'orchestrateur
const result = await orchestrateDicaPrompt(
  orchestratorInput, 
  LOVABLE_API_KEY
);

// 3. Gérer les statuts
if (result.status === "need_clarification") {
  return clarificationResponse(result.clarificationQuestions);
}

if (result.status === "reject") {
  return rejectionResponse(result.rejectionReason);
}

// 4. Générer l'image avec le prompt validé
const imageResponse = await generateWithNanoBanana(
  result.finalPromptForImageModel,
  sourceImages
);
```

### Utilisation de Lovable AI

Le système utilise le modèle `google/gemini-2.5-flash` via Lovable AI Gateway:
- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Authentification: `LOVABLE_API_KEY` (fournie automatiquement)
- Tool calling pour JSON structuré
- Rapide et économique pour l'orchestration

## Logs et monitoring

### Logs clés à surveiller

```typescript
console.log("🎯 DICA Orchestrator - Starting validation");
console.log("📊 Orchestration result:", {
  status: result.status,
  projectType: result.projectType,
  decorReferences: result.decorReferences,
  nbVariants: result.nbVariants
});
```

### Métriques importantes

- Taux de succès (`status: "ok"`)
- Taux de clarification nécessaire
- Taux de rejet
- Temps de réponse de l'orchestrateur
- Coût par requête

## Contrôle qualité

### Tests à effectuer

#### 1. Prompts clairs
```
"Crée un van moderne avec les panneaux Metal 3040 BN"
→ Doit retourner status="ok" avec prompt enrichi
```

#### 2. Prompts flous/vagues
```
"Je veux quelque chose de joli"
→ Doit retourner status="ok" en inventant détails cohérents
```

#### 3. Prompts sans décor spécifié
```
"Une cuisine moderne"
→ Doit retourner status="ok" en sélectionnant décor approprié du catalogue
```

#### 4. Prompts avec image source
```
"Applique un décor à cette photo" + [image]
→ Doit retourner status="ok" avec application intelligente
```

#### 5. Prompts avec décors invalides
```
"Utilise du marbre rose pailleté et de l'or massif"
→ Peut retourner status="ok" en substituant avec décors DICA proches, 
   ou "need_clarification" si impossible de deviner l'intention
```

## Évolution future

### Règles métier supplémentaires

- Contraintes sectorielles (santé, éducation, hôtellerie)
- Contraintes réglementaires (normes feu, accessibilité)
- Optimisation des associations de décors
- Détection des budgets et gammes

### Améliorations techniques

- Cache des validations fréquentes
- Modèle fine-tuné spécifique DICA
- Support multi-langues
- Historique des validations par utilisateur

## Résolution de problèmes

### Problème: L'orchestrateur rejette tout
→ Vérifier que `decorContext` est bien fourni et contient les décors
→ Vérifier les logs de validation
→ Tester avec un prompt simple et valide

### Problème: Temps de réponse trop long
→ Vérifier la taille du `decorContext` (peut être optimisé)
→ Considérer le cache pour les catalogues
→ Vérifier les limites de rate de Lovable AI

### Problème: Décors non reconnus
→ Vérifier que les références dans le catalogue sont correctes
→ Vérifier le format du catalogue (nom, reference_code, etc.)
→ Vérifier les logs de parsing du catalogue

## Résumé

Le DICA Prompt Orchestrator garantit:
- ✅ Approche créative et non-bloquante (~95% taux de succès)
- ✅ Respect strict du catalogue DICA (contrainte #1)
- ✅ Exactitude visuelle des décors (contrainte #2)
- ✅ Prompts enrichis et structurés automatiquement
- ✅ Qualité d'image supérieure avec propriétés matériaux authentiques
- ✅ Expérience utilisateur fluide sans blocages inutiles

C'est un **optimiseur intelligent** qui transforme toute demande en prompt de haute qualité tout en protégeant l'intégrité de la marque DICA et l'exactitude visuelle des décors.
