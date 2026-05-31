> ⚠️ **DOCUMENT ARCHIVÉ**
> **Statut :** Historique à conserver (plan exécuté)
> **Date d'archivage :** 2026-05-31
> **Raison :** Plan d'action TDD daté de décembre 2025, dont toutes les cases de validation sont marquées « OK » dans le document lui-même. Le plan a été exécuté ; il n'a plus vocation opérationnelle. Conservé pour la traçabilité de la conception (preuve d'application de la démarche TDD sur la personnalisation revendeur).
> **Remplacé par :** code `src/services/reseller-brochure-pdf.service.ts` et tests `src/services/__tests__/reseller-brochure-personalization.test.ts`.
> **Ne pas utiliser comme référence opérationnelle active.**

---

# Plan d'Action TDD - Correction Personnalisation Plaquette Revendeur

## 🎯 Objectif
Assurer que la plaquette PDF revendeur soit **entièrement personnalisée** avec les informations revendeur, remplaçant **tous** les éléments "DICA" par les données du revendeur.

## 🔍 Problèmes identifiés

### 1. Page de couverture
- ✅ **OK** : Titre principal utilise `getCoverTitle()` → Nom revendeur
- ✅ **OK** : Bloc infos revendeur en bas
- ✅ **OK** : Nom client personnalisé

### 2. Pages intérieures
- ✅ **OK** : En-tête utilise `getCoverTitle()` → Nom revendeur
- ✅ **OK** : Footer "Présenté par" utilise nom revendeur
- ⚠️ **À CORRIGER** : Footer website utilise toujours "www.dica-france.com" au lieu du site revendeur

### 3. Page de fin (renderClosingPage)
- ❌ **CRITIQUE** : Ne reçoit pas le branding en paramètre
- ❌ **CRITIQUE** : Utilise toujours "DICA France" et coordonnées DICA
- ❌ **CRITIQUE** : Texte "Dica France inscrit..." devrait être adapté ou retiré
- ❌ **CRITIQUE** : Coordonnées DICA codées en dur (lignes 967-976)

## 📋 Plan d'Action TDD Strict

### Phase 1 : Tests TDD (SANS simplification)
1. ✅ Créer `reseller-brochure-personalization.test.ts`
2. Tests pour vérifier :
   - `getCoverTitle()` retourne nom revendeur quand `enabled=true`
   - Page de fin utilise coordonnées revendeur
   - Footer pages intérieures utilise site revendeur
   - Tous les textes "DICA" remplacés

### Phase 2 : Corrections Code
1. Modifier `renderClosingPage()` pour accepter `branding` en paramètre
2. Remplacer "DICA France" par nom revendeur dans page de fin
3. Remplacer coordonnées DICA par coordonnées revendeur
4. Adapter le texte d'engagement (ou le retirer si revendeur)
5. Corriger footer pages intérieures pour utiliser site revendeur

### Phase 3 : Validation
1. Tous les tests passent
2. Build sans erreurs
3. Vérification manuelle de la personnalisation complète

## 🧪 Tests à créer

```typescript
describe('ResellerBrochurePdfService - Personalization', () => {
  // Test 1: getCoverTitle avec branding enabled
  // Test 2: getCoverTitle sans branding
  // Test 3: renderClosingPage avec branding → utilise coordonnées revendeur
  // Test 4: renderClosingPage sans branding → utilise coordonnées DICA
  // Test 5: Footer pages intérieures avec branding → site revendeur
  // Test 6: Footer pages intérieures sans branding → site DICA
  // Test 7: Page de fin complète avec toutes infos revendeur
});
```

## 🔧 Corrections à implémenter

### Correction 1 : Signature renderClosingPage
```typescript
// AVANT
private async renderClosingPage(pdf: jsPDF, pageWidth: number, pageHeight: number)

// APRÈS
private async renderClosingPage(
  pdf: jsPDF, 
  pageWidth: number, 
  pageHeight: number,
  branding?: ResellerBranding | null
)
```

### Correction 2 : Bloc contact page de fin
```typescript
// AVANT (lignes 949-976)
pdf.text('DICA', marginX, currentY);
pdf.text('France', marginX + 32, currentY);
pdf.text("13, rue Marcel Chabloz", marginX, currentY);
// ... coordonnées DICA

// APRÈS
if (branding?.enabled && branding?.companyName) {
  // Utiliser coordonnées revendeur
  pdf.text(branding.companyName, marginX, currentY);
  // Adresse revendeur
  // Téléphone revendeur
  // Email revendeur
  // Site revendeur
} else {
  // Coordonnées DICA par défaut
}
```

### Correction 3 : Footer pages intérieures
```typescript
// AVANT (ligne 735)
const footerText = branding?.enabled && branding?.website
  ? `Visuels non contractuels • ${branding.website}`
  : "Visuels non contractuels • www.dica-france.com";

// APRÈS (déjà OK mais vérifier)
```

### Correction 4 : Texte engagement page de fin
```typescript
// Si revendeur, adapter ou retirer le texte "Dica France inscrit..."
// Car c'est spécifique à DICA, pas au revendeur
```

## ✅ Critères de succès

1. ✅ Tous les tests TDD passent (sans simplification)
2. ✅ Page de couverture : Nom revendeur en titre principal
3. ✅ Pages intérieures : En-tête et footer personnalisés
4. ✅ Page de fin : Coordonnées revendeur complètes
5. ✅ Aucune mention "DICA" visible quand branding actif
6. ✅ Build sans erreurs
7. ✅ Documentation à jour

