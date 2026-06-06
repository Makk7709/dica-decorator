# Baseline qualité avant LOT 0 — 2026-06-06

| Champ | Valeur |
|---|---|
| Date | 2026-06-06 |
| Version produit | 2.2.0 (cf. `package.json`) |
| Branche d'analyse | `audit/tier1-2026-05-07` (commit `f289c9a`) |
| Lot associé | LOT 0 — Configuration SonarQube / SonarLint |
| ADR de référence | `docs/adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md` |
| Auteur | KOREV AI |

> Cette baseline fige l'état qualité **avant** la mise en place de la configuration SonarQube et **avant** l'exécution des LOTs 1 à 5 du plan de correction (cf. discussion technique du 2026-06-06). Elle servira de point de comparaison pour mesurer le progrès à chaque livraison.

---

## 1. Méthodologie

Trois sources combinées :

1. **Bilan SonarLint IDE** fourni par le mainteneur le 2026-06-06 (extension SonarLint dans Cursor / VSCode). Cf. § 2.
2. **Sortie `npm run lint`** capturée dans [`lint.txt`](./lint.txt) — règles `@typescript-eslint`, `react-hooks`, `react-refresh` activées par `eslint.config.js`.
3. **Sortie `npm run test:run`** capturée dans [`test.txt`](./test.txt) — Vitest + happy-dom, 28 fichiers de test.

Le scan SonarQube réel sur serveur n'est **pas** disponible (absence de serveur Sonar configuré). Les chiffres SonarLint sont donc déclaratifs (issus de l'IDE), non opposables tant que le LOT 5 n'aura pas branché un quality gate Sonar côté CI.

Les commandes utilisées sont reproductibles localement :

```bash
npm run lint > lint.txt 2>&1
npm run test:run > test.txt 2>&1
```

---

## 2. Bilan SonarLint IDE (déclaratif, fourni par le mainteneur)

Volumétrie totale annoncée : **environ 205 issues SonarLint** réparties en quatre familles.

| Famille | Volume annoncé | Règles concernées | Commentaire d'audit |
|---|---|---|---|
| Refactos lourds | ~75 | `S3776` complexité cognitive, `S2004` nesting > 4, `S3358` ternaires imbriqués | Confirmé. Voir § 4.1 pour les fichiers concernés. |
| Composants shadcn/ui | ~50 | Multiples (a11y, props, ternaires, contexts) | **Sortis du périmètre par ADR-0001** (LOT 0). |
| A11y JSX réels | ~30 | `S6848`, `S6853`, `S6847`, `S6479` | Cas par cas dans les pages, à traiter LOT 3. |
| Patterns sémantiques | ~50 | `S6759` props readonly, `S107` trop de paramètres, `S6481` Context memo | Volume effectif plus faible : 22 interfaces Props sans readonly + 1 Context non mémoïsé (`ThemeContext.tsx`) + quelques fonctions PDF. |

Cf. discussion technique du 2026-06-06 pour le détail de la calibration et le plan de correction.

---

## 3. Mesure ESLint actuelle (reproductible)

Commande : `npm run lint`. Snapshot complet : [`lint.txt`](./lint.txt).

| Indicateur | Valeur |
|---|---|
| Total problèmes | **161** |
| Erreurs | **148** |
| Warnings | **13** (tous `react-refresh/only-export-components`) |

### 3.1 Distribution des 148 erreurs `@typescript-eslint/no-explicit-any`

Snapshot par fichier dans [`lint-any-by-file.txt`](./lint-any-by-file.txt). Top 10 :

| Erreurs | Fichier |
|---:|---|
| 18 | `src/services/__tests__/admin-project-viewer.service.test.ts` |
| 13 | `src/services/__tests__/presentation.service.test.ts` |
| 13 | `src/services/__tests__/image-comparison.service.test.ts` |
| 12 | `src/services/__tests__/reseller-brochure-personalization.test.ts` |
| 12 | `src/pages/ProjectDetail.tsx` |
| 9 | `src/services/admin-project-viewer.service.ts` |
| 8 | `src/services/analytics.service.ts` |
| 7 | `src/services/__tests__/favorites.service.test.ts` |
| 5 | `src/pages/Dashboard.tsx` |
| 4 | `src/services/project-deletion.service.ts` |

