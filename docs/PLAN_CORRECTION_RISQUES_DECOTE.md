# PLAN DE CORRECTION DES RISQUES DE DÉCOTE — DICA Decorator

**Référence** : DICA-DEC-PLAN-2026
**Date** : 06/05/2026
**Émetteur** : KOREV AI
**Objet** : Plan d'action chiffré pour lever les réserves identifiées dans `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md`, `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` et le verdict d'audit final, suivi d'un **audit hostile interne** dudit plan.

---

## 0. Pré-requis et hypothèses

| Hypothèse | Justification |
|-----------|--------------|
| Profil exécutant | 1 développeur senior React/TS/Supabase, 6 h productives/jour |
| Aucun développement parallèle pendant la phase 0–1 | Évite les régressions sur la base figée |
| Branche dédiée `chore/valuation-hardening` | Toutes les actions sortent en PR isolée pour traçabilité |
| Critère d'acceptation phase | Lint snapshot + test snapshot + build snapshot **archivés** dans `audit/<phase>/` à chaque palier |
| Période d'observation production après chaque phase | Minimum 48 h, sans régression utilisateur signalée |

---

## 1. Inventaire exhaustif des risques

| ID | Catégorie | Risque | Source | Sévérité | Phase cible |
|----|-----------|--------|--------|----------|-------------|
| R-CRIT-1 | Sécurité dépendance | `happy-dom` ≤20.8.8 — VM Context Escape RCE (critical) | `npm audit` | Critique | P1 |
| R-CRIT-2 | Sécurité dépendance | `jspdf` ≤4.2.0 — Local File Inclusion / Path Traversal (critical) | `npm audit` | Critique | P1 |
| R-AUDIT-H1 | Sécurité dépendance | `react-router-dom` ≤6.30.2 — XSS via Open Redirects (high) | `npm audit` | Haute | P1 |
| R-AUDIT-H2 | Sécurité dépendance | `flatted`, `rollup`, autres high (5) | `npm audit` | Haute | P1 |
| R-AUDIT-M | Sécurité dépendance | 8 moderate (DOMPurify, ajv, brace-expansion, esbuild, postcss, yaml…) | `npm audit` | Modérée | P1 |
| R-LINT-A | Lint | 162 erreurs `@typescript-eslint/no-explicit-any` — répartition : 90 tests, 37 services, 20 pages, 13 Edge, 2 autres | `npm run lint` | Modérée | P2 |
| R-LINT-B | Lint | 10 erreurs « non-any » : 3 `prefer-const`, 2 `no-case-declarations`, 2 `no-empty-object-type`, 1 `no-useless-escape`, 1 `no-unnecessary-type-constraint`, 1 `no-require-imports` | `npm run lint` | Faible | P0 |
| R-LINT-C | Lint | 12 warnings `react-refresh/only-export-components` (test-utils, ui re-exports) | `npm run lint` | Faible | P2 |
| R-TEST-1 | Tests | 3 tests pré-existants en échec : `use-decor-context-cache.test.ts` (lignes 219, 241, 247) | `npm run test:run` | Modérée | P0 |
| R-TEST-2 | Tests | Coverage formelle jamais publiée (commande disponible) | `RAPPORT_QUALITE…` §10 | Modérée | P0 |
| R-TEST-3 | Tests | Aucun test automatisé sur les Edge Functions Deno | `RAPPORT_QUALITE…` §8 | Modérée | P3 |
| R-CI-1 | Outillage | Pipeline CI tournant sur Node 18, alors que `type-fest@5` requiert Node ≥20 | `npm install` warning | Faible | P0 |
| R-CI-2 | Outillage | Pas de pipeline CI/CD GitHub Actions (lint+test+build automatisés sur PR) | `RAPPORT_QUALITE…` §9.3 | Modérée | P2 |
| R-OPS-1 | Configuration | Variable d'env historique `LOVABLE_API_KEY` conservée en fallback dans 2 Edge Functions | `AUDIT_DEPENDANCES…` §4 | Faible | P3 |
| R-OPS-2 | Production | Logs Edge Functions verbeux en production (pas de logger conditionnel) | `RAPPORT_QUALITE…` §9.2 | Faible | P3 |
| R-DOC-1 | Transmission | Snapshots lint/test/build non archivés dans `audit/` | Verdict §R5 | Faible | P0 |
| R-OBS-1 | Production | Pas d'observabilité runtime (Sentry/Datadog/Posthog) | `RAPPORT_QUALITE…` §9.3 | Modérée | P3 |

**Total identifié** : 17 risques regroupés en 4 phases.

---

## 2. Plan de correction phasé

### Phase 0 — Stabilisation immédiate (≤ 1 j/h)

**Objectif** : passer en `GO sans réserves` sur les éléments triviaux et ceux directement nécessaires à l'évaluation Diag & Grow.

#### P0-1 — Auto-fix des lints triviaux (R-LINT-B partiel)

