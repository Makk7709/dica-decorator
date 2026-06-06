# Rapport LOT 4 — Vague 2 : `src/pages/ProjectDetail.tsx`

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot / Vague | LOT 4 — Vague 2 (refacto de complexité, **page ProjectDetail uniquement**) |
| Branche de base | `audit/tier1-2026-05-07` |
| Périmètre modifié | `src/pages/ProjectDetail.tsx` + fichiers créés (sous-composants/helpers/types) + tests + rapport |
| Règles ciblées | `sonarjs/cognitive-complexity` (S3776, seuil 15) et `sonarjs/no-nested-functions` (S2004, 4 niveaux) |
| Filet anti-régression | **Tests composants Vitest + RTL avec Supabase MOCKÉ** (pas d'E2E — backend de test indisponible) |

> Aucune autre page ni aucun composant partagé existant n'a été modifié. Le comportement observable (appels Supabase/services, messages, toasts, redirections, accessibilité LOT 3) est préservé à l'identique.

---

## 1. Objectif

La Vague 1 a mesuré, de façon reproductible (`npx eslint`), deux fonctions de `ProjectDetail.tsx` à complexité cognitive **16** ainsi que **2 imbrications** signalées par `sonarjs/no-nested-functions`. La Vague 2 ramène toutes les fonctions du fichier **≤ 15** (cible ≤ 12) et supprime les imbrications S2004, **par extraction à iso-comportement**.

---

## 2. Protocole suivi (ordre imposé)

1. **Filet d'abord** — Écriture de `src/pages/__tests__/ProjectDetail.test.tsx` caractérisant le comportement ACTUEL, confirmé **VERT contre le code non refactoré** (17/17).
2. **Mesure avant** — `npx eslint src/pages/ProjectDetail.tsx` (snapshot conforme à la baseline Vague 1).
3. **Refacto par extraction** — sous-composants + helpers purs + handlers nommés (cf. §5).
4. **Mesure après** — `npx eslint src/pages/ProjectDetail.tsx` : toutes fonctions ≤ 15, 0 warning S2004.
5. **Filet resté VERT** sans modification sémantique des tests (17/17 après refacto).

---

## 3. Complexité cognitive (S3776) avant → après, par fonction

| Fonction (ligne après refacto) | Avant | Après | Statut |
|---|---:|---:|---|
| Composant `ProjectDetail` (l. 33) | **16** | **3** | ✅ résolu |
| `loadProject` (l. 193) | **16** | **6** | ✅ résolu |
| `loadUserProfile` (l. 67) | 9 | 9 | inchangé (déjà < 15) |
| `toggleFavorite` (l. 134) | 8 | 8 | inchangé |
| `handlePhotoUpload` (l. 271) | 8 | 8 | inchangé |
| `loadDecors`, `loadFavorites`, `handleGenerateRender`, `handleRegenerateRender`, `handleDeleteRender`, `handleDeletePhoto`, `handleApplyDecor`, `handleToggleSelect`, `handleOpenComparison` | — | ≤ 9 | tous < seuil |

> Les valeurs « après » des fonctions sous le seuil ont été obtenues en abaissant temporairement le seuil de la règle (`--rule '{"sonarjs/cognitive-complexity":["warn",1]}'`) ; cette modification n'est pas committée. La sortie ESLint standard ne signale **plus aucune fonction** de `ProjectDetail.tsx` pour S3776.

**Synthèse :** les deux fonctions à 16 passent à **3** et **6**. Toutes les fonctions du fichier sont désormais ≤ 9, sous la cible ≤ 12.

---

## 4. Imbrications profondes (S2004) — résolution

| # | Localisation avant (baseline) | Cause | Résolution | Statut |
|---|---|---|---|---|
| 1 | l. 1105 (callback de `setSelectedRenderIds` dans la map des rendus) | Arrow imbriquée 5 niveaux (`map` → `onClick` → updater `setState`) | Extraite dans le handler nommé `handleToggleSelect(renderId)` (composant) ; la carte de rendu vit dans `RenderCard` (profondeur réinitialisée) | ✅ supprimée |
| 2 | l. 1170 (callback `onClick` de « Comparer avant/après ») | Arrow imbriquée 5 niveaux construisant `setComparisonMode` | Extraite dans le handler nommé `handleOpenComparison(render, photo)` ; appelée via prop depuis `RenderCard` | ✅ supprimée |

`npx eslint src/pages/ProjectDetail.tsx` ne signale **plus aucun** `sonarjs/no-nested-functions` sur ce fichier.

---

## 5. Extractions réalisées (fichiers + rôle)

Tous les nouveaux fichiers sont sous `src/components/project-detail/` (sauf le test).

| Fichier créé | Rôle |
|---|---|
| `project-detail.types.ts` | Types partagés (`Project`, `ProjectPhoto`, `Decor`, `RenderResult`, `CreativeImport`, `RendersByPhoto`, `RenderResultRow`, `ComparisonState`, `RenderFormat`) extraits des interfaces inline. |
| `project-detail.helpers.ts` | Helpers **purs** : `getUseCaseLabel`, `partitionRenderResults` (répartition O(n) rendus/créations IA — cœur de la baisse de `loadProject`), `buildBrochureImages`, `buildMagazineImages` (construction des images d'export, sorties identiques + tri favoris). |
| `ProjectDetailHeader.tsx` | En-tête : navigation, partage, exports Brochure/Magazine (gros foyer de conditions JSX déplacé hors du composant principal). |
| `PhotoUploadButton.tsx` | Bouton + input fichier d'upload avec label accessible (`htmlFor` + `aria-label` du LOT 3), paramétrable (hero / état vide). |
| `EmptyPhotosState.tsx` | État vide « Aucune photo » + bouton d'upload dédié. |
| `CreativeImportsSection.tsx` | Section « Créations Assistant IA » : skeleton de chargement + grille des créations. |
| `PhotoCard.tsx` | Carte d'une photo : en-tête, image, bouton « Appliquer un décor », grille des rendus. |
| `RenderCard.tsx` | Carte d'un rendu (sélection, favoris, menu contextuel) — **isole l'élément de liste, supprimant les imbrications S2004**. |
| `ZoomDialog.tsx` | Dialogue d'agrandissement d'image. |
| `ComparisonDialog.tsx` | Dialogue de comparaison avant/après. |

Handlers nommés ajoutés dans `ProjectDetail.tsx` (aplatissement des arrows imbriquées) : `handleApplyDecor`, `handleToggleSelect`, `handleOpenComparison`.

Toutes les props des nouveaux composants sont en `Readonly<...>` (S6759) et sans `any` (LOT 2).

---

## 6. Comportement préservé (iso-comportement)

- **Appels Supabase identiques** : `projects`, `project_photos`, `render_results`, `decors`, `render_favorites`, `profiles`, `storage('project-photos')`, `functions.invoke('apply-decor')` — mêmes requêtes, mêmes ordres, même chargement parallèle (`Promise.all`) et même répartition des rendus.
- **Messages / toasts inchangés** : « Photo ajoutée… », « Ajouté/Retiré des favoris », « Supprimé ! », « Photo supprimée », « Erreur lors du chargement du projet », etc.
- **Redirections** : erreur de chargement → `navigate("/dashboard")` ; boutons Retour/Accueil inchangés.
- **Accessibilité LOT 3** : labels d'upload `htmlFor="photo-upload"` / `htmlFor="photo-upload-empty"` + `aria-label` préservés (vérifiés par tests dédiés).
- **Optimistic update** de suppression et **rollback** sur erreur conservés à l'identique.

---

## 7. Filet de tests (`src/pages/__tests__/ProjectDetail.test.tsx`)

- **17 tests**, Supabase et services **mockés** (`@/integrations/supabase/client`, `@/contexts/AuthContext`, `react-router-dom`, `sonner`, `@/lib/image-compression`, sous-composants lourds). Builder Supabase « thenable + chaînable » configurable par table.
- **VERT avant ET après** le refacto (17/17 dans les deux cas), sans modification sémantique des tests.

| Groupe | Couverture |
|---|---|
| Chargement & en-tête | titre projet, libellé cas d'usage, section « Photos du projet », tables Supabase chargées au montage |
| États | chargement (« Chargement… » créations IA), vide (« Aucune photo »), erreur (redirection `/dashboard` + toast) |
| Rendu des sections | « Créations Assistant IA » + compteur, carte photo + « Appliquer un décor » + « Rendus générés (n) » |
| Accessibilité uploads (LOT 3) | association `htmlFor` + `aria-label` des deux inputs d'upload |
| Upload | compression + upload + toast succès ; refus d'un fichier non-image |
| Favoris | ajout d'une création IA → toast « Ajouté aux favoris » |
| Suppression | création IA (optimistic + toast « Supprimé ! ») ; photo (toast « Photo supprimée ») |
| Navigation | boutons Retour et Accueil → `/dashboard` |

---

## 8. Vérifications de non-régression

| Vérification | Commande | Attendu | Résultat |
|---|---|---|---|
| Tests | `npm run test:run` | ≥ 842 + nouveaux, tous verts | **29 fichiers / 859 tests verts** (842 + 17) ✅ |
| Lint | `npm run lint` | 0 erreur ; warnings ProjectDetail disparus | **0 erreur, 24 warnings** (aucun sur ProjectDetail hors `exhaustive-deps` pré-existant) ✅ |
| Types | `npx tsc --noEmit` | 0 erreur | **0 erreur** ✅ |
| Build | `npm run build` | OK | **OK** (built in ~11 s) ✅ |
| Mesure cible | `npx eslint src/pages/ProjectDetail.tsx` | 0 S3776 + 0 S2004 sur le fichier | **0 S3776, 0 S2004** (reste 1 warning `react-hooks/exhaustive-deps` pré-existant, hors périmètre) ✅ |

Le nombre total de warnings du projet passe de **29 → 24** : les **4** warnings de `ProjectDetail.tsx` (2× S3776 + 2× S2004) sont résolus ; les warnings restants concernent d'autres pages et les `supabase/functions/*` (hors périmètre de cette vague).

---

## 9. Reproduire localement

```bash
# Mesure cible (doit ne rien signaler pour S3776/S2004 sur le fichier)
npx eslint src/pages/ProjectDetail.tsx       # seul reste exhaustive-deps (pré-existant)

# Filet
npx vitest run src/pages/__tests__/ProjectDetail.test.tsx   # 17/17

# Non-régression
npm run test:run                              # 859 verts
npm run lint                                  # 0 erreur
npx tsc --noEmit                              # 0 erreur
npm run build                                 # OK
```

---

© DICA France — base logicielle KOREV AI.