**34 fichiers uniques** concernés par la dette `any`.

### 3.2 Répartition par sous-périmètre

| Sous-périmètre | Erreurs | Stratégie LOT 2 |
|---|---:|---|
| Tests services (mocks Supabase) | ~70 | Helper `createMockSupabaseClient()` typé dans `src/test/test-utils.tsx`. |
| Services production | ~30 | Typage strict via `Database['public']['Tables']`. |
| Pages | ~30 | `error: any` → `error: unknown` + narrow via `instanceof`. |
| Tests divers | ~18 | Cas par cas. |

---

## 4. Mesure tests Vitest (reproductible)

Commande : `npm run test:run`. Snapshot complet : [`test.txt`](./test.txt).

| Indicateur | Valeur |
|---|---|
| Test Files | **28 passed (28)** |
| Tests | **842 passed (842)** |
| Durée | ~3,22 s |
| Échecs | 0 |

> Note : la trajectoire qualité reste stable. Au 2026-05-31 le projet était à **27 / 825**. En 6 jours, +1 fichier de test, +17 cas de test ajoutés sans régression, ce qui confirme la pratique TDD active.

---

## 5. Référentiel des fichiers du périmètre

Recensement automatique au 2026-06-06.

### 5.1 Pages (`src/pages/`)

| Fichier | Lignes | Statut périmètre Sonar |
|---|---:|---|
| `ProjectDetail.tsx` | 1362 | **Audité** — gros composant, cible LOT 4 |
| `Creative.tsx` | 1356 | **Audité** — complexité cognitive ~36 (cible LOT 4) |
| `Admin.tsx` | 1185 | **Audité** — gros composant, cible LOT 4 |
| `Dashboard.tsx` | 570 | **Audité** — cible LOT 4 |
| `Auth.tsx` | 420 | **Audité** — complexité cognitive ~21 (cible LOT 4) |
| `Index.tsx` | 72 | Audité |

### 5.2 `src/components/ui/` — distinction shadcn pur vs custom

**Exclus du scope Sonar par ADR-0001** (49 fichiers — 48 `.tsx` + le hook `use-toast.ts`) :

`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`, `use-toast`.

**Conservés dans le scope** (10 fichiers custom KOREV AI) :

`app-footer`, `before-after-slider`, `image-export-dropdown`, `magazine-deco-export-button`, `premium-layout`, `presentation-viewer`, `reseller-brochure-export-button`, `safe-image`, `share-link-dialog`, `theme-toggle`.

### 5.3 Contextes React audités (`src/contexts/`)

| Fichier | `value` mémoïsée ? | S6481 |
|---|---|---|
| `AuthContext.tsx` | Oui (`useMemo` lignes 109-119) | Conforme |
| `ThemeContext.tsx` | Non (objet inline ligne 92) | **Non conforme — cible LOT 1** |

### 5.4 Services prod (`src/services/`) — fichiers les plus longs

| Fichier | Lignes | Périmètre LOTs |
|---|---:|---|
| `magazine-deco-pdf.service.ts` | 1089 | LOT 2 (3 erreurs `any`), LOT 1 (S107 à vérifier) |
| `reseller-brochure-pdf.service.ts` | 1071 | LOT 2 (2 erreurs `any`), LOT 1 (S107 à vérifier) |
| `image-comparison.service.ts` | 756 | LOT 2 (2 erreurs `any`) |
| `share-link.service.ts` | 561 | LOT 2 (2 erreurs `any`) |
| `presentation.service.ts` | 531 | — |
| `analytics.service.ts` | 512 | LOT 2 (8 erreurs `any`) |

---

## 6. Métriques cibles à l'issue du plan

Issues du plan de correction du 2026-06-06.

