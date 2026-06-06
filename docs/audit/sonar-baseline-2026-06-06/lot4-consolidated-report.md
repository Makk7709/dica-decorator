# Rapport LOT 4 — Consolidation (3 pages refactorées, complexité cognitive < 15)

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 4 — Réduction de complexité cognitive (S3776) / imbrication (S2004) |
| Vague | **Vague 3 — Consolidation** (merge des 3 refactos + vérification d'autorité sur l'arbre fusionné) |
| Branche | `audit/tier1-2026-05-07` |
| Outil de mesure | `eslint-plugin-sonarjs@4.0.3` — `sonarjs/cognitive-complexity` (seuil 15), `sonarjs/no-nested-functions` (seuil 4), en `warn` (cf. `eslint.config.js`) |
| Rapports détaillés | [`lot4-foundation-report.md`](./lot4-foundation-report.md), [`lot4-auth-report.md`](./lot4-auth-report.md), [`lot4-projectdetail-report.md`](./lot4-projectdetail-report.md), [`lot4-creative-report.md`](./lot4-creative-report.md) |

> Cette vague ne refactore rien : elle **fusionne** les 3 refactos de page menés en Vague 2 (Auth déjà sur `origin`, ProjectDetail et Creative depuis leurs branches locales) puis **rejoue l'ensemble des vérifications sur l'arbre fusionné**, qui fait désormais autorité.

---

## 1. Périmètre LOT 4 et décisions structurantes

### 1.1 Pages refactorées vs pages exclues

Le LOT 4 a ciblé les pages monolithiques dont la métrique reproductible (Vague 1) signalait au moins une fonction au-dessus du seuil de complexité cognitive **15** (S3776) ou une imbrication **S2004** :

| Page | Verdict baseline (Vague 1) | Décision |
|---|---|---|
| `src/pages/Creative.tsx` | 2 fonctions à **36** et **25** | **Refactorée** (Vague 2) |
| `src/pages/Auth.tsx` | 1 composant à **17** | **Refactorée** (Vague 2) |
| `src/pages/ProjectDetail.tsx` | 2 fonctions à **16** + 2 imbrications S2004 | **Refactorée** (Vague 2) |
| `src/pages/Admin.tsx` | **≤ 15** (aucun dépassement mesuré) | **HORS périmètre** — non touchée |
| `src/pages/Dashboard.tsx` | **≤ 15** (aucun dépassement mesuré) | **HORS périmètre** — non touchée |

> **Décision d'exclusion d'Admin/Dashboard.** La métrique S3776 ne signale **aucune** fonction au-dessus de 15 sur ces deux pages. Leur dette relève de la **longueur** (1185 / 570 lignes) et du nombre de responsabilités, pas de la complexité cognitive par fonction. Les toucher aurait élargi le périmètre sans cible mesurable à résorber ; elles n'ont donc **pas** été modifiées en LOT 4.

### 1.2 Décision sur le filet anti-régression

| Page | Type de filet | Justification |
|---|---|---|
| `Auth.tsx` | **E2E Playwright** (`e2e/auth.spec.ts`, 6 tests) | La page `/auth` est **publique** : son rendu ne dépend d'aucun backend, l'E2E s'exécute avec des valeurs **placeholder** pour `VITE_SUPABASE_*`. |
| `ProjectDetail.tsx` | **Vitest + RTL, Supabase mocké** (17 tests) | Pages protégées (`ProtectedRoute` + Supabase Auth) : **aucun backend de test joignable** (projet en pause, pas de clé `E2E_TEST_*`). L'E2E correspondant reste `SKIP`. |
| `Creative.tsx` | **Vitest + RTL, Supabase mocké** (18 tests) | Idem : faute de backend de test, le filet est constitué de tests composants avec Supabase **intégralement mocké** (aucun appel réseau réel). |

> **Décision produit.** Pour les deux pages protégées, le filet Vitest+RTL (Supabase mocké) a été retenu **faute de backend de test disponible**. Il a été confirmé **VERT contre le code non refactoré** avant chaque refacto, garantissant qu'il caractérise bien le comportement initial.

---

## 2. Résultat des merges

