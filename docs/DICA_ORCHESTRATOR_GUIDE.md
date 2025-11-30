# Guide DICA Prompt Orchestrator

## Vue d'ensemble

Le DICA Prompt Orchestrator est une couche d'intelligence artificielle qui se situe entre les demandes utilisateurs et le modèle de génération d'images (Nano Banana / Gemini 3 Pro Image Preview).

## Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌────────────────┐
│   Utilisateur│  -->  │  Orchestrateur   │  -->  │  Nano Banana   │
│   (Prompt)   │       │  (Lovable AI)    │       │  (Génération)  │
└─────────────┘       └──────────────────┘       └────────────────┘
                              │
                              ├── Validation métier DICA
                              ├── Vérification décors
                              └── Structuration JSON
```

## Workflow détaillé

### 1. Réception de la demande

L'orchestrateur reçoit:
- `userPrompt`: Le texte brut de l'utilisateur
- `decorContext`: Le catalogue complet des décors DICA actifs
- `sourceImages`: Les images de référence uploadées (optionnel)
- `imageLabels`: Les labels pour chaque image source
- `projectContext`: Contexte du projet (type, secteur, etc.)

### 2. Analyse et validation

L'orchestrateur (via Lovable AI GPT model) effectue:
- ✅ Identification du type d'espace demandé (van, cuisine, ascenseur, etc.)
- ✅ Extraction des décors DICA mentionnés ou appropriés
- ✅ Vérification que les décors existent dans le catalogue
- ✅ Validation de la cohérence métier (secteur, usage, contraintes)
- ✅ Détection des informations manquantes ou ambiguës

### 3. Statuts de sortie

#### ✅ Status: "ok"
La demande est claire, validée et prête pour la génération.

Contient:
- `projectType`: Type d'espace identifié
- `decorReferences`: Codes de référence DICA à utiliser
- `decorLabels`: Noms lisibles des décors
- `nbVariants`: Nombre de variantes à générer (1-4)
- `finalPromptForImageModel`: Prompt propre et structuré en anglais pour Nano Banana
- `technicalConstraints`: Contraintes techniques identifiées

Exemple de prompt généré:
```
Professional interior visualization of a modern van conversion 
with DICA decorative panels. The space features DICA Metal panels 
(ref: 3040_BN_PF - brushed stainless steel) on interior walls and 
cabinet fronts, creating a sleek contemporary aesthetic. Soft 
natural daylight from side windows, cozy compact layout with bench 
seating and storage. Photorealistic rendering, high-end catalog 
quality, sharp details on panel textures.
```

#### ⚠️ Status: "need_clarification"
La demande est ambiguë ou manque d'informations.

Contient:
- `clarificationQuestions`: Liste de 1-3 questions précises à poser

Exemple:
```json
{
  "status": "need_clarification",
  "clarificationQuestions": [
    "Quel type de van souhaitez-vous aménager ? (VW Combi, fourgon moderne, camping-car ?)",
    "Quelle ambiance recherchez-vous ? (Moderne minimaliste, chaleureux bois, industriel métal ?)"
  ]
}
```

#### ❌ Status: "reject"
La demande est impossible, hors gamme, ou invalide.

Contient:
- `rejectionReason`: Explication claire du rejet

Exemple:
```json
{
  "status": "reject",
  "rejectionReason": "Les décors mentionnés ('Bleu roi brillant', 'Or massif') ne font pas partie du catalogue DICA. Veuillez choisir parmi les décors disponibles: Metal, Unis, Bois, Marbre, ou Déco."
}
```

## Règles de validation métier

### 1. Décors autorisés uniquement
- ✅ Utiliser UNIQUEMENT les décors du catalogue DICA fourni
- ❌ JAMAIS inventer de couleurs, textures ou références
- ✅ Vérifier que les références existent dans le catalogue

### 2. Type d'espace obligatoire
- ✅ Identifier clairement: van, cuisine, ascenseur, terrasse, bureau, salon, sdb, etc.
- ⚠️ Si ambigu ou flou → `need_clarification`
- ❌ Si impossible/hors gamme → `reject`

### 3. Cohérence métier
- Metal → Ascenseurs, vans, cuisines modernes
- Bois → Ambiances chaleureuses (vans, bureaux, salons)
- Marbre → Espaces premium (sdb, cuisines, halls)
- Unis → Minimalisme moderne (tous espaces)

### 4. Contraintes techniques
- Secteur santé/écoles → résistance au feu requise
- Ascenseurs → robustesse et entretien facile
- Extérieur/terrasse → résistance intempéries

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
→ Doit retourner status="ok"
```

#### 2. Prompts ambigus
```
"Je veux quelque chose de joli"
→ Doit retourner status="need_clarification"
```

#### 3. Prompts invalides
```
"Utilise du marbre rose pailleté et de l'or massif"
→ Doit retourner status="reject"
```

#### 4. Prompts agressifs
```
"Crée-moi n'importe quoi, tu choisis"
→ Doit demander clarification sur le type d'espace et les décors
```

#### 5. Validation décors
```
"Applique le décor XYZ123 qui n'existe pas"
→ Doit rejeter ou demander un décor valide
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
- ✅ Conformité métier stricte
- ✅ Utilisation exclusive des décors DICA
- ✅ Prompts structurés et validés
- ✅ Qualité d'image supérieure
- ✅ Expérience utilisateur améliorée

C'est un garde-fou intelligent qui protège la qualité des générations tout en guidant les utilisateurs vers les meilleures visualisations possibles.
