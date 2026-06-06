# Rapport LOT 4 — Vague 2 : Réduction de complexité cognitive de `Auth.tsx`

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 4 — Réduction de complexité cognitive (S3776) / imbrication (S2004) |
| Vague | **Vague 2 — Refacto de page (périmètre : `src/pages/Auth.tsx` uniquement)** |
| Branche | `audit/tier1-2026-05-07` |
| Outil de mesure | `eslint-plugin-sonarjs@4.0.3` — `sonarjs/cognitive-complexity` (seuil 15), `sonarjs/no-nested-functions` (seuil 4) |
| Commande de mesure | `npx eslint src/pages/Auth.tsx` |

> Objectif : faire passer la (les) fonction(s) de `Auth.tsx` **sous le seuil de 15** (cible confortable ≤ 12) et résorber toute imbrication `no-nested-functions`, **sans changer le comportement observable** (mêmes flux d'auth, messages, redirections, appels Supabase et toasts). Refacto par **extraction** à iso-comportement.

---

## 1. Mesure AVANT (baseline reproductible)

`npx eslint src/pages/Auth.tsx` (seuil 15) — **1 warning** :

```
src/pages/Auth.tsx
  25:17  warning  Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed  sonarjs/cognitive-complexity
```

Détail **par fonction** (mesure forcée au seuil 0 : `--rule '{"sonarjs/cognitive-complexity":["warn",0]}'`) :

| Fonction | Ligne | Complexité cognitive | État |
|---|---:|---:|---|
| `Auth` (composant) | 25 | **17** | ❌ > 15 |
| `useEffect` (redirection) | 37 | 2 | ✅ |
| `handleForgotPassword` | 44 | 4 | ✅ |
| `handleUpdatePassword` | 70 | 6 | ✅ |
| `handleLogin` | 100 | 5 | ✅ |
| `handleSignup` | 129 | 10 | ✅ |

> **Lecture.** `eslint-plugin-sonarjs` mesure chaque fonction **individuellement** (les handlers imbriqués sont comptés séparément, pas agrégés dans le composant). Les **17** du composant `Auth` provenaient donc de **son propre corps de rendu** : la cascade de ternaires JSX (`isPasswordRecovery ? … : …`, puis `isLoading ? … : …` ×3 et `showLoginPassword/showSignupPassword ? <EyeOff/> : <Eye/>`), dont l'imbrication fait grimper le score. La complexité ne venait **pas** de la logique métier des handlers (déjà ≤ 10 chacun), mais de la **densité conditionnelle du JSX** d'un composant unique de 396 lignes portant 3 formulaires.

Aucune occurrence `sonarjs/no-nested-functions` sur `Auth.tsx` (ni avant, ni après).

---

## 2. Stratégie de refacto : extraction à iso-comportement

Le composant monolithique a été scindé selon ses **3 responsabilités de présentation** (connexion, inscription, récupération de mot de passe), la **logique de validation** étant isolée en helpers purs. Aucune logique métier modifiée : mêmes messages, mêmes appels Supabase, mêmes redirections, mêmes durées de toast.

### 2.1 Fichiers créés

| Fichier | Rôle | Contenu extrait |
|---|---|---|
| `src/lib/auth-validation.ts` | **Helpers de validation purs** (sans React) | Schémas `emailSchema`/`passwordSchema` (déplacés à l'identique), `firstZodMessage` (reproduit `error.errors[0]?.message \|\| fallback`), `checkEmail`, `checkPassword` (renvoient `null` ou le message), `isValidEmail` (booléen). |
| `src/components/auth/AuthSubmitButton.tsx` | Bouton de soumission avec état de chargement | Le ternaire `isLoading ? (<Loader2/>…) : label`, répété 3× à l'identique. |
| `src/components/auth/PasswordField.tsx` | Champ mot de passe avec bouton afficher/masquer | Le wrapper relatif `pr-10` + bouton œil + ternaire d'icône `Eye`/`EyeOff`, mutualisé entre connexion et inscription. |
| `src/components/auth/LoginForm.tsx` | Formulaire de connexion + parcours « Mot de passe oublié ? » | `loginData`, `showLoginPassword`, `isLoading`, `handleLogin`, `handleForgotPassword`. |
| `src/components/auth/SignupForm.tsx` | Formulaire d'inscription | `signupData`, `showSignupPassword`, `isLoading`, `handleSignup`. |
| `src/components/auth/PasswordRecoveryForm.tsx` | Formulaire de nouveau mot de passe (mode récupération) | `newPassword`, `confirmNewPassword`, `isLoading`, `handleUpdatePassword`. |

### 2.2 Fichier modifié

| Fichier | Avant | Après |
|---|---|---|
| `src/pages/Auth.tsx` | 420 lignes, 1 composant portant 3 formulaires + 4 handlers + 2 schémas | **Shell léger** (~95 lignes) : `useEffect` de redirection + layout (en-tête, onglets, pied de page) + aiguillage `isPasswordRecovery ? <PasswordRecoveryForm/> : <Tabs>` rendant `<LoginForm/>` et `<SignupForm/>`. |

### 2.3 Acquis des LOTs précédents respectés

- **LOT 2 (zéro `any`)** : aucun `any` introduit ; les `catch (error: unknown)` sont conservés et le mapping d'erreur Zod passe par `firstZodMessage(error: unknown, …)`.
- **LOT 1 / S6759 (`Readonly<>`)** : les props des sous-composants (`AuthSubmitButton`, `PasswordField`) sont typées `Readonly<…>` au site d'usage, conformément à la convention du dépôt.
- **LOT 3 (a11y)** : `htmlFor`/`id` préservés sur tous les labels, `type` explicite sur tous les boutons (`type="submit"` / `type="button"`), ids stables (`#login-email`, `#login-password`, `#signup-email`, `#signup-password`, `#signup-confirm`, `#new-password`, `#confirm-new-password`) inchangés. Le helper `onActivateKeyDown` n'était pas pertinent ici (aucun élément non natif rendu interactif : tous les contrôles sont des `<button>`/`<input>` natifs).

> **Aucun fichier partagé existant n'a été modifié.** Le périmètre se limite à `Auth.tsx` et aux fichiers d'extraction nouvellement créés.

---

## 3. Mesure APRÈS

`npx eslint src/pages/Auth.tsx src/components/auth/ src/lib/auth-validation.ts` (seuil 15) → **0 warning**.

Détail **par fonction** (mesure forcée au seuil 0) :

| Fichier | Fonction | Ligne | Complexité | État |
|---|---|---:|---:|---|
| `src/pages/Auth.tsx` | `Auth` (composant) | 12 | **1** | ✅ |
| `src/pages/Auth.tsx` | `useEffect` | 16 | 2 | ✅ |
| `src/components/auth/LoginForm.tsx` | `handleForgotPassword` | 26 | 4 | ✅ |
| `src/components/auth/LoginForm.tsx` | `handleLogin` | 50 | 2 | ✅ |
| `src/components/auth/SignupForm.tsx` | `SignupForm` (composant) | 20 | 1 | ✅ |
| `src/components/auth/SignupForm.tsx` | `handleSignup` | 26 | 4 | ✅ |
| `src/components/auth/PasswordRecoveryForm.tsx` | `handleUpdatePassword` | 25 | 4 | ✅ |
| `src/components/auth/PasswordField.tsx` | `PasswordField` (composant) | 36 | 3 | ✅ |
| `src/components/auth/AuthSubmitButton.tsx` | `AuthSubmitButton` (composant) | 21 | 1 | ✅ |
| `src/lib/auth-validation.ts` | `firstZodMessage` / `checkEmail` / `checkPassword` / `isValidEmail` | 32/43/57/70 | 1 chacune | ✅ |

### 3.1 Avant → après (synthèse)

| Indicateur | Avant | Après | Δ |
|---|---:|---:|---:|
| Complexité de la fonction la plus complexe de `Auth.tsx` | **17** | **2** (`useEffect`) | **−15** |
| Complexité du composant `Auth` | 17 | **1** | −16 |
| Fonction la plus complexe **tout périmètre Auth confondu** (page + extractions) | 17 | **4** | −13 |
| Warnings `sonarjs/cognitive-complexity` sur `Auth.tsx` | 1 | **0** | −1 |
| Warnings `sonarjs/no-nested-functions` sur `Auth.tsx` | 0 | **0** | 0 |

Marge confortable atteinte : **toutes** les fonctions du périmètre Auth sont **≤ 4**, très en deçà de la cible ≤ 12 et du seuil de 15. La réduction de `handleSignup` (10 → 4), `handleUpdatePassword` (6 → 4) et `handleLogin` (5 → 2) provient du déport des blocs `try/catch` de validation Zod vers les helpers purs `checkEmail`/`checkPassword`.

---

## 4. Comportement préservé (iso-fonctionnel)

Chaque flux a été reporté **à l'identique** (mêmes chaînes, mêmes ordres de vérification, mêmes effets) :

| Flux | Garanties préservées |
|---|---|
| **Connexion** (`handleLogin`) | Validation email → toast `"Email ou mot de passe incorrect"` en cas d'échec, `"Connexion réussie !"` puis `navigate("/dashboard")` en cas de succès, `isLoading` autour de l'appel `signIn`. |
| **Mot de passe oublié** (`handleForgotPassword`) | `"Veuillez d'abord saisir votre email"` si vide, `"Email invalide"` si invalide, appel `supabase.auth.resetPasswordForEmail` avec `redirectTo: ${origin}/auth`, message générique (succès) `duration: 8000` dans les deux branches (anti-énumération). |
| **Inscription** (`handleSignup`) | Validations email puis mot de passe puis correspondance, `signUp`, toast `"Compte créé ! …"` `duration: 8000`, **réinitialisation du formulaire**, toast d'échec générique `"Impossible de créer le compte. Veuillez réessayer."`. |
| **Récupération de mot de passe** (`handleUpdatePassword`) | Validation mot de passe (message Zod), `"Les mots de passe ne correspondent pas"`, `supabase.auth.updateUser`, `"Mot de passe mis à jour avec succès !"`, `setIsPasswordRecovery(false)`, reset des champs, `navigate("/dashboard")`, toast d'échec `"Erreur lors de la mise à jour du mot de passe"`. |
| **Redirection** (`useEffect`) | `navigate("/dashboard", { replace: true })` si `user && !isPasswordRecovery` — inchangé. |
| **UI** | En-tête, onglets Connexion/Inscription, ids des champs, classes Tailwind, bouton afficher/masquer, texte d'aide mot de passe, lien mentions légales, pied de page : strictement identiques. |

> **Note sur `isLoading`.** L'état de chargement, auparavant unique pour toute la page, est désormais **local à chaque formulaire**. Le comportement observable est identique : un seul formulaire est rendu/visible à la fois (onglets exclusifs, ou mode récupération exclusif), et le bouton « Mot de passe oublié ? » partage l'`isLoading` de `LoginForm` comme à l'origine.

> **Note sur `firstZodMessage`.** Reproduit l'expression historique `error.errors[0]?.message || fallback` (opérateur `||`, pas `??`) afin de préserver le comportement exact, y compris le repli sur le message par défaut.

---

## 5. Vérifications de non-régression

| Vérification | Commande | Attendu | Résultat |
|---|---|---|---|
| Complexité Auth | `npx eslint src/pages/Auth.tsx` | 0 warning S3776/S2004 sur ce fichier | **0 warning** ✅ |
| Lint global | `npm run lint` | 0 erreur ; le warning d'`Auth.tsx` disparaît | **0 erreur, 28 warnings** (29 → 28, le S3776 d'`Auth.tsx` a disparu) ✅ |
| Types | `npx tsc --noEmit` | 0 erreur | **0 erreur** ✅ |
| Tests unitaires | `npm run test:run` | 28 suites / 842 tests | **28 / 842 verts** ✅ |
| Build | `npm run build` | OK | **OK** (built in ~3,9 s) ✅ |
| **E2E (filet anti-régression)** | `npx playwright test e2e/auth.spec.ts` | 6 / 6 PASS | **6 / 6 PASS** (3,1 s) ✅ |

> Les 28 warnings de lint résiduels concernent **d'autres** fichiers (autres pages, services, fonctions Supabase, `react-refresh`) et sont attendus — ils restent hors périmètre de cette vague. Le seul Δ est la **disparition** du warning S3776 d'`Auth.tsx` (29 → 28).

### 5.1 Détail E2E

```
Running 6 tests using 6 workers
  ✓ affiche l'en-tête et les deux onglets Connexion / Inscription
  ✓ affiche le formulaire de connexion par défaut
  ✓ bascule vers l'onglet Inscription et révèle ses champs
  ✓ bloque la soumission d'un email invalide (validation native + reste sur /auth)
  ✓ expose le lien vers les mentions légales
  ✓ bouton afficher/masquer le mot de passe sur le champ connexion
  6 passed (3.1s)
```

Exécuté en démarrant `npm run dev` avec des valeurs **placeholder** pour `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (la page `/auth` est publique et ne déclenche aucun appel réseau au chargement). Aucun secret versionné.

---

## 6. Reproduire localement

```bash
# Mesure de complexité (périmètre Auth)
npx eslint src/pages/Auth.tsx                                    # 0 warning

# Non-régression
npm run lint                                                     # 0 error, 28 warnings (hors Auth)
npm run test:run                                                 # 842 / 842 verts
npx tsc --noEmit                                                 # 0 erreur
npm run build                                                    # OK

# E2E (filet anti-régression de la page)
VITE_SUPABASE_URL="https://placeholder.supabase.co" \
VITE_SUPABASE_PUBLISHABLE_KEY="placeholder-anon-key" \
npx playwright test e2e/auth.spec.ts                             # 6 passed
```

---

## 7. Bilan

`Auth.tsx` passe d'une fonction à **complexité cognitive 17** à un shell dont la fonction la plus complexe est à **2**, et dont les extractions plafonnent à **4** — soit une marge très confortable sous le seuil de 15 (et sous la cible ≤ 12). Le découpage en sous-composants et helpers purs améliore la lisibilité et la testabilité sans aucune régression : lint (0 erreur), types (0 erreur), 842 tests unitaires verts, build OK et les **6 tests E2E de caractérisation toujours verts** confirmant le comportement préservé.

---

© DICA France — base logicielle KOREV AI.