Les modifications portent sur des fichiers **disjoints** (pages distinctes, dossiers d'extraction distincts, fichiers de rapport distincts). Les deux merges se sont déroulés **sans aucun conflit**.

| Ordre | Branche fusionnée | Commit source | Stratégie | Conflit |
|---|---|---|---|---|
| 1 | `lot4/projectdetail-projdetail-cadc56f0` | `e50df8d` | `ort` (merge `--no-ff`) | **Aucun** |
| 2 | `lot4-creative-refacto` | `6ca10da` | `ort` (merge `--no-ff`) | **Aucun** |

- **Auth** était déjà mergé/poussé sur `origin/audit/tier1-2026-05-07` (commit `6f07714`) ; il a servi de base.
- **Dépendances inchangées** : `git diff` ne montre **aucune** modification de `package.json` ni de `package-lock.json` sur les deux merges (les workers ont fait `npm ci` sans ajouter de dépendances). Aucun conflit de lock possible.

---

## 3. Récapitulatif par page (avant → après)

| Page | Complexité avant | Complexité après | S2004 avant → après | Filet (nb tests) | Commit source |
|---|---|---|---|---|---|
| `Auth.tsx` | 1 fonction à **17** | shell à **2**, extractions ≤ **4** | 0 → 0 | E2E Playwright (**6**) | `6f07714` |
| `ProjectDetail.tsx` | 2 fonctions à **16** | **3** et **6**, toutes fonctions ≤ 9 | **2 → 0** | Vitest+RTL (**17**) | `e50df8d` |
| `Creative.tsx` | **36** et **25** | les 2 orchestrateurs **≤ 15** (≈ 3 et ≈ 7) | 0 → 0 | Vitest+RTL (**18**) | `6ca10da` |

**Bilan complexité** : toutes les fonctions des 3 pages cibles sont désormais **≤ 15** (la plus haute du périmètre, `loadProject` de ProjectDetail, est à **6**). Les **2 imbrications S2004** de ProjectDetail sont supprimées. **+41 tests** de filet ajoutés au total (6 E2E + 17 + 18 Vitest).

---

## 4. Vérifications sur l'arbre fusionné (autorité finale)

Toutes les commandes ci-dessous ont été exécutées sur la branche `audit/tier1-2026-05-07` **après** les deux merges.

| Vérification | Commande | Attendu | Résultat mesuré |
|---|---|---|---|
| Lint | `npm run lint` | 0 erreur | **0 erreur, 22 warnings** ✅ |
| Complexité pages cibles | `npx eslint src/pages/Auth.tsx src/pages/Creative.tsx src/pages/ProjectDetail.tsx` | 0 S3776 / 0 S2004 sur les 3 pages | **0 S3776, 0 S2004** (reste 1 `react-hooks/exhaustive-deps` pré-existant sur ProjectDetail) ✅ |
| Tests Vitest | `npm run test:run` | 877 (842 + 17 + 18) | **30 fichiers / 877 tests verts** ✅ |
| Types | `npx tsc --noEmit` | 0 erreur | **0 erreur** ✅ |
| Build | `npm run build` | OK | **OK** (built in ~3,7 s) ✅ |
| E2E (filet Auth) | `npx playwright test e2e/auth.spec.ts` | 6 / 6 | **6 / 6 PASS** (avec `VITE_SUPABASE_*` placeholder) ✅ |

### 4.1 Détail lint — 0 complexité résiduelle sur les 3 pages

`npm run lint` → **0 erreur, 22 warnings**. **Aucun** des 22 warnings ne porte sur la complexité ou l'imbrication des 3 pages cibles. Les warnings restants sont **tous hors périmètre LOT 4** :

| Origine des 22 warnings | Type |
|---|---|
| `supabase/functions/*` (apply-decor, creative-chat, orchestrator, generate-magazine-captions, get-analytics, get-users-admin) | `sonarjs/cognitive-complexity` (edge functions Deno, hors périmètre) |
| `src/services/reseller-brochure-pdf.service.ts`, `src/services/image-export.service.ts` | `sonarjs/cognitive-complexity` (services, hors périmètre) |
| `src/services/__tests__/favorites.service.test.ts` | `sonarjs/no-nested-functions` (fichier de test) |
| `src/test/test-utils.tsx` | `react-refresh/only-export-components` (structurel) |
| `src/pages/ProjectDetail.tsx` (l. 65) | `react-hooks/exhaustive-deps` (**pré-existant**, hors S3776/S2004) |

> Le seul warning portant sur une page cible est un `react-hooks/exhaustive-deps` **pré-existant** (déjà présent avant LOT 4, documenté dès le LOT 3). Il ne relève **ni** de `sonarjs/cognitive-complexity` **ni** de `sonarjs/no-nested-functions`.

### 4.2 Détail tests Vitest

```
Test Files  30 passed (30)
     Tests  877 passed (877)
```

Décomposition : **842** (baseline LOT 0→3) **+ 17** (ProjectDetail) **+ 18** (Creative) = **877**. Les 6 E2E Auth sont comptabilisés séparément (suite Playwright).

### 4.3 Détail E2E Auth

```
Running 6 tests using 6 workers
  ✓ affiche le formulaire de connexion par défaut
  ✓ affiche l'en-tête et les deux onglets Connexion / Inscription
  ✓ expose le lien vers les mentions légales
  ✓ bouton afficher/masquer le mot de passe sur le champ connexion
  ✓ bascule vers l'onglet Inscription et révèle ses champs
  ✓ bloque la soumission d'un email invalide (validation native + reste sur /auth)
  6 passed (2.1s)
```

> **Note d'environnement.** Sans variables Vite, l'app plante au boot (`createClient`) et l'E2E échoue (6/6 par timeout de locator). En injectant des valeurs **placeholder** pour `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (la page `/auth` est publique, aucun appel réseau au chargement), les **6 tests passent**. Aucun secret n'est versionné.

---

## 5. Trajectoire qualité cumulée LOT 0 → LOT 4 (chiffres réels)

| Indicateur | Baseline (LOT 0) | Après LOT 1 | Après LOT 2 | Après LOT 3 | **Après LOT 4** |
|---|---:|---:|---:|---:|---:|
| Problèmes ESLint | 161 | 161 | 13 | 6 | **22** |
| Erreurs ESLint | 148 | 148 | 0 | 0 | **0** |
| Warnings ESLint | 13 | 13 | 13 | 6 | **22** |
| Test Files Vitest | 28 | 28 | 28 | 28 | **30** |
| Tests Vitest | 842 | 842 | 842 | 842 | **877** |
| `tsc --noEmit` | — | OK | OK | OK | **0 erreur** |
| Build Vite production | — | OK | OK | OK | **OK** |
| Issues a11y mesurables ESLint | n/a\* | n/a\* | 28\*\* | 0 | **0** |
| Plugin a11y intégré au lint (jsx-a11y) | Non | Non | Non | **Oui** | **Oui** |
| Métrique complexité intégrée au lint (sonarjs S3776/S2004) | Non | Non | Non | Non | **Oui** |
| Warnings S3776/S2004 sur les pages cibles | — | — | — | — | **0** |

\* `eslint-plugin-jsx-a11y` n'était pas installé avant le LOT 3.
\*\* Mesure rétroactive après installation du plugin (snapshot `lint-after-lot2-pre-lot3.txt`).

> **Lecture de la hausse 6 → 22 warnings.** Elle est **volontaire et attendue** : le LOT 4 vague 1 a **activé** les règles `sonarjs/cognitive-complexity` et `sonarjs/no-nested-functions` (en `warn`), faisant remonter **23** nouveaux warnings (le lint passe de 6 à 29). Les refactos des 3 pages cibles en ont résorbé **7** (1 Auth + 4 ProjectDetail + 2 Creative), ramenant le total à **22**. Ces 22 warnings résiduels sont des foyers de complexité **hors périmètre LOT 4** (edge functions Supabase, services PDF/export), désormais **visibles en CI** pour un futur lot. Les acquis « 0 erreur ESLint » (LOT 2) et « 0 issue a11y » (LOT 3) sont **préservés**.

---

## 6. Nouveaux fichiers d'extraction par page

### 6.1 `Auth.tsx` (commit `6f07714`)

| Fichier | Rôle |
|---|---|
| `src/lib/auth-validation.ts` | Helpers de validation purs (schémas Zod, `checkEmail`, `checkPassword`, `isValidEmail`, `firstZodMessage`). |
| `src/components/auth/AuthSubmitButton.tsx` | Bouton de soumission avec état de chargement. |
| `src/components/auth/PasswordField.tsx` | Champ mot de passe + bouton afficher/masquer. |
| `src/components/auth/LoginForm.tsx` | Formulaire de connexion + « Mot de passe oublié ? ». |
| `src/components/auth/SignupForm.tsx` | Formulaire d'inscription. |
| `src/components/auth/PasswordRecoveryForm.tsx` | Formulaire de nouveau mot de passe (mode récupération). |

### 6.2 `ProjectDetail.tsx` (commit `e50df8d`)

| Fichier | Rôle |
|---|---|
| `src/components/project-detail/project-detail.types.ts` | Types partagés (Project, ProjectPhoto, Decor, RenderResult, etc.). |
| `src/components/project-detail/project-detail.helpers.ts` | Helpers purs (`partitionRenderResults`, `buildBrochureImages`, `buildMagazineImages`, `getUseCaseLabel`). |
| `src/components/project-detail/ProjectDetailHeader.tsx` | En-tête : navigation, partage, exports Brochure/Magazine. |
| `src/components/project-detail/PhotoUploadButton.tsx` | Bouton + input d'upload (label accessible). |
| `src/components/project-detail/EmptyPhotosState.tsx` | État vide « Aucune photo ». |
| `src/components/project-detail/CreativeImportsSection.tsx` | Section « Créations Assistant IA ». |
| `src/components/project-detail/PhotoCard.tsx` | Carte d'une photo + ses rendus. |
| `src/components/project-detail/RenderCard.tsx` | Carte d'un rendu (isole l'élément de liste → supprime les S2004). |
| `src/components/project-detail/ZoomDialog.tsx` | Dialogue d'agrandissement. |
| `src/components/project-detail/ComparisonDialog.tsx` | Dialogue de comparaison avant/après. |

