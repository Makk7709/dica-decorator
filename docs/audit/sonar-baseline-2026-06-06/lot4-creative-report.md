# Rapport LOT 4 — Vague 2 : `Creative.tsx` (réduction de complexité cognitive)

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 4 — Réduction de complexité cognitive (S3776) / imbrication (S2004) |
| Vague | **Vague 2 — Refacto de page** (périmètre : `src/pages/Creative.tsx` uniquement) |
| Branche de base | `audit/tier1-2026-05-07` |
| Branche de travail | `lot4-creative-refacto` (worktree isolé) |
| Page cible | `src/pages/Creative.tsx` |
| Filet anti-régression | **Tests composants Vitest + RTL, Supabase mocké** (PAS d'E2E Playwright) |

> **Décision produit.** Le backend Supabase de test étant indisponible (projet en pause, aucune clé), le filet anti-régression de cette page est constitué de **tests composants** (React Testing Library) avec Supabase intégralement **mocké**, et non d'E2E Playwright. Aucun appel réseau réel n'est effectué.

---

## 1. Objectif

Faire descendre la complexité cognitive (SonarJS **S3776**, seuil 15) des fonctions de `Creative.tsx` **sous le seuil** (cible ≤ 12), résorber toute imbrication **S2004**, **sans modifier le comportement observable** : appels Supabase/services, messages utilisateur, toasts, redirections et accessibilité du LOT 3 (`role="button"`, `aria-label`, `onKeyDown` via `onActivateKeyDown`, labels associés) strictement préservés.

Conformément à la consigne, **seuls** `src/pages/Creative.tsx` et des **fichiers créés** (helpers / sous-composants / types dédiés) + le fichier de test ont été modifiés. **Aucune page ni aucun composant partagé existant n'a été touché.**

---

## 2. Complexité cognitive : avant → après

Mesure : `npx eslint src/pages/Creative.tsx` (règle `sonarjs/cognitive-complexity`, seuil 15).

### 2.1 Avant refacto (baseline)

| Fonction (ligne) | Rôle | Complexité mesurée | Verdict |
|---|---|---:|---|
| `streamChat` (l. 374) | Envoi prompt + parsing réponse IA (JSON image/texte) + lecture du flux SSE | **36** | ❌ > 15 |
| `saveImageToProject` (l. 536) | Sauvegarde de l'image générée dans un projet (création projet, upload Storage, photo, render) | **25** | ❌ > 15 |

Snapshot brut :

```
src/pages/Creative.tsx
  374:82  warning  Refactor this function to reduce its Cognitive Complexity from 36 to the 15 allowed  sonarjs/cognitive-complexity
  536:39  warning  Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed  sonarjs/cognitive-complexity

✖ 2 problems (0 errors, 2 warnings)
```

### 2.2 Après refacto

| Fonction | Complexité | Verdict |
|---|---:|---|
| `streamChat` (orchestrateur, composant) | **≤ 15** (≈ 3) | ✅ |
| `saveImageToProject` (orchestrateur, composant) | **≤ 15** (≈ 7) | ✅ |
| Helpers extraits (`creative-chat.ts`, `creative-storage.ts`) | tous **≤ 15** (max ≈ 12 sur `drainSseBuffer`) | ✅ |

Snapshot brut après refacto :

```
$ npx eslint src/pages/Creative.tsx
(aucune sortie — 0 problème)
```

> Les valeurs « après » des orchestrateurs sont notées comme estimations : SonarJS ne rapporte une mesure chiffrée **que** lorsque le seuil est dépassé. La preuve opposable est la **disparition totale** des deux warnings S3776 sur le fichier : toutes les fonctions de `Creative.tsx` sont désormais ≤ 15.

- **Warnings S3776 sur `Creative.tsx`** : 2 → **0** ✅
- **Warnings S2004 (`no-nested-functions`) sur `Creative.tsx`** : 0 → **0** ✅ (aucune imbrication introduite ; le découpage maintient ≤ 3 niveaux)
- **Taille du fichier** : 1374 → **898 lignes** (-35 %).

---

## 3. Refacto par extraction (iso-comportement)

Stratégie : extraire la **logique** (protocole de chat, persistance) dans des helpers purs/I-O, et la **présentation** répétée (bulle de message, carte favori) dans des sous-composants. Les orchestrateurs restants dans le composant se contentent de séquencer ces briques.

### 3.1 Fichiers créés

| Fichier | Lignes | Rôle |
|---|---:|---|
| `src/components/creative/types.ts` | 50 | Types partagés (`Message`, `Decor`, `Favorite`, `Project`, `UploadedImage`, `DecorReference`) extraits pour éviter toute dépendance circulaire entre page, helpers et sous-composants. |
| `src/lib/creative-chat.ts` | 257 | Protocole de chat **sans React** : `buildDecorContext` (contexte catalogue), `sendCreativeChatRequest` (build requête + `fetch` + erreurs 429/402), `parseJsonChatResponse` (image/texte/erreur), `streamAssistantText` + helpers internes `classifySseLine` / `extractDeltaContent` / `drainSseBuffer` (lecture fidèle du flux SSE). Absorbe l'essentiel de la complexité de `streamChat`. |
| `src/lib/creative-storage.ts` | 140 | Persistance : `dataUrlToBlob` (conversion base64), `uploadCreativeImageToStorage` (upload Storage ou URL directe, **même imbrication d'erreurs** que l'original), `createCreativeProject`, `ensureProjectPhoto`, `saveCreativeRenderResult`. Absorbe la complexité de `saveImageToProject`. |
| `src/components/creative/CreativeMessage.tsx` | 156 | Sous-composant de présentation : une bulle de message (texte/image, overlay zoom, export, références DICA, bouton favori). Balisage **repris à l'identique** ; actions remontées par callbacks (`onZoom`, `onSaveToProject`, `onSaveFavorite`). Props `Readonly<>` (S6759). |
| `src/components/creative/FavoriteCard.tsx` | 112 | Sous-composant de présentation : une carte de favori (image + badge + overlay, infos, suppression). Balisage **repris à l'identique** ; callbacks `onZoom`, `onDelete`. Props `Readonly<>`. |
| `src/pages/__tests__/Creative.test.tsx` | 446 | Filet de tests composants (cf. §4). |

### 3.2 Fichier modifié

- `src/pages/Creative.tsx` : imports remis à plat (types/helpers/sous-composants), suppression de `buildDecorContext`, réécriture des orchestrateurs `streamChat` et `saveImageToProject`, remplacement des deux boucles JSX (`messages.map`, `favorites.map`) par `<CreativeMessage>` / `<FavoriteCard>`.

### 3.3 Comportement strictement préservé

- **Appels Supabase identiques** : mêmes tables (`creative_favorites`, `projects`, `decors`, `project_photos`, `render_results`), mêmes colonnes, mêmes opérations (`select/insert/eq/order/limit/single`), mêmes appels `storage.upload` / `getPublicUrl` et `auth.getSession`.
- **Messages & toasts identiques** : « Favori enregistré ! », « Favori supprimé », « ✅ Image ajoutée… », « Veuillez sélectionner ou créer un projet », « Échec de la connexion au service IA », « Réponse inattendue du service IA », « Session expirée… », « Erreur de conversion d'image: … » (imbrication `Erreur upload: …` conservée), etc.
- **Accessibilité LOT 3 préservée** : `role="button"` + `tabIndex={0}` + `aria-label` + `onKeyDown={(e) => onActivateKeyDown(e, …)}` repris tels quels dans `CreativeMessage` et `FavoriteCard` ; labels `htmlFor`/`id` des dialogues inchangés.
- **Pas de `any`** (LOT 2) ; **props `Readonly<>`** au site d'usage des sous-composants (S6759).

> **Note de transparence.** Les `console.log` de **debug** verbeux de `saveImageToProject` (traces pas-à-pas) ont été retirés ; les `console.error` de **gestion d'erreur** sont conservés (déplacés dans les helpers). Ces journaux ne font pas partie du comportement observable par l'utilisateur (aucun toast/UI/appel réseau impacté). Le filet de tests confirme l'invariance.

---

## 4. Filet anti-régression (tests composants)

Fichier : `src/pages/__tests__/Creative.test.tsx` — **18 tests**, tous verts **avant** ET **après** refacto.

### 4.1 Conventions réutilisées du repo

- `render` custom via `@/test/test-utils` (QueryClient + Router + providers).
- Mock de `@/integrations/supabase/client` (builder « thenable » configurable par table, `auth`, `storage`) — aligné sur les patterns de `src/services/__tests__/*`.
- Mock de `@/contexts/AuthContext` (`useAuth` → utilisateur **stable**), `react-router-dom` (`useNavigate`), `sonner` (`toast`), et `@/components/ui/theme-toggle` (dépend d'un `ThemeProvider` hors périmètre). `scrollIntoView` stubé (non implémenté par jsdom).

### 4.2 Couverture

| Bloc | Ce qui est caractérisé |
|---|---|
| Rendu des sections clés | En-tête « Assistant Créatif », « Studio Créatif DICA », onglets, zone de saisie, bloc astuces, message de bienvenue |
| État du catalogue | Compteur « N disponibles » (succès), « Indisponible » + toast (erreur), message catalogue vide |
| Envoi de prompt | Affichage message utilisateur + **visualisation image** (+ références DICA), **réponse texte**, **toast d'erreur** service IA, envoi via touche **Entrée** |
| Dialogues | Ouverture du dialogue **favori**, ouverture du dialogue **projet**, **zoom** image plein écran |
| Onglet Favoris | État vide, **liste** + **suppression**, **compteur** dans l'onglet |
| Sauvegarde favori | Insert mocké + **toast de succès** |
| Upload image source | Ajout d'une image étiquetée + toast |

### 4.3 Validité du filet

- **Avant refacto** (code monolithique) : `18 passed` ✅ — le filet est donc un témoin valide du comportement initial.
- **Après refacto** : `18 passed` ✅ — **sans aucune modification sémantique** des tests. Le comportement observable est inchangé.

---

## 5. Vérifications de non-régression

| Vérification | Commande | Attendu | Résultat |
|---|---|---|---|
| Tests unitaires/composants | `npm run test:run` | ≥ 842 + nouveaux, 0 échec | **860 / 860 verts** (29 fichiers) ✅ |
| Lint | `npm run lint` | 0 erreur ; warnings Creative.tsx disparus | **0 erreur, 26 warnings** (aucun sur `Creative.tsx`) ✅ |
| Types | `npx tsc --noEmit` | 0 erreur | **0 erreur** ✅ |
| Build | `npm run build` | OK | **OK** (built in ~10 s) ✅ |

- `test:run` : **842 (baseline) + 18 (nouveaux) = 860**.
- `lint` : les **2 warnings S3776 de `Creative.tsx` ont disparu**. Les 26 warnings restants concernent d'**autres** fichiers hors périmètre (edge functions `supabase/functions/*`, services PDF/export, `user-projects-dialog.tsx`, tests `favorites.service`, `react-refresh`), conformément à la consigne.

---

## 6. Reproduire localement

```bash
# Complexité de la page cible
npx eslint src/pages/Creative.tsx        # 0 problème (avant : 2 warnings S3776 36 & 25)

# Filet de tests de la page
npx vitest run src/pages/__tests__/Creative.test.tsx   # 18 passed

# Non-régression
npm run test:run                         # 860 / 860 verts
npm run lint                             # 0 erreur
npx tsc --noEmit                         # 0 erreur
npm run build                            # OK
```

---

## 7. Blocages

Aucun. Aucun fichier partagé existant n'a dû être modifié ; le périmètre (page cible + fichiers créés + test) a été respecté.

---

© DICA France — base logicielle KOREV AI.
