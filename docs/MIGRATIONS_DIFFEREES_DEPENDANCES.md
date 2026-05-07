# Migrations différées — Sécurité dépendances

**Référence** : DICA-DEC-MIGRATIONS-DIFF-2026
**Date** : 06/05/2026
**Émetteur** : KOREV AI
**Périmètre** : Migrations dépendances majeures non appliquées en session de correction (mai 2026), différées pour exécution en environnement staging dédié.

---

## 1. Contexte

À l'issue de la phase 1 du plan de correction, **3 vulnérabilités** persistent dans l'arbre de dépendances. Toutes nécessitent un saut de version majeur (breaking change). Conformément au plan de correction et à la grille kill-switch, ces migrations sont **différées et planifiées** pour exécution dans un environnement staging dédié, jamais directement en production.

| Vulnérabilité | Sévérité | Package | Version actuelle | Version cible | Type |
|---------------|----------|---------|------------------|---------------|------|
| jsPDF v3 — 10 advisories cumulés | Critique | `jspdf` | `^3.0.4` | `^4.2.1` | Breaking (major) |
| esbuild dev-server | Modérée | `esbuild` (transitif via `vite`) | `0.24.x` | `≥0.25.x` | Via Vite 6 |
| Vite < 7 | Modérée | `vite` | `^5.4.19` | `^6.4.2` | Breaking (major) |

**Aucune** de ces vulnérabilités n'expose la production en l'état :
- `jspdf` : usage côté **frontend uniquement**, déclenché par action utilisateur authentifié, pas d'input non-trusted (PDF générés à partir des projets de l'utilisateur connecté).
- `esbuild` : vulnérabilité du **dev-server local** (CORS) — sans impact en production (build statique).
- `vite` : transitive via `esbuild`.

**Évaluation du risque résiduel** : faible à modéré. Justifie un report en staging avec validation visuelle exhaustive.

---

## 2. Migration 1 — `jspdf` 3 → 4

### 2.1 Périmètre d'impact

| Composant | Fichier | Type d'usage |
|-----------|---------|--------------|
| Génération brochure revendeur | `src/services/dealer-brochure-pdf.service.ts` | Création PDF multi-pages avec html2canvas |
| Génération magazine déco | `src/services/magazine-pdf.service.ts` | Layout éditorial pleine page, captions, typographie |
| Hooks PDF | `src/hooks/use-pdf-export.ts` | Orchestration côté UI |
| Tests | 2 fichiers — couverture 77,36 % lines / 76,19 % functions | À re-valider après migration |

### 2.2 Breaking changes connus (jspdf v4)

D'après le [changelog officiel jspdf](https://github.com/parallax/jsPDF/releases) :

1. **API `addImage`** : signature simplifiée, suppression d'options dépréciées
2. **AcroForm** : refactor complet (RadioButton, FreeText) — corrige les XSS
3. **Type definitions** : suppression de plusieurs `any` — peut imposer des annotations explicites côté appelant
4. **Build target** : Node ≥ 16 requis (✓ aligné avec engines `≥20`)
5. **CommonJS exports retirés** — il faut import ESM uniquement

### 2.3 Plan d'exécution staging

```bash
# 1. Branche dédiée
git checkout -b chore/jspdf-v4-migration

# 2. Bump
npm install jspdf@^4.2.1 --save

# 3. TypeScript strict — récupérer toutes les erreurs en bloc
npm run build 2>&1 | tee audit/phase-1/jspdf-build.txt

# 4. Réparer les erreurs au fur et à mesure :
#    - signatures addImage (probablement majoritaire)
#    - exports vs imports
#    - éventuels `any` à typer

# 5. Re-tests (focus PDF)
npx vitest run src/services/dealer-brochure-pdf.service.test.ts
npx vitest run src/services/magazine-pdf.service.test.ts

# 6. Génération visuelle staging :
#    - 1 brochure revendeur réelle (logo + 12 décors)
#    - 1 magazine décor (4 pages, captions IA)
#    - Comparer pixel à pixel avec un baseline de référence

# 7. Smoke checklist S-EXP-2 et S-EXP-3 (cf. CHECKLIST_SMOKE_KILLSWITCH.md)
```

### 2.4 Critères de succès / signal d'arrêt

| Critère | Seuil GO | Signal d'arrêt |
|---------|----------|----------------|
| Tests PDF | ≥ 95 % conservés | > 10 tests cassés |
| Build size | ≤ 110 % baseline 387 kB | > 110 % |
| Rendu visuel | équivalent ou amélioré | différences perceptibles non corrigeables |
| Couverture | ≥ 75 % lines | < 70 % |

**Si signal d'arrêt** : kill-switch — rester en `jspdf@^3.0.x` et tracer les CVE à monitorer.

### 2.5 Estimation

- **Effort** : 1,5 j/h (dev senior front)
- **Risque** : modéré
- **Dépendance** : staging Supabase + comptes utilisateurs de test peuplés

---

## 3. Migration 2 — `vite` 5 → 6 (+ `vitest` 3 → 4 et `esbuild`)

### 3.1 Pourquoi groupé

Vite 5 → 6 entraîne mécaniquement le bump esbuild (résolution CVE) et requiert un Vitest compatible. Le saut Vitest 3 → 4 est donc induit.

