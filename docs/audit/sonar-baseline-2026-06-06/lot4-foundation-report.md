# Rapport LOT 4 — Vague 1 : Fondation (métrique de complexité + harness E2E)

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 4 — Réduction de complexité cognitive (S3776) / imbrication (S2004) |
| Vague | **Vague 1 — Fondation outillage & filet anti-régression** (AUCUN refacto de page) |
| Branche | `audit/tier1-2026-05-07` |
| Snapshots produits | `complexity-baseline-lot4.txt` |
| Périmètre pages cibles | `Creative.tsx`, `Auth.tsx`, `ProjectDetail.tsx`, `Admin.tsx`, `Dashboard.tsx` |

> Cette vague **mesure** et **sécurise** ; elle ne refactore rien. Aucun fichier de `src/pages/` ni aucun composant de production n'a été modifié. Les refactos de réduction de complexité seront menés en **Vague 2** par d'autres agents, qui s'appuieront sur la métrique reproductible et le filet E2E posés ici.

---

## 1. Objectif de la fondation

Au LOT 3, l'accessibilité a été rendue **mesurable en CI** via `eslint-plugin-jsx-a11y` (les ~30 issues a11y de SonarLint IDE n'étaient pas reproductibles). LOT 4 vague 1 applique la même logique à la **complexité cognitive** :

1. **Rendre les chiffres de complexité reproductibles** — aujourd'hui les valeurs « 36 → 15 » proviennent de SonarLint IDE (déclaratif, non opposable). On les ancre dans le repo via une règle ESLint exécutable localement et en CI.
2. **Poser un filet anti-régression E2E** — caractériser le comportement ACTUEL des 5 pages monolithiques avant refacto, pour que la Vague 2 puisse découper ces composants en confiance.

---

## 2. Outillage ajouté (versions exactes)

| Outil | Version | Rôle | Emplacement |
|---|---|---|---|
| `eslint-plugin-sonarjs` | **4.0.3** (devDependency) | Mesure S3776 (complexité cognitive) + S2004 (imbrication) en `warn` | `eslint.config.js` |
| `@playwright/test` | **1.60.0** (devDependency) | Harness E2E (caractérisation des parcours) | `playwright.config.ts`, `e2e/` |

### 2.1 Configuration ESLint (complexité)

Deux règles activées dans `eslint.config.js`, **en `warn`** volontairement :

| Règle ESLint | Règle SonarLint | Seuil | Mode |
|---|---|---|---|
| `sonarjs/cognitive-complexity` | **S3776** | 15 (défaut SonarQube) | `warn` |
| `sonarjs/no-nested-functions` | **S2004** | 4 niveaux | `warn` |

Le choix de `warn` (et non `error`) est **délibéré** : l'objectif de la Vague 1 est de **MESURER**, pas de bloquer. Passer ces règles en `error` transformerait immédiatement le lint en échec (les pages n'étant pas encore refactorées) et casserait l'état « 0 erreur ESLint » acquis aux LOTs 2–3. La bascule en `error` sera envisagée en fin de Vague 2, une fois les cibles atteintes.

Les **49 fichiers shadcn/ui purs** restent exclus du scan (constante `SHADCN_PURE_FILES` partagée dans `eslint.config.js`, cf. ADR-0001) : la nouvelle règle ne les analyse pas.

