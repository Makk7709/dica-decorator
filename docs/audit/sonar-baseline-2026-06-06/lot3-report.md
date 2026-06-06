# Rapport LOT 3 — Accessibilité JSX réelle

| Champ | Valeur |
|---|---|
| Date d'exécution | 2026-06-06 |
| Lot | LOT 3 — A11y JSX réels |
| Branche | `audit/tier1-2026-05-07` |
| Snapshots produits | `lint-after-lot3.txt`, `test-after-lot3.txt` |
| Snapshot pré-LOT 3 | `lint-after-lot2-pre-lot3.txt` |

---

## 1. Outillage : activation `eslint-plugin-jsx-a11y`

Avant LOT 3, ESLint ne portait **aucune règle d'accessibilité**. Les ~30 issues a11y signalées par le mainteneur ne provenaient que de SonarLint IDE — non reproductibles en CI.

LOT 3 corrige ce trou en activant `eslint-plugin-jsx-a11y` (^6.10.2) en preset `recommended`. La couverture des règles ainsi activées est strictement supérieure ou équivalente aux règles SonarLint S6848, S6853, S6847 et S6479 :

| Règle SonarLint | Équivalent jsx-a11y |
|---|---|
| S6848 — Élément non-interactif avec `onClick` | `jsx-a11y/no-static-element-interactions` |
| S6847 — Handler clavier manquant | `jsx-a11y/click-events-have-key-events` |
| S6853 — `<label>` non associé | `jsx-a11y/label-has-associated-control` |
| S6479 — Liste sans items / `tabIndex` non interactif | `jsx-a11y/no-noninteractive-tabindex` |
| (au-delà) | `img-redundant-alt`, `no-autofocus`, `no-noninteractive-element-interactions`, `role-has-required-aria-props` |

Les **49 fichiers shadcn/ui purs** sont exclus du scan ESLint au même titre que pour Sonar (cf. ADR-0001), via une liste partagée dans `eslint.config.js`.

---

## 2. Baseline pré-LOT 3 (juste après LOT 2)

Snapshot brut : [`lint-after-lot2-pre-lot3.txt`](./lint-after-lot2-pre-lot3.txt).

| Indicateur | Valeur |
|---|---:|
| Total problèmes ESLint | 34 |
| Erreurs (toutes a11y) | **28** |
| Warnings | 6 |

### Distribution des 28 erreurs a11y par règle

| Erreurs | Règle | Description courte |
|---:|---|---|
| 9 | `click-events-have-key-events` | Élément avec `onClick` sans handler clavier |
| 8 | `no-static-element-interactions` | `<div>`/`<span>` avec handler souris |
| 4 | `label-has-associated-control` | `<label>` sans association à un contrôle |
| 3 | `img-redundant-alt` | `alt` contenant les mots "image", "photo", "picture" |
| 2 | `no-noninteractive-element-interactions` | Élément non-interactif (`<h3>`, `<img>`) avec handler |
| 1 | `no-noninteractive-tabindex` | `tabIndex` sur élément non-interactif |
| 1 | `no-autofocus` | `autoFocus` (anti-pattern a11y) |

### Distribution par fichier

| Erreurs | Fichier |
|---:|---|
| 10 | `src/pages/Creative.tsx` |
| 7 | `src/pages/Dashboard.tsx` |
| 2 | `src/components/admin/catalog-management.tsx` |
| 2 | `src/components/favorites/favorites-gallery.tsx` |
| 2 | `src/components/ui/before-after-slider.tsx` |
| 2 | `src/components/ui/presentation-viewer.tsx` |
| 2 | `src/pages/ProjectDetail.tsx` |
| 1 | `src/components/admin/user-projects-dialog.tsx` |

---

## 3. Corrections appliquées

### 3.1 Helper mutualisé `onActivateKeyDown`

Ajouté dans `src/lib/utils.ts` : un wrapper qui exécute le même handler que `onClick` lorsqu'on appuie sur **Entrée** ou **Espace**, en empêchant le scroll navigateur sur Espace. Conforme WCAG 2.1.1.

```ts
export function onActivateKeyDown<E extends Element = HTMLElement>(
  event: React.KeyboardEvent<E>,
  handler: (event: React.KeyboardEvent<E>) => void
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handler(event);
  }
}
```

### 3.2 Cartes cliquables (`<div onClick>` → `role="button"`)

Pattern appliqué sur 4 fichiers : `Dashboard.tsx` (cartes projets), `Creative.tsx` (zoom image, zoom favori), `catalog-management.tsx` (sélection décor), `favorites-gallery.tsx` (sélection favori).

```diff
- <div className="cursor-pointer" onClick={handleClick}>
+ <div
+   role="button"
+   tabIndex={0}
+   aria-label="Action explicite"
+   className="cursor-pointer"
+   onClick={handleClick}
+   onKeyDown={(e) => onActivateKeyDown(e, handleClick)}
+ >
```

### 3.3 Labels associés

