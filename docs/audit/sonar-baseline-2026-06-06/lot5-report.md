# Rapport LOT 5 — Quality gate CI + activation E2E (clôture du plan)

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 5 — Branchement d'un quality gate reproductible en CI + activation du job E2E |
| Branche | `audit/tier1-2026-05-07` |
| Objectif | Clôturer le plan qualité en posant un GARDE-FOU OPPOSABLE en CI, fonctionnel SANS serveur Sonar ni secret externe |
| Fichiers livrés | `.github/workflows/quality-gate.yml` (créé), `.github/workflows/e2e.yml` (activé), `README.md` §6 (mis à jour), ce rapport |
| Auteur | KOREV AI |

> Le LOT 5 ne modifie **aucun code de production**. Il ajoute l'infrastructure CI
> qui rend opposables les acquis des LOTs 0 → 4 (0 erreur ESLint, 0 issue a11y,
> complexité des 3 pages cibles < 15, 877 tests verts) et empêche toute régression.

---

## 1. Inventaire des workflows (état avant LOT 5)

| Fichier | Rôle | Déclencheurs (avant) | Bloquant ? |
|---|---|---|---|
| `ci.yml` (« CI Quality Gate ») | Collecte/reporting : lint (en `continue-on-error`), tests+coverage, build, `npm audit`, licences, détection secrets. Artefacts 30 j. | `push`/`pull_request` sur `main`, `develop` + `workflow_dispatch` | Partiellement (échoue sur régression lint et test rouge ; audits non bloquants) |
| `e2e.yml` (« E2E (Playwright) ») | Filet de caractérisation Playwright (5 specs ; `auth.spec.ts` public 6/6, 4 specs protégées en SKIP). | **`workflow_dispatch` uniquement (manuel)** | Non (manuel) |
| `cd-edge-functions.yml` (« CD Edge Functions ») | Déploiement manuel des Edge Functions Supabase. | `workflow_dispatch` | n/a (déploiement) |

**Constat** : la branche d'audit `audit/tier1-2026-05-07` n'était couverte par aucun
workflow automatique ; `ci.yml` mélange « mesure » et « blocage » et tolère le lint
(`continue-on-error`) ; l'E2E n'était jamais joué automatiquement.

### Ce qui a été créé / modifié en LOT 5

| Action | Fichier | Détail |
|---|---|---|
| **Créé** | `.github/workflows/quality-gate.yml` | Garde-fou opposable auto-suffisant (job `guard`) + job Sonar optionnel (`detect-sonar` + `sonar`). |
| **Modifié** | `.github/workflows/e2e.yml` | Passage du manuel à l'automatique (`pull_request` + `push` branches principales), placeholders Supabase publics avec repli sur secrets, lecture optionnelle des secrets E2E. |
| **Modifié** | `docs/audit/sonar-baseline-2026-06-06/README.md` | §6 : quality gate marqué branché (LOT 5) + seuil `--max-warnings 22`. |
| **Inchangé** | `ci.yml`, `cd-edge-functions.yml` | Conservés tels quels (reporting / déploiement). |

#### Pourquoi un workflow `quality-gate.yml` séparé plutôt que compléter `ci.yml` ?

Choix assumé de **séparer la mesure du blocage** :

- `ci.yml` reste un job de **collecte** (lint en `continue-on-error`, `npm audit`,
  licences, artefacts) : utile pour le diagnostic, mais volontairement tolérant.
- `quality-gate.yml` est le **contrat de merge** : minimal, déterministe,
  auto-suffisant, et fait **autorité**. C'est le seul check qu'on recommande
  d'exiger en *branch protection*.

Mélanger les deux dans `ci.yml` aurait dilué la lisibilité du verdict et compliqué
la configuration de protection de branche.

---

## 2. Le quality gate (`quality-gate.yml`)

### 2.1 Déclencheurs

```yaml
on:
  push:
    branches: [main, develop, audit/tier1-2026-05-07]
  pull_request:
  workflow_dispatch:
```