### 6.3 `Creative.tsx` (commit `6ca10da`)

| Fichier | Rôle |
|---|---|
| `src/components/creative/types.ts` | Types partagés (Message, Decor, Favorite, Project, UploadedImage, DecorReference). |
| `src/lib/creative-chat.ts` | Protocole de chat sans React (`sendCreativeChatRequest`, `parseJsonChatResponse`, `streamAssistantText`, lecture SSE). |
| `src/lib/creative-storage.ts` | Persistance (`dataUrlToBlob`, `uploadCreativeImageToStorage`, `createCreativeProject`, `ensureProjectPhoto`, `saveCreativeRenderResult`). |
| `src/components/creative/CreativeMessage.tsx` | Bulle de message (texte/image, zoom, export, favori). |
| `src/components/creative/FavoriteCard.tsx` | Carte de favori. |

### 6.4 Fichiers de tests ajoutés

- `src/pages/__tests__/ProjectDetail.test.tsx` (17 tests, Supabase mocké).
- `src/pages/__tests__/Creative.test.tsx` (18 tests, Supabase mocké).
- `e2e/auth.spec.ts` (6 tests E2E — posé en Vague 1, vert sur Auth refactorée).

---

## 7. Reproduire localement

```bash
# Mesure de complexité sur les 3 pages cibles (doit ne rien signaler en S3776/S2004)
npx eslint src/pages/Auth.tsx src/pages/Creative.tsx src/pages/ProjectDetail.tsx

# Non-régression complète
npm run lint                            # 0 erreur, 22 warnings (tous hors périmètre LOT 4)
npm run test:run                        # 30 fichiers / 877 tests verts
npx tsc --noEmit                        # 0 erreur
npm run build                           # OK

# Filet E2E de la page Auth (page publique)
VITE_SUPABASE_URL="https://placeholder.supabase.co" \
VITE_SUPABASE_PUBLISHABLE_KEY="placeholder-anon-key" \
npx playwright test e2e/auth.spec.ts    # 6 passed
```

---

## 8. Bilan

Le LOT 4 ramène les **3 pages les plus complexes** de l'application sous le seuil de complexité cognitive **15** :

- `Creative.tsx` : **36** et **25** → orchestrateurs **≤ 15**.
- `Auth.tsx` : **17** → shell à **2**, extractions ≤ **4**.
- `ProjectDetail.tsx` : **16** (×2) → **3** et **6**, **2 imbrications S2004 supprimées**.

L'ensemble est consolidé sur `audit/tier1-2026-05-07` **sans conflit**, avec une métrique de complexité désormais **mesurable en CI** (acquis pérennisé, à l'image de l'a11y du LOT 3). Vérifications finales sur l'arbre fusionné : **0 erreur ESLint**, **0 warning S3776/S2004 sur les pages cibles**, **877 tests Vitest verts**, **0 erreur TypeScript**, **build OK** et **6/6 E2E Auth**. Aucune régression introduite.

---

© DICA France — base logicielle KOREV AI.