`ProjectDetail.tsx` : ajout d'`aria-label` sur deux `<label>` qui enveloppaient un `<Button asChild>` (Radix). `Creative.tsx` : ajout de `htmlFor` + `id` sur deux paires label/contrôle (Select existant projet, Input nouveau projet).

### 3.4 Alts redondants

3 occurrences corrigées : `"Photo originale"` → `"Originale"`, `"Photo source"` → `"Source"`, `"Photo source N"` → `"Source N"` (cf. `user-projects-dialog.tsx`, `Creative.tsx`).

### 3.5 Cas particuliers (composants techniques)

- **`before-after-slider.tsx`** : conserve `role="slider"` mais expose désormais `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` explicitement (en plus du spread `ariaProps`) afin que l'analyse statique du linter détecte les attributs ARIA requis.
- **`presentation-viewer.tsx`** : `<div role="region">` avec `onClick` + `onKeyDown` qui révèlent l'UI overlay. La navigation clavier propre (flèches, Esc) est gérée par le service via `document.addEventListener('keydown', …)`. Une dérogation `eslint-disable` est documentée en commentaire.
- **`Dashboard.tsx` édition inline** : `autoFocus` conservé avec dérogation justifiée (UX standard de l'édition inline) ; `stopPropagation` sur le wrapper d'édition de titre conservé avec dérogation.
- **`Creative.tsx` zoom plein écran** : le `<img onClick>` qui empêchait la fermeture du Dialog a été remplacé par un wrapper `<div onClick>` avec dérogation documentée (préserve l'UX : clic image = ne ferme pas, clic fond = ferme).

Toutes les dérogations ESLint introduites portent une justification en commentaire.

---

## 4. Mesures après LOT 3

Snapshot brut : [`lint-after-lot3.txt`](./lint-after-lot3.txt) et [`test-after-lot3.txt`](./test-after-lot3.txt).

| Indicateur | Pré-LOT 3 | Post-LOT 3 | Δ |
|---|---:|---:|---:|
| Total problèmes ESLint | 34 | **6** | **−28 (−82 %)** |
| Erreurs ESLint | 28 | **0** | **−28 (−100 %)** |
| Warnings ESLint | 6 | 6 | 0 |
| Tests Vitest | 842 / 28 suites | 842 / 28 suites | 0 régression |
| `tsc --noEmit` | 0 erreur | 0 erreur | 0 |
| Build Vite production | OK | OK | 0 |

Les 6 warnings résiduels sont tous structurels et indépendants de l'a11y :

- 4× `react-refresh/only-export-components` (contextes/test-utils qui exportent à la fois composants et helpers — non bloquant pour la prod)
- 1× `react-hooks/exhaustive-deps` (`ProjectDetail.tsx` ligne 112 — pré-existant)
- 1× variant du précédent

---

## 5. Trajectoire qualité cumulée (LOT 0 → LOT 3)

| Indicateur | Baseline | Après LOT 1 | Après LOT 2 | **Après LOT 3** |
|---|---:|---:|---:|---:|
| Problèmes ESLint | 161 | 161 | 13 | **6** |
| Erreurs ESLint | 148 | 148 | 0 | **0** |
| Warnings ESLint | 13 | 13 | 13 | **6** |
| Test Files Vitest | 28 | 28 | 28 | **28** |
| Tests Vitest | 842 | 842 | 842 | **842** |
| Issues a11y mesurables ESLint | n/a* | n/a* | 28** | **0** |
| Plugin a11y intégré au lint | Non | Non | Non | **Oui** |

\* `eslint-plugin-jsx-a11y` n'était pas installé.
\** Mesure rétroactive après installation du plugin (snapshot `lint-after-lot2-pre-lot3.txt`).

La baisse des warnings (13 → 6) est un effet de bord positif de l'exclusion des fichiers shadcn/ui purs ajoutée en LOT 3 (les `react-refresh` warnings d'`accordion.tsx`, `chart.tsx`, etc. ont disparu du scope).

---

## 6. Conformité WCAG 2.1 — niveau atteint

Les corrections de LOT 3 adressent principalement :

| Critère WCAG | Statut |
|---|---|
| 2.1.1 Keyboard (A) | Tous les éléments cliquables custom du scope ont désormais un handler clavier équivalent. |
| 1.1.1 Non-text Content (A) | Les `alt` redondants ont été corrigés ; les images informatives portent un `alt` descriptif. |
| 1.3.1 Info and Relationships (A) | Les `<label>` orphelins sont désormais associés via `htmlFor`/`id` ou `aria-label`. |
| 4.1.2 Name, Role, Value (A) | Les éléments interactifs custom portent `role="button"` ou `role="slider"` avec attributs ARIA requis. |

LOT 3 n'a pas vocation à couvrir l'ensemble du référentiel WCAG (contrastes, focus visible, lecteurs d'écran, etc.) ; il fixe le **plancher mécanique** vérifiable en CI.

---

## 7. Reproduire localement

```bash
npm run lint                            # 0 error, 6 warnings attendus
npm run test:run                        # 842 / 842 verts
npx tsc --noEmit                        # 0 erreur
npm run build                           # OK
```

---

© DICA France — base logicielle KOREV AI.