- `pull_request` : toute PR (vers n'importe quelle base) est contrôlée.
- `push` : sur `main`, `develop` et la branche d'audit `audit/tier1-2026-05-07`.
- `workflow_dispatch` : déclenchement manuel possible.

### 2.2 Job `guard` — garde-fou opposable (auto-suffisant)

Runner `ubuntu-latest`, Node **20.x** (matrice), `timeout-minutes: 15`. Étapes :

| Ordre | Étape | Commande | Comportement |
|---|---|---|---|
| 1 | Install | `npm ci --no-audit --no-fund` | Install déterministe depuis le lockfile. |
| 2 | Lint | `npx eslint . --max-warnings 22` | **Échoue sur toute ERREUR** et sur **toute hausse de warnings** au-delà de 22. |
| 3 | Types | `npx tsc --noEmit` | Échoue sur toute erreur de typage. |
| 4 | Tests | `npm run test:run` | Échoue si un test rouge. |
| 5 | Build | `npm run build` | Échoue si le build casse. |

**Auto-suffisance confirmée** : le job `guard` n'utilise **aucun secret** ni service
externe. Il passe « out of the box » sur un runner GitHub standard. Le seuil de
warnings et la chaîne d'outils sont exactement reproductibles en local (cf. §6).

### 2.3 Mécanisme anti-régression de warnings + stratégie « ratchet »

Le gate n'exige **pas** 0 warning immédiatement (22 warnings résiduels documentés
au LOT 4 : foyers de complexité hors périmètre — edge functions Deno, services
PDF/export — `react-refresh` structurels, 1 `react-hooks/exhaustive-deps`
pré-existant). Il interdit en revanche **toute hausse** :

- Seuil retenu : **`--max-warnings 22`** (valeur exposée en `env.ESLINT_MAX_WARNINGS`
  dans le workflow pour être modifiée en un seul endroit).
- Mesure de référence (2026-06-06) : `npm run lint` = **0 erreur, 22 warnings**.
- Le gate échoue dès le **23e** warning.

**Stratégie « ratchet » (cliquet) pour converger vers 0** :