### 3.2 Breaking changes consolidés

#### Vite 6
- **CJS deprecated** définitivement (✓ projet déjà ESM via `"type": "module"`)
- **Build target** : `baseline-widely-available` par défaut (peut nécessiter `target: 'es2020'` explicite)
- **Plugin API** : signature `transform` modifiée
- **HMR** : nouveau protocole — les plugins custom peuvent casser

#### Vitest 4
- **Suppression API obsolètes** : `vi.mock` paramètres réorganisés
- **Pool par défaut** : `forks` (auparavant `threads`) — peut affecter les tests qui font du shared state
- **Reporter** : sortie modifiée (impact CI parsing)
- **Coverage v8** : nouvelle option `experimentalAstAwareRemapping` à évaluer

### 3.3 Plan d'exécution staging

```bash
# 1. Branche dédiée
git checkout -b chore/vite-6-vitest-4-migration

# 2. Bump groupé
npm install --save-dev \
  vite@^6.4.2 \
  vitest@^4.0.14 \
  @vitest/coverage-v8@^4.0.14 \
  @vitejs/plugin-react-swc@latest

# 3. Build incrémental — viser un build clean
npm run build

# 4. Tests
npm run test:run

# 5. Si > 30 tests cassent → kill-switch
```

### 3.4 Critères de succès / signal d'arrêt

| Critère | Seuil GO | Signal d'arrêt |
|---------|----------|----------------|
| Build OK | ✓ | Échec build après 1 j/h de réparation |
| Build time | ≤ 8 s (vs 3,8 s baseline) | > 8 s |
| Tests | ≥ 800 / 811 conservés | < 780 / 811 |
| HMR dev | fonctionnel sur 5 modifications-types | HMR cassé pour > 1 type de fichier |
| Bundle top 5 | dans ±10 % | > +20 % |

### 3.5 Estimation

- **Effort** : 2 j/h (dev senior — nettoyage incremental)
- **Risque** : élevé (cascade plugins)
- **Dépendance** : staging + smoke complet (S-PERF-1, S-PERF-2)

---

## 4. Pourquoi NE PAS migrer dans cette session

### 4.1 Absence de staging

Le repository ne dispose pas (à date) d'un environnement Supabase staging dédié. Les Edge Functions sont actuellement déployées une seule fois (production). Toute migration majeure exécutée hors staging exposerait la production à un risque de régression non détectée par les tests automatiques.

> **Cf. `docs/CHECKLIST_SMOKE_KILLSWITCH.md` §1** — la smoke checklist 25 points est obligatoire après chaque migration et n'est exécutable qu'en staging.

### 4.2 Discipline de séparation des préoccupations

Mêler une migration majeure à une session de **clean-up + valorisation** introduit deux risques majeurs :

1. **Confusion d'attribution** : si un bug post-migration est découvert, on ne peut pas savoir s'il vient de la migration ou du clean-up.
2. **Bloat du diff** : une PR de plus de 800 lignes devient inreviewable. Conforme à la limite kill-switch P2.

### 4.3 Profil de risque vulnérabilités résiduelles

Les 3 vulnérabilités résiduelles ont été analysées et **n'exposent pas la production** :

| CVE/GHSA | Vecteur d'attaque | Préqv. exploitation | Impact prod |
|----------|--------------------|-----------------|-------------|
| jsPDF GHSA-* | Input PDF malicieux soumis par utilisateur | Utilisateur authentifié + payload PDF construit + interaction directe | Limité (sandbox navigateur) |
| esbuild GHSA-67mh-4wv8-2f99 | Dev-server CORS | **Aucun** en production (build statique) | Nul |
| happy-dom (résolu) | Test runtime VM escape | Compromission CI/CD | Nul (dev-only) |

**Évaluation finale** : aucun risque RCE direct production. Le report en staging est **acceptable** pendant la fenêtre de planification (≤ 30 jours).

---

## 5. Calendrier recommandé

| Étape | Quand | Owner |
|-------|-------|-------|
| Provision staging Supabase | T+0 (semaine 1) | Ops |
| Capture baseline staging | T+5 j | Dev senior |
| Migration jspdf v4 | T+10 j | Dev senior |
| Smoke S-EXP en staging | T+12 j | Dev senior + Métier |
| Décision GO production jspdf | T+13 j | Lead KOREV AI |
| Migration vite 6 + vitest 4 | T+18 j (semaine 4) | Dev senior |
| Smoke S-PERF en staging | T+20 j | Dev senior |
| Décision GO production vite | T+22 j | Lead KOREV AI |
| Snapshot final post-migration | T+25 j | Lead KOREV AI |

**Effort total estimé** : 5 j/h sur ~ 1 mois calendaire (incluant temps de cool-down entre migrations).

---

## 6. Suivi

Toute mise à jour de ce document doit s'accompagner :

1. D'un commit dans `audit/phase-1/jspdf-*` ou `audit/phase-1/vite-*` (snapshots)
2. D'une mise à jour de `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` §6 (compteur vulns)
3. D'une note dans le journal de bord opérationnel

---

**Auteur** : KOREV AI
**Approuvé pour planification staging** : oui (sous réserve provision staging)