| Métrique | Baseline 2026-06-06 | Cible Sprint 1 (LOT 0+1+2) | Cible Sprint 2 (LOT 3) | Cible Sprint 3 (LOT 4) | Cible Clôture (LOT 5) |
|---|---:|---:|---:|---:|---:|
| Erreurs ESLint | 148 | 0 | 0 | 0 | 0 |
| Warnings ESLint | 13 | ≤ 13 | ≤ 13 | ≤ 13 | ≤ 13 |
| Test Files Vitest | 28 | ≥ 28 | ≥ 28 | ≥ 36 (+ E2E) | ≥ 36 |
| Tests Vitest | 842 | ≥ 842 | ≥ 842 | ≥ 850 (+ E2E) | ≥ 850 |
| Issues SonarLint S6481 | 1 | 0 | 0 | 0 | 0 |
| Issues SonarLint S6759 | ~22 | 0 | 0 | 0 | 0 |
| Issues SonarLint S3358 | ~7 | 0 | 0 | 0 | 0 |
| Issues SonarLint a11y | ~30 | ~30 | 0 | 0 | 0 |
| Issues SonarLint S3776 (complexité) | 5 fichiers | 5 | 5 | 0 | 0 |
| Quality gate CI branché (garde-fou opposable) | Non | Non | Non | Non | **Oui (LOT 5) ✅** |
| Scan Sonar optionnel câblé en CI | Non | Non | Non | Non | **Oui (LOT 5) ✅** |

> **Clôture LOT 5 (2026-06-06).** Le quality gate CI est désormais branché via
> `.github/workflows/quality-gate.yml`. Job `guard` (auto-suffisant, sans serveur
> Sonar ni secret) : `npm ci` → `npx eslint . --max-warnings 22` → `npx tsc --noEmit`
> → `npm run test:run` → `npm run build`, déclenché sur `pull_request` et `push`
> (`main`, `develop`, `audit/tier1-2026-05-07`). Le seuil retenu pour le mécanisme
> anti-régression est **`--max-warnings 22`** (= warnings courants mesurés ; le gate
> échoue dès le 23e), avec stratégie « ratchet » (abaisser le seuil à chaque foyer
> résorbé). Un job `sonar` OPTIONNEL réutilise `sonar-project.properties` et ne
> s'exécute que si le secret `SONAR_TOKEN` est présent. Le job E2E (`e2e.yml`) est
> passé d'un déclenchement manuel à un déclenchement automatique. Détail complet :
> [`lot5-report.md`](./lot5-report.md).

---

## 7. Commandes de reproduction

```bash
# Reproduire la baseline lint
npm run lint > lint.txt 2>&1

# Reproduire la baseline tests
npm run test:run > test.txt 2>&1

# Distribution any par fichier (le plus fréquent en tête)
awk '/^\/.+\.(ts|tsx)$/ {f=$0; gsub(/.*\/dica-decorator\//, "", f)} /Unexpected any/ {print f}' lint.txt \
  | sort | uniq -c | sort -rn

# (Plus tard, après LOT 5) Scan Sonar local complet
sonar-scanner -Dsonar.login=$SONAR_TOKEN -Dsonar.host.url=$SONAR_URL
```

---

## 8. Références croisées

- ADR : [`docs/adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md`](../../adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md)
- Configuration : [`sonar-project.properties`](../../../sonar-project.properties) (à la racine)
- Rapport qualité courant : [`docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`](../../RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md)
- Plan de correction décote : [`docs/PLAN_CORRECTION_RISQUES_DECOTE.md`](../../PLAN_CORRECTION_RISQUES_DECOTE.md)
- Suivi d'exécution : [`docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md`](../../RAPPORT_EXECUTION_PLAN_CORRECTION.md)
- Rapport qualité historique (déc 2025, 784 tests / 25 suites) : [`docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md`](../../archive/historical/AUDIT_TECHNIQUE_2025-12.md)

---

© DICA France — base logicielle KOREV AI. Baseline interne, reproductible.