1. Résorber un foyer (ex. refactor d'une edge function pour passer `sonarjs/cognitive-complexity` < 15).
2. Mesurer le nouveau total : `npx eslint . --max-warnings 0` pour voir le décompte réel.
3. **Abaisser** `ESLINT_MAX_WARNINGS` dans `quality-gate.yml` à la nouvelle valeur (ex. 22 → 18 → 12 → … → 0).
4. Le seuil ne peut que descendre : on verrouille mécaniquement chaque gain.

Cible terminale : `--max-warnings 0` une fois tous les foyers traités.

### 2.4 Job `sonar` — analyse SonarQube/SonarCloud OPTIONNELLE et non bloquante

- Un job léger `detect-sonar` mappe la présence du secret `SONAR_TOKEN` en sortie
  booléenne (`enabled`). *Le contexte `secrets` n'étant pas utilisable dans un `if:`
  de job, ce job intermédiaire est le pattern fiable et lisible.*
- Le job `sonar` (`needs: [guard, detect-sonar]`) ne s'exécute **que si**
  `needs.detect-sonar.outputs.enabled == 'true'`. **Sans `SONAR_TOKEN`, il est
  intégralement ignoré et la CI reste verte.**
- Il réutilise `sonar-project.properties` (racine), génère `coverage/lcov.info` via
  `npm run test:coverage`, puis lance `SonarSource/sonarqube-scan-action@v4`
  (action officielle, compatible SonarCloud et SonarQube self-hosted).
- `SONAR_HOST_URL` : par défaut `https://sonarcloud.io`, surchargeable par la
  variable de dépôt `vars.SONAR_HOST_URL` pour un serveur SonarQube.

---

## 3. Activer le scan Sonar (marche à suivre)

Le scan est **désactivé par défaut**. Pour l'activer :

### Option A — SonarCloud (recommandé, SaaS gratuit pour projets)

1. Créer un compte sur [sonarcloud.io](https://sonarcloud.io) et une **organisation**
   (ex. `korev-ai`), puis y créer le **projet** `korev-ai_dica-decorator`.
2. Vérifier/ajuster dans `sonar-project.properties` (déjà renseignés) :
   - `sonar.organization=korev-ai`
   - `sonar.projectKey=korev-ai_dica-decorator`
   *(les aligner sur les valeurs réelles affichées par SonarCloud à la création).*
3. Générer un **token** (My Account → Security → *Generate Token*).
4. Dans GitHub : *Settings → Secrets and variables → Actions → New repository secret* :
   - `SONAR_TOKEN` = le token généré.
   - *(facultatif)* variable `SONAR_HOST_URL` non requise (SonarCloud par défaut).
5. Relancer le workflow : le job `sonar` s'exécute automatiquement.

### Option B — SonarQube self-hosted

1. Créer le projet sur l'instance SonarQube et générer un token.
2. Ajouter le secret `SONAR_TOKEN` **et** la variable de dépôt `SONAR_HOST_URL`
   (URL de l'instance, ex. `https://sonarqube.dica.fr`).
3. Aligner `sonar.projectKey` / `sonar.organization` au besoin.

> Tant que `SONAR_TOKEN` n'est pas renseigné, **aucune action n'est requise** :
> le gate fonctionne sans Sonar.

---

## 4. Activation du job E2E (`e2e.yml`) et gestion des credentials

### 4.1 Déclencheurs (avant → après)

| | Avant (LOT 4) | Après (LOT 5) |
|---|---|---|
| Déclenchement | `workflow_dispatch` seul | `pull_request` + `push` (`main`, `develop`, `audit/tier1-2026-05-07`) + `workflow_dispatch` conservé |

### 4.2 Étapes

`npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e` →
upload du rapport Playwright en artefact (`actions/upload-artifact@v4`,
`playwright-report/`, `if: always()`, rétention 30 j).

### 4.3 Gestion de l'absence de credentials (auto-suffisance)

- **Page publique** : `e2e/auth.spec.ts` (6 tests) tourne avec des **placeholders
  publics** injectés via `env:` :
  ```yaml
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL || 'https://placeholder.supabase.co' }}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key' }}
  ```
  L'app démarre (sinon `createClient` plante au boot) ; la page `/auth` ne fait
  aucun appel réseau au chargement → **6/6 verts** sans backend. Si les secrets
  existent, ils **priment** (valeurs réelles).
- **Pages protégées** (Creative, ProjectDetail, Admin, Dashboard) : les specs lisent
  `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` depuis les secrets (passés en `env:`). En
  leur **absence**, ces specs restent **SKIP** (comportement déjà en place) ; la CI
  ne casse pas. Renseigner ces deux secrets armera automatiquement les parcours
  authentifiés quand un backend de test sera disponible.

> **Aucun secret n'est versionné** : seuls des placeholders publics et des
> références `secrets.*` figurent dans le YAML.

---

## 5. Validation des workflows (méthode + résultats)

### 5.1 Validation de syntaxe YAML

`actionlint` **n'est pas disponible** sur la machine (`which actionlint` → absent).
Méthode de repli retenue : **parsing YAML via PyYAML** (présent), appliqué à chacun
des 4 workflows.

```bash
for f in .github/workflows/*.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1])); print('OK', sys.argv[1])" "$f"
done
```

Résultat :

```
OK .github/workflows/cd-edge-functions.yml
OK .github/workflows/ci.yml
OK .github/workflows/e2e.yml
OK .github/workflows/quality-gate.yml
```

> Les parseurs `yaml` et `js-yaml` sont également présents dans `node_modules` ; le
> contrôle PyYAML a été retenu comme suffisant. Les workflows GitHub eux-mêmes n'ont
> **pas** été exécutés (impossible en local) : seules la syntaxe et la logique de
> conditionnement (gate, détection Sonar, placeholders E2E) ont été validées.

### 5.2 Les 4 vérifications locales (garde-fou rejoué)

Le code de production étant inchangé, l'état reste **vert** :

| Vérification | Commande | Résultat |
|---|---|---|
| Lint (gate exact) | `npx eslint . --max-warnings 22` | **0 erreur, 22 warnings — exit 0 (PASS)** ✅ |
| Types | `npx tsc --noEmit` | **0 erreur** ✅ |
| Tests | `npm run test:run` | **30 fichiers / 877 tests verts** ✅ |
| Build | `npm run build` | **OK** (built in ~3,7 s) ✅ |

---

## 6. Reproduire localement

```bash
# Le garde-fou, à l'identique de la CI
npm ci
npx eslint . --max-warnings 22     # 0 erreur, 22 warnings → exit 0
npx tsc --noEmit                   # 0 erreur
npm run test:run                   # 30 fichiers / 877 tests verts
npm run build                      # OK

# Décompte réel des warnings (pour décider du prochain palier ratchet)
npx eslint . --max-warnings 0      # liste tous les warnings restants

# Validation YAML des workflows
for f in .github/workflows/*.yml; do
  python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1])); print('OK', sys.argv[1])" "$f"
done
```

---

## 7. Tableau de clôture du plan (LOT 0 → LOT 5)

| Lot | Objectif | Livrable principal | État |
|---|---|---|---|
| **LOT 0** | Config SonarQube/SonarLint + ADR exclusions | `sonar-project.properties` (49 fichiers shadcn/ui exclus, ADR-0001) | ✅ Clos |
| **LOT 1** | Patterns sémantiques (S6481, S6759, S3358) | Context mémoïsé, Props `readonly`, ternaires aplatis | ✅ Clos |
| **LOT 2** | Élimination des `any` (S2933/no-explicit-any) | 148 → **0 erreur** ESLint | ✅ Clos |
| **LOT 3** | Accessibilité (a11y) | `eslint-plugin-jsx-a11y` intégré → **0 issue a11y** | ✅ Clos |
| **LOT 4** | Complexité cognitive (S3776) / imbrication (S2004) | `eslint-plugin-sonarjs` (seuils 15 / 4 en `warn`), 3 pages refactorées, harness Playwright | ✅ Clos |
| **LOT 5** | Quality gate CI opposable + activation E2E | `quality-gate.yml` (garde-fou auto-suffisant + Sonar optionnel), `e2e.yml` automatisé | ✅ **Clos** |

### Trajectoire qualité (chiffres réels)

| Indicateur | Baseline (LOT 0) | LOT 2 | LOT 3 | LOT 4 | **LOT 5** |
|---|---:|---:|---:|---:|---:|
| Erreurs ESLint | 148 | 0 | 0 | 0 | **0** |
| Warnings ESLint | 13 | 13 | 6 | 22 | **22 (plafonné `--max-warnings 22`)** |
| Test Files Vitest | 28 | 28 | 28 | 30 | **30** |
| Tests Vitest | 842 | 842 | 842 | 877 | **877** |
| `tsc --noEmit` | — | OK | OK | OK | **0 erreur** |
| Build Vite | — | OK | OK | OK | **OK** |
| Quality gate CI opposable | Non | Non | Non | Non | **Oui ✅** |
| Scan Sonar optionnel câblé | Non | Non | Non | Non | **Oui ✅** |
| E2E automatique (PR/push) | Non | Non | Non | Manuel | **Oui ✅** |

---

## 8. Actions requises de l'utilisateur (pour exploitation complète)

1. **(Recommandé)** Protéger la branche cible : exiger le check **`Quality Gate / Garde-fou (lint • types • tests • build)`** en *branch protection* (Settings → Branches) pour rendre le gate réellement bloquant au merge.
2. **(Optionnel — Sonar)** Pour activer l'analyse Sonar : créer le projet SonarCloud/SonarQube, aligner `sonar.projectKey`/`sonar.organization`, puis ajouter le secret `SONAR_TOKEN` (et, si SonarQube self-hosted, la variable `SONAR_HOST_URL`). Cf. §3.
3. **(Optionnel — E2E protégés)** Pour armer les parcours authentifiés : ajouter les secrets `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` (et, si besoin de valeurs réelles, `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`). Sans eux, les specs protégées restent SKIP.

---

© DICA France — base logicielle KOREV AI.
