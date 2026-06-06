# Dette de suivi post-merge — Intégration des 4 mois d'évolution de `main` (Option B)

| Champ | Valeur |
|---|---|
| Date | 2026-06-06 |
| Contexte | Merge `origin/main` → `audit/tier1-2026-05-07` (Option B : intégration de main dans la branche d'audit, puis fast-forward de `main`) |
| Branche | `audit/tier1-2026-05-07` |
| Base commune | `bc706d2` (2026-02-14) |
| Divergence | `main` = 244 commits applicatifs (4 mois) ; `audit/tier1` = 18 commits qualité (LOT 0 → 5) construits sur le snapshot de février |
| Décision | Option B « warn + ratchet » : préserver l'applicatif récent de `main`, garder build/tests/types VERTS, conserver les apports qualité qui portent proprement, **DIFFÉRER** les refactors qui conflictent |
| Auteur | KOREV AI |

> Ce document recense la **dette de suivi** créée par le merge Option B : les
> refactors qualité (LOT 1 → 4) qui ont été **différés** parce que `main` a fait
> évoluer les fichiers cibles pendant 4 mois, et la dette ESLint **réintroduite**
> par ce code récent (rétrogradée temporairement en `warn`, à re-cliqueter vers
> `error`). Il sert de feuille de route à la **vague de suivi** (re-refactor sur
> le `main` actuel).

---

## 1. Contexte de divergence

La branche `audit/tier1-2026-05-07` portait le plan qualité LOT 0 → 5, élaboré sur
le **snapshot du 14 février 2026** (`bc706d2`). Pendant ce temps, `main` a reçu
**244 commits applicatifs** (nouvelles fonctionnalités, sécurité, migrations,
buckets privés / URLs signées, OAuth, animations `framer-motion`, etc.).

Au merge, ~16 conflits sont apparus. Pour chaque fichier **lourdement divergé**,
ré-appliquer proprement et SÛREMENT le pattern qualité (LOT 1 sémantique, LOT 2
no-any, LOT 3 a11y, LOT 4 complexité/extraction) par-dessus la version évoluée de
`main` n'était **ni trivial ni sans risque**. Conformément à la philosophie de
résolution (priorité : 1. préserver l'applicatif récent de `main` ; 2. garder le
build/tests/types VERTS ; 3. conserver la qualité qui porte proprement ;
4. différer les refactors qui conflictent), ces fichiers ont conservé la
**version de `main`** et leur refactor a été **différé**.

---

## 2. Refactors différés — à refaire sur le `main` actuel

Pour chacun, la version retenue est celle de `main` ; le travail qualité est à
**re-réaliser** sur cette base évoluée (et non plus sur le snapshot de février).

### 2.1 Pages (LOT 3 a11y + LOT 4 complexité/extraction)

| Fichier | Refactor différé | Dette associée |
|---|---|---|
| `src/pages/Auth.tsx` | Extraction sous-composants (`auth/*`) + validation (`lib/auth-validation.ts`) + complexité | warnings `cognitive-complexity` |
| `src/pages/Creative.tsx` | Extraction `creative/*` + `lib/creative-chat.ts` / `creative-storage.ts` + complexité (36 → ≤ 15) | 2 a11y (`label-has-associated-control`) + `cognitive-complexity` |
| `src/pages/ProjectDetail.tsx` | Extraction `project-detail/*` (10 fichiers) + complexité (16 → 6) + S2004 | 2 a11y + ~12 `no-explicit-any` + `cognitive-complexity` / `no-nested-functions` |
| `src/pages/Dashboard.tsx` | a11y de la carte projet + no-any (la version de `main` utilise `framer-motion`, à préserver) | 5 `no-explicit-any` + 3 a11y (`no-static-element-interactions`, `no-autofocus`, `no-noninteractive-element-interactions`) |

### 2.2 Services (LOT 2 no-any + LOT 4)

| Fichier | Refactor différé | Dette associée |
|---|---|---|
| `src/services/analytics.service.ts` | no-any (`unknown` / types) + `readonly` | 8 `no-explicit-any` |
| `src/services/reseller-brochure-pdf.service.ts` | no-any + complexité (la version de `main` intègre `signStorageUrl` — buckets privés, à préserver) | 2 `no-explicit-any` + `cognitive-complexity` |

### 2.3 Composant UI

| Fichier | Refactor différé | Dette associée |
|---|---|---|
| `src/components/ui/presentation-viewer.tsx` | a11y (`role="region"` + helper `revealUI`) — la version de `main` utilise `setShowUI` / `role="button"` | — (pas d'erreur résiduelle ; divergence d'implémentation) |

### 2.4 Fonctions edge Supabase — ré-application SSRF / logger

Les utilitaires partagés `supabase/functions/_shared/ssrf-guard.ts` et
`_shared/logger.ts` **ont survécu** au merge (toujours utilisés par
`generate-magazine-captions/index.ts`). Leur **ré-application** dans les fonctions
ci-dessous (anti-SSRF sur les `fetch` sortants + `logInfo`/`logDebug` conditionnels
en remplacement des `console.log`) est **à refaire** sur la version récente de
`main` :

| Fichier | À ré-appliquer | Dette associée |
|---|---|---|
| `supabase/functions/apply-decor/index.ts` | SSRF guard + logger | 4 `no-explicit-any` + `cognitive-complexity` |
| `supabase/functions/creative-chat/index.ts` | SSRF guard + logger | 8 `no-explicit-any` + `cognitive-complexity` |
| `supabase/functions/creative-chat/orchestrator.ts` | logger | 1 `no-explicit-any` + `cognitive-complexity` |
| `supabase/functions/get-analytics/index.ts` | logger + typage des lignes Supabase | 5 `no-explicit-any` + `cognitive-complexity` |

---

## 3. Artefacts d'extraction RETIRÉS (à régénérer au re-refacto)

Comme les pages refactorées (Auth/Creative/ProjectDetail) ont repris la version de
`main`, leurs sous-composants et helpers d'extraction sont devenus **orphelins**
(plus aucun import) et auraient cassé la compilation/les tests. Ils ont donc été
**retirés** du merge pour garder l'ensemble cohérent et vert. À **régénérer** lors
du re-refacto sur le `main` actuel :

- `src/components/auth/` : `AuthSubmitButton.tsx`, `LoginForm.tsx`, `PasswordField.tsx`, `PasswordRecoveryForm.tsx`, `SignupForm.tsx`
- `src/lib/auth-validation.ts`
- `src/components/creative/` : `CreativeMessage.tsx`, `FavoriteCard.tsx`, `types.ts`
- `src/lib/creative-chat.ts`, `src/lib/creative-storage.ts`
- `src/components/project-detail/` : `ComparisonDialog.tsx`, `CreativeImportsSection.tsx`, `EmptyPhotosState.tsx`, `PhotoCard.tsx`, `PhotoUploadButton.tsx`, `ProjectDetailHeader.tsx`, `RenderCard.tsx`, `ZoomDialog.tsx`, `project-detail.helpers.ts`, `project-detail.types.ts`
- Tests des shells refactorés : `src/pages/__tests__/Creative.test.tsx`, `src/pages/__tests__/ProjectDetail.test.tsx`

> Le helper mutualisé `src/lib/utils.ts::onActivateKeyDown` (LOT 3) **a survécu** :
> il reste utilisé par `catalog-management.tsx` et `favorites-gallery.tsx` (a11y
> réconciliée au merge).

---

## 4. Dette ESLint réintroduite — politique « warn » + ratchet

Sur le snapshot de février, la branche d'audit était à **0 erreur ESLint**
(LOT 2 = 0 `no-explicit-any`, LOT 3 = 0 issue a11y). Le code récent de `main` a
**réintroduit** ces violations dans les fichiers différés ci-dessus. Pour rester
fidèle à la philosophie déjà documentée « **mesurer sans casser avant refacto** »
(appliquée à SonarJS dès le LOT 4), les règles correspondantes ont été
**rétrogradées en `warn`** dans `eslint.config.js` (surcharge explicite,
commentée) :

| Règle rétrogradée en `warn` | Occurrences (warnings) | Origine | Objectif |
|---|---|---|---|
| `@typescript-eslint/no-explicit-any` | 46 | LOT 2 réintroduit par `main` | Re-typer (`unknown` / types métier) puis RE-PASSER en `error` |
| `jsx-a11y/label-has-associated-control` | 4 | LOT 3 (Creative, ProjectDetail) | Associer label/contrôle puis RE-PASSER en `error` |
| `jsx-a11y/no-static-element-interactions` | 1 | LOT 3 (Dashboard) | a11y carte projet puis RE-PASSER en `error` |
| `jsx-a11y/no-noninteractive-element-interactions` | 1 | LOT 3 (Dashboard) | idem |
| `jsx-a11y/no-autofocus` | 1 | LOT 3 (Dashboard, édition inline) | `eslint-disable` justifié ou suppression puis RE-PASSER en `error` |

> **Note** : l'estimation initiale tablait sur « 3 règles a11y » ; la mesure réelle
> (`npx eslint .`) en identifie **4** (`label-has-associated-control`,
> `no-static-element-interactions`, `no-noninteractive-element-interactions`,
> `no-autofocus`). Les **autres** règles `jsx-a11y` restent en **erreur** (non
> touchées). `click-events-have-key-events` n'était finalement pas en cause.

### Corrections triviales appliquées au merge (vraies corrections, sans désactivation)

| Fichier:ligne | Règle | Correction |
|---|---|---|
| `src/components/onboarding/useOnboarding.ts:85` | `no-unused-expressions` | Suppression de l'expression morte `state.lastSeenVersion !== CURRENT_VERSION;` (résultat jamais consommé — suppression conservatrice, sans effet de bord) |
| `src/services/presentation.service.ts:250` | `no-unused-expressions` | Suppression du ternaire mort `clampedIndex > this.currentIndex ? 'next' : 'previous';` (résultat jamais consommé) |
| `supabase/functions/apply-decor/index.ts:422` | `prefer-const` | `let decorsInfo` → `const decorsInfo` (jamais réassigné) |
| `supabase/functions/apply-decor/index.ts:729-730` | `no-case-declarations` | `case "terrasse"` entouré d'accolades `{ … }` |
| `supabase/functions/get-analytics/index.ts:80` | `prefer-const` | `let startDate` → `const startDate` (jamais réassigné) |

---

## 5. Ratchet CI

- **Plafond ESLint** (`/.github/workflows/quality-gate.yml`, `ESLINT_MAX_WARNINGS`) :
  relevé de **22 → 85** (mesure réelle post-merge : `npx eslint .` = **0 erreur,
  85 warnings**).
- **Composition des 85 warnings** : 46 `no-explicit-any` + 7 `jsx-a11y` (dette
  rétrogradée) + 18 `sonarjs/cognitive-complexity` + 8 `sonarjs/no-nested-functions`
  + 5 `react-refresh/only-export-components` + 1 `react-hooks/exhaustive-deps`.
- **Stratégie de descente** : à chaque foyer résorbé (re-typage des `any`,
  re-refacto des pages/services différés, ré-application SSRF/logger), abaisser le
  plafond (**85 → … → 22 → … → 0**) et **re-passer les règles `warn` en `error`**.
  Le gate échoue dès toute HAUSSE au-delà du plafond (anti-régression).

---

© DICA France — base logicielle KOREV AI