**Effet sur le lint** : `npm run lint` reste à **0 erreur**. Le nombre de warnings passe de 6 à **29** (les 23 nouveaux sont les warnings de complexité/imbrication attendus — c'est précisément la métrique recherchée).

---

## 3. Baseline de complexité cognitive (reproductible)

Commande : `npx eslint .` — snapshot brut : [`complexity-baseline-lot4.txt`](./complexity-baseline-lot4.txt).

> **Nuance méthodologique importante.** SonarJS (comme SonarQube) mesure la complexité cognitive **par fonction**, et non globalement par fichier. La « complexité d'une page » retenue ci-dessous correspond donc à la **fonction la plus complexe** du fichier. Une page sans entrée S3776 a toutes ses fonctions ≤ 15 au sens de la règle, même si elle reste longue et candidate au découpage.

### 3.1 Pages cibles LOT 4

| Page | Fonction la plus complexe (ligne) | Complexité mesurée | Cible Vague 2 | Imbrication (S2004) |
|---|---|---:|---:|---|
| `src/pages/Creative.tsx` | ligne 374 | **36** | ≤ 15 | — |
| `src/pages/Creative.tsx` | ligne 536 | **25** | ≤ 15 | — |
| `src/pages/Auth.tsx` | ligne 25 (composant `Auth`) | **17** | ≤ 15 | — |
| `src/pages/ProjectDetail.tsx` | lignes 63 et 240 | **16** (×2) | ≤ 15 | 2 occ. (lignes 1105, 1170) |
| `src/pages/Admin.tsx` | — | **≤ 15** (aucun dépassement) | ≤ 15 | — |
| `src/pages/Dashboard.tsx` | — | **≤ 15** (aucun dépassement) | ≤ 15 | — |

**Lecture.**
- `Creative.tsx` est confirmée comme la page la plus critique (36, conforme à l'estimation SonarLint « ~36 »).
- `Auth.tsx` mesure **17** au sens SonarJS (l'estimation SonarLint IDE était « ~21 » ; l'écart vient des conventions de calcul/agrégation de l'IDE — la valeur reproductible fait désormais foi).
- `Admin.tsx` et `Dashboard.tsx` n'ont **aucune fonction** au-dessus de 15 : leur dette relève davantage de la **longueur** (1185 / 570 lignes) et du nombre de responsabilités que de la complexité cognitive par fonction. La Vague 2 les traitera sous l'angle découpage/extraction de composants plutôt que réduction d'un score S3776.

### 3.2 Contexte hors pages cibles (pour information)

La métrique révèle d'autres foyers de complexité (non dans le périmètre LOT 4 mais désormais visibles en CI) : `supabase/functions/*` (jusqu'à 127 sur `creative-chat`), `src/services/reseller-brochure-pdf.service.ts` (26, 18), `src/services/image-export.service.ts` (21), `src/components/admin/user-projects-dialog.tsx` (18). À arbitrer pour un futur lot.

---

## 4. Harness E2E Playwright

### 4.1 Configuration (`playwright.config.ts`)

| Paramètre | Valeur |
|---|---|
| `testDir` | `./e2e` |
| `baseURL` | `http://localhost:8080` (port réel de `vite.config.ts`), surchargeable via `E2E_BASE_URL` |
| `webServer` | `npm run dev` (démarrage auto ; non démarré si `E2E_BASE_URL` cible un déployé) |
| Reporters | `list` + `html` |
| `retries` | 2 en CI, 0 en local |
| Navigateur | Chromium (`Desktop Chrome`) |

### 4.2 Scripts npm ajoutés

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

### 4.3 Fixture d'authentification (`e2e/fixtures/auth.ts`)

Les 4 pages protégées (`ProtectedRoute` + Supabase Auth) nécessitent une session. Comme **aucun secret n'est versionné**, la fixture lit les identifiants depuis l'environnement :

- `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` — identifiants du compte de test.

Mécanisme de **skip propre** : `skipIfNoCredentials(test)` marque les tests authentifiés `SKIP` si ces variables sont absentes (la suite n'est donc **jamais rouge par défaut**). La fixture `authenticatedPage` se connecte via le formulaire `/auth` (sélecteurs stables `#login-email` / `#login-password` / bouton « Se connecter ») puis attend la redirection vers `/dashboard`.

### 4.4 `.gitignore` & CI

- `.gitignore` : exclusion des artefacts Playwright (`/test-results/`, `/playwright-report/`, `/blob-report/`, `/.playwright/`, `/playwright/.cache/`). La règle historique `/audit/` n'a pas été modifiée.
- ESLint : un bloc d'override désactive `react-hooks/rules-of-hooks` sur `e2e/**` (l'API `use()` des fixtures Playwright est confondue avec le hook React `use`). Périmètre strictement limité au dossier `e2e/`.
- CI : workflow dédié `.github/workflows/e2e.yml` ajouté, en **déclenchement manuel** (`workflow_dispatch`) afin de ne **pas** bloquer les PR tant que la Vague 2 n'est pas lancée. Il installe Chromium (`npx playwright install --with-deps chromium`) et injecte les secrets `VITE_SUPABASE_*` + `E2E_TEST_*`. Le workflow CI principal (`ci.yml`) reste inchangé.

---

## 5. E2E de caractérisation (filet anti-régression)

5 fichiers, 1 par page cible, **19 tests** au total. Sélecteurs par rôle / texte accessible (profitant du travail a11y du LOT 3 : `role="button"`, `aria-label`, headings), pas de classes CSS fragiles.

| Spec | Page | Ce qu'il caractérise | Auth requise |
|---|---|---|---|
| `e2e/auth.spec.ts` | `Auth.tsx` | En-tête, onglets Connexion/Inscription, champs des 2 formulaires, blocage email invalide (validation native), lien mentions légales, toggle afficher/masquer mot de passe | **Non** (page publique) |
| `e2e/dashboard.spec.ts` | `Dashboard.tsx` | Titre « Mes Projets », bouton « Nouveau Projet », nav (Assistant Créatif / Favoris / Déconnexion), navigation vers `/creative`, présence grille **ou** état vide | Oui |
| `e2e/creative.spec.ts` | `Creative.tsx` | En-tête « Assistant Créatif », bloc « Studio Créatif DICA », nav Retour/Accueil, zone de saisie du prompt, section « Mes créations favorites », retour dashboard | Oui |
| `e2e/project-detail.spec.ts` | `ProjectDetail.tsx` | Ouverture du 1er projet → URL `/project/:id`, titre `<h1>`, bouton Retour (skip dynamique si compte sans projet) | Oui |
| `e2e/admin.spec.ts` | `Admin.tsx` | Rendu « Administration DICA » + onglets si admin, sinon redirection `/dashboard` ; onglets de gestion (Utilisateurs, Décors, Catégories) | Oui (+ rôle admin) |

### 5.1 État d'exécution (exécuté vs écrit seulement)

| Spec | Détecté (`--list`) | Exécuté réellement | Résultat |
|---|---|---|---|
| `auth.spec.ts` (6 tests) | ✅ | ✅ **exécuté** | **6 / 6 PASS** |
| `dashboard.spec.ts` (4) | ✅ | ⏭️ SKIP | identifiants E2E absents |
| `creative.spec.ts` (5) | ✅ | ⏭️ SKIP | identifiants E2E absents |
| `project-detail.spec.ts` (2) | ✅ | ⏭️ SKIP | identifiants E2E absents |
| `admin.spec.ts` (2) | ✅ | ⏭️ SKIP | identifiants E2E absents |

Exécution complète locale (sans identifiants) : **6 passed, 13 skipped, 0 failed** — suite verte par défaut.

**Détail de ce qui a pu être vérifié dans cet environnement :**
- Navigateur Chromium installé avec succès (`npx playwright install chromium`, build v1223).
- Les 6 tests de `auth.spec.ts` ont été **réellement exécutés et passés** en démarrant `npm run dev` avec des valeurs **placeholder** pour `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (la page `/auth` ne déclenche aucun appel réseau au chargement, son rendu ne dépend pas d'un backend valide).
- Les 13 tests des pages protégées sont `SKIP` faute d'identifiants Supabase réels (`E2E_TEST_*`) et d'un backend joignable. Ils sont **écrits, valides et détectés** ; ils s'exécuteront dès que les variables d'environnement seront fournies.

---

## 6. Vérifications de non-régression

| Vérification | Commande | Attendu | Résultat |
|---|---|---|---|
| Lint | `npm run lint` | 0 erreur (warnings complexité tolérés) | **0 erreur, 29 warnings** ✅ |
| Tests unitaires | `npm run test:run` | 28 suites / 842 tests | **28 / 842 verts** ✅ |
| Types | `npx tsc --noEmit` | 0 erreur | **0 erreur** ✅ |
| Build | `npm run build` | OK | **OK** (built in ~3,7 s) ✅ |
| Détection E2E | `npx playwright test --list` | specs détectés | **19 tests / 5 fichiers** ✅ |

Aucune ligne de `src/pages/` ni de composant de production n'a été touchée.

---

## 7. Prérequis d'exécution (variables d'environnement)

| Variable | Rôle | Sans elle |
|---|---|---|
| `VITE_SUPABASE_URL` | Démarrage de l'app (boot `createClient`) | l'app ne démarre pas |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Idem | l'app ne démarre pas |
| `E2E_TEST_EMAIL` | Connexion du compte de test | specs protégés `SKIP` |
| `E2E_TEST_PASSWORD` | Idem | specs protégés `SKIP` |
| `E2E_BASE_URL` (optionnel) | Cibler un environnement déployé | défaut `http://localhost:8080` |

Aucun secret n'est versionné. Cf. `.env.example` à la racine.

---

## 8. Définition de prêt (« Definition of Ready ») pour la Vague 2

La Vague 2 peut démarrer un refacto de page dès lors que :

1. **La métrique est verte au départ** : `npm run lint` à 0 erreur, le warning S3776 de la page ciblée est listé dans `complexity-baseline-lot4.txt`.
2. **Le filet est armé** : les identifiants `E2E_TEST_*` (+ `VITE_SUPABASE_*`) sont configurés, et `npm run test:e2e` passe au VERT sur la page ciblée AVANT toute modification (capture de la baseline comportementale).
3. **Critère de sortie du refacto** : après découpage, la fonction ciblée descend **≤ 15** (le warning S3776 correspondant disparaît de la sortie `npx eslint .`) **sans** nouvelle régression : `npm run test:run` (≥ 842), `npx tsc --noEmit` (0), `npm run build` (OK) et `npm run test:e2e` (mêmes tests verts) restent stables.
4. **Pas de régression a11y** : `npm run lint` reste à 0 erreur (les règles `jsx-a11y` du LOT 3 sont toujours actives).

Une fois toutes les pages cibles ≤ 15, envisager la bascule de `sonarjs/cognitive-complexity` de `warn` à `error` pour verrouiller l'acquis (décision de fin de Vague 2).

---

## 9. Reproduire localement

```bash
# Métrique de complexité (baseline)
npx eslint .                            # 0 error, 29 warnings (dont S3776/S2004)

# Non-régression
npm run lint                            # 0 error
npm run test:run                        # 842 / 842 verts
npx tsc --noEmit                        # 0 erreur
npm run build                           # OK

# E2E
npx playwright install chromium         # 1re fois uniquement
npx playwright test --list              # 19 tests / 5 fichiers
npm run test:e2e                        # auth: PASS ; pages protégées: SKIP sans E2E_TEST_*
```

---

© DICA France — base logicielle KOREV AI.