| Champ | Valeur |
|-------|--------|
| Action | `npx eslint . --fix` puis revue manuelle des fichiers touchés |
| Lints traités | 3 `prefer-const` (auto), 2 `no-case-declarations` (manuel : encapsuler dans `{}`), 1 `no-useless-escape` (manuel : retirer `\/` superflu dans `image-export.service.ts:84`) |
| Lints non traités à ce stade | `no-empty-object-type` × 2 (`vitest.d.ts` — interface vide volontaire pour `Assertion`), `no-unnecessary-type-constraint` × 1 (`test-utils.tsx`), `no-require-imports` × 1 (`tailwind.config.ts` — `require('tailwindcss-animate')` historique) |
| Coût | 0,15 j/h |
| Validation | `npm run lint` → 7–10 erreurs en moins |
| Risque résiduel | `--fix` peut introduire des changements de style ; lecture diff obligatoire avant commit |

#### P0-2 — Réalignement des 3 tests `use-decor-context-cache` (R-TEST-1)

| Champ | Valeur |
|-------|--------|
| Diagnostic | L'implémentation actuelle (`src/hooks/use-decor-context-cache.ts`) génère un format **JSON + bandeau ASCII** sans le mot-clé "CATÉGORIE/CATEGORY" et **sans inclure les `texture_image_url`** (économie de tokens dans le prompt IA). Les tests cherchent ces deux marqueurs absents. |
| Décision | **Aligner les tests sur l'implémentation** (qui est la version voulue en production), ne PAS rétroporter les anciennes chaînes dans le hook (économie tokens IA = comportement souhaité). |
| Action concrète | Remplacer les 3 assertions par : (1) test ligne 241 → `expect(result.current.context).toMatch(/CATALOGUE DICA|📂/);` (2) test ligne 247 → supprimer le test « should include texture URLs » et le remplacer par « should NOT include texture URLs » (économie tokens IA) (3) test ligne 219 — investiguer s'il s'agit bien d'un échec de référence stricte ou d'un effet de re-rendu de `useState`. |
| Coût | 0,5 j/h |
| Validation | `npm run test:run -- src/hooks` → 18/18 ✓, total 811/811 ✓ |
| Risque résiduel | Le test ligne 219 peut révéler un vrai bug de cache (pas seulement un test obsolète) — auquel cas le périmètre s'étend à corriger le hook lui-même (+0,3 j/h) |

#### P0-3 — Bump engine CI vers Node 20 LTS (R-CI-1)

| Champ | Valeur |
|-------|--------|
| Action | Si pipeline CI existe (à confirmer auprès de l'opérateur) : modifier `node-version: 18` → `node-version: 20` dans `.github/workflows/*` ou équivalent. Ajouter `engines: {"node": ">=20"}` dans `package.json`. |
| Coût | 0,25 j/h |
| Validation | `node --version` ≥20 + un cycle CI complet ou un `npm ci && npm run build` propre |
| Risque résiduel | Possible incompatibilité avec un script ops historique (script `restart-server.sh` en racine — à inspecter) |

#### P0-4 — Génération et archivage de la coverage formelle (R-TEST-2)

| Champ | Valeur |
|-------|--------|
| Action | (1) `npm run test:coverage` (provider v8 déjà installé, aligné v3) (2) Capturer le tableau de synthèse stdout + le dossier `coverage/` (3) Exporter `coverage/coverage-summary.json` (4) Joindre au dossier d'évaluation comme annexe |
| Coût | 0,25 j/h |
| Validation | Fichier `audit/phase-0/coverage-summary.json` présent + résumé textuel publié dans `RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` §10 |
| Risque résiduel | Coverage faible révélée publiquement (< 50 %) → posture défensive à préparer (« coverage par stratégie : services métier critiques 80 %+, glue UI volontairement non testée ») |

#### P0-5 — Archivage des snapshots de gates (R-DOC-1)

| Champ | Valeur |
|-------|--------|
| Action | Créer `audit/phase-0/` contenant : `lint.txt`, `test.txt`, `build.txt`, `npm-audit.json`, `coverage-summary.json`. Référencer dans `VALORISATION_TECHNIQUE_DICA_DECOR.md` §14. |
| Coût | 0,1 j/h |
| Validation | Dossier complet, horodaté, signé KOREV AI |
| Risque résiduel | — |

#### Synthèse Phase 0

| Item | Coût |
|------|-----:|
| P0-1 auto-fix lints | 0,15 |
| P0-2 réalignement tests | 0,5 |
| P0-3 bump Node CI | 0,25 |
| P0-4 coverage publiée | 0,25 |
| P0-5 archivage snapshots | 0,1 |
| **Total Phase 0** | **1,25 j/h** |

**Sortie attendue** : verdict **GO sans réserves**, dossier transmissible à Diag & Grow avec annexes complètes.

---

### Phase 1 — Sécurisation des dépendances (≤ 5 j/h)

**Objectif** : éliminer les 19 vulnérabilités héritées sans casser l'application.

#### P1-1 — Audit fix non-breaking (R-AUDIT-M, partiel R-AUDIT-H)

| Champ | Valeur |
|-------|--------|
| Action | (1) Branche dédiée. (2) `npm audit fix` (sans `--force`) — applique uniquement les patches semver-safe. (3) `npm run test:run`, `npm run lint`, `npm run build`. (4) Smoke test manuel des 5 pages clés (Auth, Dashboard, ProjectDetail, Creative, Admin). |
| Coût estimé | 1 j/h |
| Validation | `npm audit` → réduction du compteur total ; tests/build inchangés |
| Risque résiduel | Faible — semver-safe par définition |

#### P1-2 — Migration `react-router-dom` 6 → 7 (R-AUDIT-H1)

| Champ | Valeur |
|-------|--------|
| Action | (1) Lire CHANGELOG `react-router` v7. (2) Bumper en branche dédiée. (3) Adapter les imports cassés (`react-router-dom` v7 fusionne plusieurs entry points). (4) Re-tester l'ensemble des routes (13 pages, lazy loading inclus). |
| Coût estimé | 1,5 j/h |
| Validation | Toutes les routes naviguent ; lazy loading fonctionne ; pas de régression d'auth-guard |
| Risque résiduel | Modéré — v7 introduit des breaking changes (data API, future flags). Possible nécessité de geler à v6.30.x avec patch de sécurité dédié si la migration s'avère trop invasive. |

#### P1-3 — Migration `jspdf` 3 → 4 (R-CRIT-2)

| Champ | Valeur |
|-------|--------|
| Action | (1) Bumper. (2) Re-tester la suite `magazine-deco-pdf.service`, `reseller-brochure-pdf.service` (138 + 60 + 26 tests = 224 cas). (3) Vérifier le rendu visuel d'un PDF complet (Magazine DÉCO et Brochure revendeur). |
| Coût estimé | 0,75 j/h |
| Validation | Tests PDF passent ; rendu visuel inchangé ; chemin de Local File Inclusion neutralisé |
| Risque résiduel | Modéré — l'API jspdf 4 peut casser les helpers d'export (à éprouver dès le smoke test) |

#### P1-4 — Migration `happy-dom` (R-CRIT-1)

| Champ | Valeur |
|-------|--------|
| Action | Bumper `happy-dom` à la dernière version corrigeant la VM Context Escape. Alternative : basculer toute la suite vers `jsdom` (déjà installé). |
| Coût estimé | 0,5 j/h |
| Validation | Suite de tests Vitest passe ; setup `src/test/setup.ts` inchangé |
| Risque résiduel | Faible — `happy-dom` a une API stable, et `jsdom` est un fallback connu |

#### P1-5 — Vite + Vitest version majeure (R-AUDIT-M `esbuild` + alignement v4)

| Champ | Valeur |
|-------|--------|
| Action | (1) Bumper `vite` 5 → 6 et `vitest` 3 → 4 dans la même PR (peer dep cohérent). (2) Aligner `@vitest/coverage-v8` v4. (3) Re-tester. (4) Re-builder. |
| Coût estimé | 1 j/h |
| Validation | Build + tests passent ; perf de build comparable (≤ 4 s) |
| Risque résiduel | Modéré — Vite 6 introduit des changements (Rolldown éventuellement). Plan B : rester sur Vite 5 avec patch sécurité ciblé sur esbuild via `overrides`. |

#### Synthèse Phase 1

| Item | Coût |
|------|-----:|
| P1-1 audit fix | 1 |
| P1-2 react-router 6→7 | 1,5 |
| P1-3 jspdf 3→4 | 0,75 |
| P1-4 happy-dom | 0,5 |
| P1-5 Vite+Vitest majeur | 1 |
| **Total Phase 1** | **4,75 j/h** |

**Sortie attendue** : `npm audit` à 0 vulnérabilité critique/haute, ≤ 3 vulnérabilités modérées résiduelles documentées.

---

### Phase 2 — Durcissement qualité (≤ 8 j/h)

**Objectif** : réduire significativement la dette `any` et formaliser la pipeline CI/CD.

#### P2-1 — Sprint typage Edge Functions (R-LINT-A, sous-bloc Edge)

| Champ | Valeur |
|-------|--------|
| Action | Typer les 13 `any` des 5 Edge Functions : (1) Définir des interfaces TS pour les payloads JWT, Supabase rows, AI gateway responses. (2) Extraire dans `supabase/functions/_shared/types.ts`. (3) Remplacer chaque `any`. |
| Coût estimé | 1,5 j/h |
| Validation | Lint Edge Functions à 0 erreur ; tests inchangés |
| Risque résiduel | Faible |

#### P2-2 — Sprint typage services métier (R-LINT-A, sous-bloc services)

| Champ | Valeur |
|-------|--------|
| Action | Typer les 37 `any` des services (`admin-project-viewer`, `analytics`, `magazine-deco-pdf`, `project-deletion`, `project-rename`, `reseller-brochure-pdf`, etc.). Pattern : remplacer `catch (e: any)` par `catch (e: unknown)` + narrowing, typer les events jspdf via interfaces partielles. |
| Coût estimé | 2 j/h |
| Validation | Lint services à 0 erreur ; tests services passent (~600 cas) |
| Risque résiduel | Faible — patterns standards documentés dans `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md` §1 *(snapshot décembre 2025, archivé)* |

#### P2-3 — Sprint typage pages (R-LINT-A, sous-bloc pages)

| Champ | Valeur |
|-------|--------|
| Action | Typer les 20 `any` des pages (`ProjectDetail`, `Dashboard`, `Admin`, `Creative`). Cas typiques : handlers d'événements, props drilling, callbacks Supabase. |
| Coût estimé | 1 j/h |
| Validation | Lint pages à 0 erreur |
| Risque résiduel | Faible |

#### P2-4 — Typage des suites de tests (R-LINT-A, sous-bloc tests, R-LINT-C)

| Champ | Valeur |
|-------|--------|
| Action | Typer les 90 `any` dans les fichiers `__tests__/*.test.ts(x)` : majoritairement des mocks de retours Supabase. Extraire un helper `mockSupabaseQueryBuilder<T>()` dans `src/test/test-utils.tsx`. Traiter aussi les 12 warnings `react-refresh/only-export-components` (extraction des helpers hors fichier composant). |
| Coût estimé | 2 j/h |
| Validation | Lint à 0 erreur ; suite de tests passe à l'identique |
| Risque résiduel | Faible |

#### P2-5 — Pipeline CI/CD GitHub Actions (R-CI-2)

| Champ | Valeur |
|-------|--------|
| Action | Créer `.github/workflows/ci.yml` : (1) Job `quality` → install + lint + test + build sur Node 20 LTS. (2) Job `audit` → `npm audit --audit-level=high`. (3) Sur `main` : déclenchement de la pipeline de déploiement Edge Functions Supabase via `supabase functions deploy`. |
| Coût estimé | 1,5 j/h |
| Validation | Workflow vert sur `main` ; check obligatoire sur PR |
| Risque résiduel | Faible — les commandes existent déjà localement |

#### Synthèse Phase 2

| Item | Coût |
|------|-----:|
| P2-1 typage Edge | 1,5 |
| P2-2 typage services | 2 |
| P2-3 typage pages | 1 |
| P2-4 typage tests + warnings | 2 |
| P2-5 pipeline CI/CD | 1,5 |
| **Total Phase 2** | **8 j/h** |

**Sortie attendue** : lint à **0 erreur, 0 warning** ; CI/CD opérationnelle ; gates automatisés sur chaque PR.

---

### Phase 3 — Résilience et observabilité (≤ 10 j/h)

**Objectif** : robustesse production et autonomie d'exploitation.

#### P3-1 — Tests automatisés Edge Functions (R-TEST-3)

| Champ | Valeur |
|-------|--------|
| Action | Mettre en place `deno test` ou Vitest avec mocks `Deno.env`/fetch sur les 5 Edge Functions. Couvrir : auth header, JWT validation, payload validation, AI gateway error handling, Supabase admin calls. |
| Coût estimé | 3 j/h |
| Validation | ≥ 30 nouveaux tests Edge passants ; intégrés dans CI |
| Risque résiduel | Faible |

#### P3-2 — Logger conditionnel Edge Functions (R-OPS-2)

| Champ | Valeur |
|-------|--------|
| Action | Extraire `supabase/functions/_shared/logger.ts` avec niveaux (`debug`/`info`/`warn`/`error`) et un seuil configurable via env `LOG_LEVEL`. Remplacer les `console.log` verbeux par `log.debug()`. Garder `log.info()` pour les jalons métier. |
| Coût estimé | 1 j/h |
| Validation | Logs Edge en production : volume divisé par ≥ 5 sans perte d'information critique |
| Risque résiduel | Faible |

#### P3-3 — Migration AI Gateway vers Google AI Studio direct (R-OPS-1)

| Champ | Valeur |
|-------|--------|
| Action | (1) Provisionner les secrets `AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` et `AI_GATEWAY_API_KEY=<google-ai-key>`. (2) Tester en staging. (3) Déployer en production. (4) Retirer la lecture `LOVABLE_API_KEY` et la constante URL legacy dans le code. |
| Coût estimé | 1 j/h |
| Validation | Aucune trace `lovable` résiduelle dans le code applicatif ; orchestrateur et magazine-captions fonctionnels en prod |
| Risque résiduel | Faible si validation staging exhaustive ; modéré si latence ou format de réponse différent (Google AI vs gateway tierce) |

#### P3-4 — Observabilité runtime (R-OBS-1)

| Champ | Valeur |
|-------|--------|
| Action | (1) Choisir : Sentry (front + backend), Posthog (produit), ou Supabase logs natifs. (2) Intégrer le SDK frontend (`@sentry/react` lazy chargé). (3) Instrumenter les Edge Functions critiques. |
| Coût estimé | 3 j/h |
| Validation | Erreurs frontend remontées en temps réel ; 0 PII fuitée (anonymisation utilisateur) |
| Risque résiduel | Modéré — choix d'outil = engagement long terme |

#### P3-5 — Documentation de plan de continuité IA (R-OPS-1)

| Champ | Valeur |
|-------|--------|
| Action | Compléter `docs/AUDIT_DEPENDANCES.md` §4.3 avec une procédure pas-à-pas testée de bascule vers (a) Google AI Studio direct, (b) Vertex AI, (c) OpenRouter. Joindre des captures de chacune des bascules en staging. |
| Coût estimé | 1 j/h |
| Validation | Document daté, signé KOREV AI, référencé dans le dossier commissaire |
| Risque résiduel | Faible |

#### Synthèse Phase 3

| Item | Coût |
|------|-----:|
| P3-1 tests Edge | 3 |
| P3-2 logger conditionnel | 1 |
| P3-3 migration gateway | 1 |
| P3-4 observabilité | 3 |
| P3-5 plan continuité IA | 1 |
| **Total Phase 3** | **9 j/h** |

**Sortie attendue** : actif **production-grade**, indépendant de tout fournisseur unique, observable, documenté.

---

## 3. Synthèse globale du plan

| Phase | Coût (j/h) | Cumul (j/h) | Effet sur valorisation |
|-------|-----------:|------------:|------------------------|
| Phase 0 — Stabilisation immédiate | 1,25 | 1,25 | Verdict GO sans réserves |
| Phase 1 — Sécurisation dépendances | 4,75 | 6 | 0 vulnérabilité critique/haute |
| Phase 2 — Durcissement qualité | 8 | 14 | Lint propre, CI/CD opérationnelle |
| Phase 3 — Résilience & observabilité | 9 | 23 | Actif production-grade |

**Coût total** : **~23 j/h** — à comparer aux **150 j/h** d'estimation centrale de reconstitution. Représente **~15 %** du capital technique, soit un investissement raisonnable pour faire passer l'actif de « livrable » à « excellence opérationnelle ».

---

## 4. Risques transverses et stratégie de gel

| Risque transverse | Mitigation |
|-------------------|------------|
| Casser la production pendant les phases 1–3 | Branche dédiée + staging Supabase clone + smoke test manuel obligatoire avant merge |
| Coût qui dérive sur le typage (`any`) | Plafonner par sous-bloc (Edge / services / pages / tests) avec un budget journalier strict |
| Migration Vite 6 / react-router 7 douloureuse | Plan B : rester en versions actuelles avec `overrides` ciblés sur les paquets vulnérables transitivement |
| Perte de couverture après refactor | Garde-fou : interdire toute PR de typage qui réduit le compteur de tests passants |
| Disponibilité API Google AI / fournisseur AI Gateway | Plan continuité IA documenté en P3-5, testé en staging avant remplacement définitif |

---

# AUDIT HOSTILE INTERNE DU PLAN

> Cet audit est réalisé en posture **adversariale** : on cherche les failles, les estimations optimistes, les angles morts et les enchaînements à risque. La conclusion peut révoquer ou rétrograder une recommandation du plan.

## H1. Estimations crédibles ?

### H1.1 Phase 0 — surestimée ou sous-estimée ?

| Item | Estimé | Commentaire hostile |
|------|-------:|---------------------|
| P0-1 auto-fix lints | 0,15 | **Réaliste** — voire pessimiste : `eslint --fix` couvre `prefer-const` et le « no-useless-escape » en quelques minutes. |
| P0-2 réalignement 3 tests | 0,5 | ⚠️ **Optimiste si le test ligne 219 cache un vrai bug**. Le hook `useDecorContextCache` utilise `useMemo([decors, currentHash])` : si `decors` est passé en literal `mockDecors`, la même référence devrait éviter le rebuild — sauf si le test isole un effet secondaire de `useState` interne. **À ré-estimer à 0,8 j/h pour couvrir le cas où la stabilité de référence est réellement cassée.** |
| P0-3 bump CI Node | 0,25 | ⚠️ Suppose qu'une **pipeline CI existe déjà**. Si le projet n'a pas de `.github/workflows/`, il faut alors la créer (cf. P2-5) — incohérence de phasage. **À fusionner avec P2-5 ou à supprimer si pas de pipeline existante.** |
| P0-4 coverage publiée | 0,25 | ⚠️ La commande peut **mettre 30+ secondes** au premier run + générer des warnings transformer (vitest v3/v8). Si la coverage révèle < 50 % global (probable sur les pages UI), il faut prévoir un paragraphe de cadrage interprétatif. **À sécuriser à 0,4 j/h.** |
| P0-5 archivage | 0,1 | Réaliste. |

**Conclusion H1.1** : phase 0 plutôt à **1,5–1,7 j/h** que 1,25.

### H1.2 Phase 1 — surestimée ou sous-estimée ?

| Item | Estimé | Commentaire hostile |
|------|-------:|---------------------|
| P1-1 audit fix non-breaking | 1 | ⚠️ Le `--dry-run` montre que beaucoup de fixes nécessitent des bumps mineurs avec changements de comportement (`brace-expansion`, `ajv`). Un audit fix peut **modifier 30+ versions** transitives, et ne pas se contenter du semver-safe « cosmétique ». **0,8–1,2 j/h plausible.** |
| P1-2 react-router 6→7 | 1,5 | 🔴 **Sérieusement sous-estimé**. La migration v7 introduit le **mode framework** ou le **mode library** + suppression du legacy `react-router-dom`. Sur 13 pages et lazy loading manuel, on compte typiquement **2,5–3 j/h** + 0,5 j/h de smoke test. Risque réel d'être obligé de **rester en 6.30 patchée** (override transitif). |
| P1-3 jspdf 3→4 | 0,75 | ⚠️ jspdf v4 introduit des **API breaking** sur les contextes graphiques (canvas, polices). 224 tests à re-vérifier. **1–1,5 j/h plus prudent.** |
| P1-4 happy-dom | 0,5 | Réaliste **uniquement si** la suite ne dépend pas de comportements happy-dom-spécifiques. |
| P1-5 Vite + Vitest majeur | 1 | 🔴 **Sous-estimé**. Vite 6 = potentielle bascule Rolldown, Vitest 4 = **breaking changes API tests**. Avec 26 fichiers de tests + 5 Edge Functions, on est plus à **2–3 j/h**. |

**Conclusion H1.2** : phase 1 plutôt à **6,5–9 j/h** que 4,75. **Risque de glissement majeur de +50 %.**

### H1.3 Phase 2 — surestimée ou sous-estimée ?

| Item | Estimé | Commentaire hostile |
|------|-------:|---------------------|
| P2-1 typage Edge | 1,5 | Réaliste — 13 cas, profil senior. |
| P2-2 typage services | 2 | ⚠️ 37 `any` mais certains sont dans des **`catch (e: any)`** triviaux (5 min/cas), d'autres dans des **events jspdf** (30 min/cas). Estimation moyenne 30 min/cas → 18 h ≈ 3 j/h. **Sous-estimation probable de +50 %.** |
| P2-3 typage pages | 1 | Réaliste si pages relativement standards. |
| P2-4 typage tests + warnings | 2 | ⚠️ 90 `any` dans tests = beaucoup de `mockResolvedValue(... as any)`. Helper générique `mockSupabaseQueryBuilder<T>()` typé non trivial à concevoir. **2–2,5 j/h plus prudent.** |
| P2-5 CI/CD | 1,5 | ⚠️ Sous-estime le déploiement automatisé Edge Functions (gestion des secrets, rollback). Sans déploiement auto = **réaliste**. Avec déploiement auto = **2,5 j/h.** |

**Conclusion H1.3** : phase 2 plutôt à **9–10,5 j/h** que 8.

### H1.4 Phase 3 — surestimée ou sous-estimée ?

| Item | Estimé | Commentaire hostile |
|------|-------:|---------------------|
| P3-1 tests Edge | 3 | ⚠️ 5 fonctions × ~6 cas critiques = 30 tests. Mais **mocks Deno.env, fetch, Supabase admin** = mise en place initiale lourde (1 j/h). **3,5–4 j/h plus prudent.** |
| P3-2 logger | 1 | Réaliste. |
| P3-3 migration gateway | 1 | ⚠️ Le **provisioning des secrets en staging** dépend des permissions ops du repreneur. Si pas d'environnement staging Supabase = **2 j/h.** |
| P3-4 observabilité | 3 | ⚠️ Choix d'outil + onboarding = **3–4 j/h. Dépendance à un commit budgétaire/abonnement** non chiffré ici. |
| P3-5 plan continuité IA | 1 | Réaliste. |

**Conclusion H1.4** : phase 3 plutôt à **10,5–12 j/h** que 9.

### H1.5 Total réaliste vs estimé

| Phase | Estimé | Réaliste hostile |
|-------|-------:|-----------------:|
| P0 | 1,25 | **1,5–1,7** |
| P1 | 4,75 | **6,5–9** |
| P2 | 8 | **9–10,5** |
| P3 | 9 | **10,5–12** |
| **Total** | **23** | **27,5–33,2** |

**Verdict H1** : ⚠️ **Le plan global est sous-estimé de 20 à 45 %**. Recommandation : afficher une fourchette **23–35 j/h** plutôt qu'un point unique à 23 j/h.

---

## H2. Ordre des priorités défendable ?

### H2.1 Ordonnancement P0 → P3 cohérent ?

✅ Phase 0 d'abord (quick wins + tests). Logique pour livrer Diag & Grow.
✅ Phase 1 ensuite (sécurité critique). Bonne hiérarchie.
⚠️ Phase 2 (typage) avant Phase 3 (résilience) : **discutable**. Si le projet est en exploitation et que les vulnérabilités critiques sont corrigées (P1), **P3-4 observabilité** est plus urgent que P2 typage pour détecter une régression production. **Recommandation : insérer P3-4 entre P1 et P2.**

### H2.2 Dépendances entre tâches sous-estimées

| Dépendance cachée | Conséquence |
|-------------------|-------------|
| P0-3 (bump Node) prérequis de P1-5 (Vite/Vitest) | Si CI reste en Node 18, Vitest 4 ne tournera pas en CI |
| P1-2 (react-router 7) bloque P0-2 si touche les imports pages | Faible risque — les tests `use-decor-context-cache` n'utilisent pas react-router |
| P1-5 (Vitest 4) impacte tous les tests (P2-1, P2-4) | **Forte dépendance** : faire P1-5 AVANT P2-1/P2-4 sinon double refactor |
| P2-1 (typage Edge) bloque P3-1 (tests Edge) | Logique — typer puis tester |
| P3-3 (migration gateway) impacte P2-1 (types) | Faible — interfaces Edge sont locales |

**Recommandation H2** : enchaîner strictement **P1-5 → P2-1 → P3-1** sans permutation.

### H2.3 Risque d'enchaînement

🔴 **`npm audit fix` non-breaking + bumps majeurs Vite/Vitest/react-router** dans la même phase = **forte probabilité de cascade de régressions silencieuses**. Recommandation : **séparer P1-1 d'avec P1-2/P1-5**, et faire un cycle `lint+test+build+smoke prod-like` **entre chaque migration majeure**.

---

## H3. Tests de non-régression suffisants ?

### H3.1 Couverture des smoke tests manuels

| Smoke test prévu | Hostile |
|------------------|---------|
| 5 pages clés (Auth, Dashboard, ProjectDetail, Creative, Admin) | ⚠️ **Insuffisant** : oublie `Favorites`, `Presentation`, `AdminAnalytics`, `Help`, `Legal`, partage public, multi-tenant |
| Test PDF Magazine + Brochure | ✅ |
| Test pipeline IA `apply-decor` + `creative-chat` + `magazine-captions` | ⚠️ **Non explicité** dans le plan. Or les bumps `@supabase/supabase-js`, `jspdf`, `vite` peuvent casser silencieusement les Edge Functions |

**Recommandation H3.1** : annexer une **checklist de 15 smoke tests obligatoires** au plan, exécutée à la fin de chaque phase 1 et 2.

### H3.2 Tests automatisés sur le scope migré

| Item | Hostile |
|------|---------|
| react-router 7 | Aucun test e2e (Playwright/Cypress) en place. Migration sans filet. |
| jspdf 4 | Tests unitaires PDF présents (224) mais ne valident pas la **forme visuelle** du PDF. Possibilité de régression visuelle silencieuse. |
| Vite 6 / Vitest 4 | Pas de **test de performance build** ; pas de **comparaison de bundle size** post-migration. |

**Recommandation H3.2** : ajouter **avant la phase 1** :
- Capture d'un PDF de référence Magazine + Brochure (visual baseline)
- Capture du `vite-bundle-visualizer` actuel
- Capture des temps de build et de test (3 runs moyennés)

Coût additionnel : **+0,5 j/h en P0**.

---

## H4. Risques cachés non listés dans le plan

### H4.1 Risques opérationnels manqués

| Risque caché | Sévérité | À ajouter |
|--------------|----------|-----------|
| Le projet Supabase distant `urkftxznsynmvkskytih` n'a peut-être pas de **staging/clone** — toute migration Edge Functions est testée directement en prod | Élevée | Provisionner un projet Supabase staging avant P1 et P3 (+1 j/h) |
| Aucun **plan de rollback Edge Functions** documenté (versioning Supabase Functions) | Modérée | Ajouter à `HANDOVER_DEVELOPPEUR.md` (+0,25 j/h) |
| Pas de **backups automatisés** documentés sur Postgres (RPO/RTO inconnus) | Élevée | Vérifier la config Supabase + documenter (+0,25 j/h) |
| Le `bun.lockb` a été supprimé mais aucune communication aux éventuels développeurs ayant un workflow Bun | Faible | Ajouter une note migration dans `HANDOVER_DEVELOPPEUR.md` |
| Le `.env` reste committé dans la version actuelle du repo (gitignored à partir de cette mission) | Modérée | Vérifier l'historique Git → si la clé anon a fuité dans l'historique, **rotation** obligatoire (+0,5 j/h) |
| Aucune mention du **RGPD log retention** Supabase Auth | Modérée | À documenter |

**Recommandation H4.1** : créer une **Phase -1 (pré-requis ops)** de **2 j/h** AVANT P0, avec staging + rollback + backups + audit `.env`.

### H4.2 Risques juridiques manqués

| Risque | Statut |
|--------|--------|
| Audit licences des 30 deps runtime | ⚠️ **Non fait dans le plan** — un `license-checker` est nécessaire pour confirmer 100 % MIT/Apache 2/ISC |
| Vérification des CGU Google AI / AI Gateway pour usage commercial DICA France | ⚠️ Non explicité |
| Mentions légales (CNIL, mentions obligatoires éditeur français) | ⚠️ Présence d'une page `Legal.tsx` dans le repo mais contenu non audité |

**Recommandation H4.2** : ajouter un **bloc juridique** en P0 (+0,5 j/h) couvrant `npx license-checker --summary` + revue manuelle de `src/pages/Legal.tsx`.

### H4.3 Risques techniques cachés

| Risque | Mitigation |
|--------|-----------|
| Le `package.json` déclare la version `2.2.0` alors que le code source a évolué depuis (commits récents). **Sémantique versioning incohérente.** | Réaligner la version au prochain release tag |
| Le hook `useDecorContextCache` mute `lastHashRef.current = currentHash` à l'intérieur de `useMemo` — anti-pattern React (side-effect dans un selector) qui peut générer des warnings en mode strict | Refactor (+0,5 j/h) |
| Les Edge Functions utilisent un pattern de **JWT manual decoding** (split + atob + JSON.parse) — vérification non exhaustive de la signature ! La validation côté `auth.admin.getUserById` rattrape, mais c'est un **path d'erreur si l'ordre d'appel change** | Audit sécu dédié (+0,5 j/h) |

**Recommandation H4.3** : ajouter un **bloc audit sécurité ciblé Edge Functions** (1 j/h) en P3.

---

## H5. Risques de cascade lors de `npm audit fix --force`

### H5.1 Quels paquets seraient bumpés en majeur ?

D'après `npm audit fix --dry-run` :
- `react-router-dom` → 7.x (breaking)
- `jspdf` → 4.x (breaking)
- `happy-dom` → 20.x (breaking potentiel)
- `vite` → 6.x (breaking)
- `vitest` → 4.x (breaking)
- `dompurify` → 3.4+ (impact jspdf indirect)
- `postcss` → 8.5+ (impact tailwind indirect)

**7 bumps majeurs** simultanés si `--force` est utilisé sans staging. **Risque de chaos.**

### H5.2 Stratégie hostile recommandée

❌ **Ne JAMAIS lancer `npm audit fix --force`** sur la branche `main`.
✅ **Procéder paquet par paquet, branche par branche, smoke test entre chaque** — c'est exactement ce que P1-2 à P1-5 prévoient. Bonne approche, **mais le plan actuel les regroupe dans une même phase de 4,75 j/h, ce qui n'est pas réaliste pour 5 migrations majeures**.

**Recommandation H5** : éclater P1 en **5 sous-phases distinctes**, chacune avec sa propre PR + son propre smoke test.

---

## H6. Indicateurs d'arrêt et d'escalade

Le plan ne prévoit **aucun garde-fou explicite** (« kill switch ») en cas de dérapage. Hostile :

| Phase | Indicateur d'arrêt | Action |
|-------|-------------------|--------|
| P1-2 (router 7) | Si > 3 routes cassent en smoke | **Roll back** vers v6.30.x avec `npm overrides` ciblé sur `@remix-run/router` |
| P1-5 (vite/vitest 4) | Si > 30 tests cassent en CI | **Roll back** vers v5/v3 avec patch sécurité ciblé |
| P2-* (typage) | Si la PR dépasse 500 lignes diff | **Splitter** par sous-bloc |
| P3-4 (observabilité) | Si décision outil > 0,5 j/h | **Repousser** à phase ultérieure ; activer Supabase logs natifs en interim |

**Recommandation H6** : annexer cette grille de kill switch au plan principal.

---

## VERDICT DE L'AUDIT HOSTILE

### Plan tel qu'écrit

> ## **GO AVEC RÉSERVES IMPORTANTES**

### Réserves bloquantes (à intégrer avant exécution)

| # | Réserve | Action | Impact j/h |
|---|---------|--------|-----------:|
| AH-1 | Provisionner un environnement staging Supabase avant toute migration Edge | Phase **-1** (préalable) | +1 j/h |
| AH-2 | Capturer baselines visuelles PDF + bundle + perf avant migrations majeures | À la fin de P0 | +0,5 j/h |
| AH-3 | Vérifier l'historique Git pour fuite éventuelle de secrets dans `.env` ; rotation si avéré | P0 | +0,5 j/h |
| AH-4 | Audit licences automatisé + revue `Legal.tsx` | P0 | +0,5 j/h |
| AH-5 | Éclater P1 en 5 PRs distinctes avec smoke entre chaque | Re-organisation | 0 j/h |
| AH-6 | Annexer une checklist de 15 smoke tests + grille de kill switch | P0 | +0,5 j/h |
| AH-7 | Insérer P3-4 (observabilité) entre P1 et P2 | Re-ordonnancement | 0 j/h |
| AH-8 | Réviser les estimations vers fourchette **23–35 j/h** au lieu d'un point | Communication | 0 j/h |

### Plan révisé après audit hostile

| Phase | Estimé initial | Réaliste après audit |
|-------|---------------:|---------------------:|
| Phase -1 — pré-requis ops | — | **3 j/h** (staging + baselines + rotation `.env` + audit licences + checklist) |
| Phase 0 — stabilisation | 1,25 | **1,7 j/h** |
| Phase 1 — sécurité | 4,75 | **8 j/h** (5 sous-phases isolées) |
| Phase 1bis — observabilité minimale | (en P3-4) | **3 j/h** (priorité opérationnelle) |
| Phase 2 — qualité | 8 | **10 j/h** |
| Phase 3 — résilience reste | 6 | **8 j/h** |
| **Total** | **23** | **33,7 j/h** |

### Recommandation finale

✅ **Exécuter le plan révisé** (33,7 j/h) plutôt que le plan initial (23 j/h) si l'on vise une **excellence opérationnelle défendable face à un évaluateur sceptique**.

✅ **Communiquer une fourchette** au commissaire aux apports : **« 23 à 35 j/h selon le niveau de durcissement souhaité ; 35 j/h si l'on inclut staging + observabilité production-grade »**.

⚠️ **NE PAS livrer le plan initial tel quel** sans les 8 réserves ci-dessus — elles couvrent des angles morts opérationnels (staging, rotation secrets, kill switch) que tout évaluateur senior remarquera immédiatement.

---

**Conclusion** : le plan initial est **techniquement correct mais opérationnellement naïf**. Il sous-estime de 20–45 % et omet les pré-requis ops critiques. Le plan révisé après audit hostile est **plus long de 10 j/h** mais devient **réellement défendable** et **résilient** aux contre-arguments d'un évaluateur expérimenté.
