# ADR-0001 — Exclusion des composants shadcn/ui de l'audit SonarQube / SonarLint

| Champ | Valeur |
|---|---|
| Statut | Accepté |
| Date | 2026-06-06 |
| Auteur | KOREV AI |
| Décideur | KOREV AI |
| Lot associé | LOT 0 — Configuration Sonar |

---

## 1. Contexte

Le projet `dica-decorator` utilise la bibliothèque [shadcn/ui](https://ui.shadcn.com/), qui fournit des composants React copiés directement dans le code source du projet (et non installés comme dépendance npm). Cette approche permet de personnaliser librement les composants, mais a une conséquence importante pour la qualité de code : **les fichiers shadcn pur sont des templates auto-générés, maintenus par la communauté shadcn**, et toute modification locale crée une divergence qui devra être résolue manuellement à chaque mise à jour upstream.

L'analyse SonarLint (côté IDE) remonte un volume significatif de violations sur ces composants, principalement :

- `S6759` — Props non `readonly`.
- `S3358` — Ternaires imbriqués (notamment dans les composants stylistiques générés par `class-variance-authority`).
- `S6481` — Contexts React sans mémoïsation de `value` (carousel, form, sidebar, toggle-group, chart).
- Diverses règles a11y JSX héritées du template.

Au 2026-06-06, l'audit identifie **48 fichiers** dans `src/components/ui/` qui sont des templates shadcn purs (dérivés directement de la base [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components) sans modification fonctionnelle), et **10 fichiers** qui sont des composants custom développés par KOREV AI pour le projet et qui restent dans le périmètre d'audit normal.

---

## 2. Décision

**Les 48 fichiers `src/components/ui/` correspondant à des composants shadcn purs sont exclus du périmètre d'analyse SonarQube / SonarLint** via la propriété `sonar.exclusions` du fichier `sonar-project.properties` (cf. LOT 0).

Liste exhaustive des fichiers exclus :

```
src/components/ui/accordion.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/button.tsx
src/components/ui/calendar.tsx
src/components/ui/card.tsx
src/components/ui/carousel.tsx
src/components/ui/chart.tsx
src/components/ui/checkbox.tsx
src/components/ui/collapsible.tsx
src/components/ui/command.tsx
src/components/ui/context-menu.tsx
src/components/ui/dialog.tsx
src/components/ui/drawer.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/form.tsx
src/components/ui/hover-card.tsx
src/components/ui/input.tsx
src/components/ui/input-otp.tsx
src/components/ui/label.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/popover.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/resizable.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/textarea.tsx
src/components/ui/toast.tsx
src/components/ui/toaster.tsx
src/components/ui/toggle.tsx
src/components/ui/toggle-group.tsx
src/components/ui/tooltip.tsx
src/components/ui/use-toast.ts
```

Les fichiers suivants, présents dans le même répertoire mais qui sont des **composants custom du projet**, **ne sont pas exclus** et restent dans le périmètre d'audit normal :

```
src/components/ui/app-footer.tsx
src/components/ui/before-after-slider.tsx
src/components/ui/image-export-dropdown.tsx
src/components/ui/magazine-deco-export-button.tsx
src/components/ui/premium-layout.tsx
src/components/ui/presentation-viewer.tsx
src/components/ui/reseller-brochure-export-button.tsx
src/components/ui/safe-image.tsx
src/components/ui/share-link-dialog.tsx
src/components/ui/theme-toggle.tsx
```

Cette décision concerne **uniquement** l'analyse SonarQube / SonarLint. Les composants exclus restent :

- compilés et exécutés en production normalement,
- couverts par ESLint (la config ESLint locale ne les exclut pas),
- couverts par TypeScript strict,
- utilisés dans les tests d'intégration via les pages qui les consomment.

---

## 3. Justification

### 3.1 Coût d'opportunité d'une correction

Corriger les violations SonarLint sur les 48 fichiers shadcn représente, d'après le bilan IDE 2026-06-06, environ **50 violations**. Le coût de correction est modéré (~3-4 j/h) mais le bénéfice est nul à court terme et **négatif à moyen terme** :

- À chaque mise à jour de shadcn/ui (en moyenne tous les 3-6 mois), les corrections locales doivent être ré-appliquées manuellement, ou bien la mise à jour est rejetée en bloc, ce qui prive le projet des correctifs upstream (sécurité, accessibilité, perf).
- Le mainteneur amont (shadcn) est lui-même actif sur ces sujets ; les corrections amont arrivent sans coût pour nous quand on tient la version à jour.

### 3.2 Précédent industriel

L'exclusion des composants UI tiers ou semi-tiers (Radix UI, Headless UI, shadcn/ui, Material UI dérivés) du périmètre d'audit Sonar est une pratique documentée dans plusieurs codebases publiques de référence et dans la documentation Sonar elle-même (rubrique « Generated and adopted code »).

### 3.3 Pas de masquage du vrai signal

L'exclusion ne porte que sur les fichiers strictement importés du template shadcn. Les composants custom KOREV AI restent audités, ce qui couvre la totalité du code propriétaire et porteur de risque réel.

---

## 4. Conséquences

### 4.1 Positives

- Le tableau de bord Sonar reflète uniquement le code propriétaire du projet, ce qui rend la mesure exploitable et opposable à un cabinet d'audit.
- Le coût de correction de la dette est réduit d'environ 50 violations × ~5 minutes = ~4 h/h immédiates.
- La compatibilité avec les futures mises à jour shadcn est préservée.
- Le quality gate Sonar (LOT 5) peut être fixé à des seuils crédibles sans devoir composer avec les divergences shadcn.

### 4.2 Négatives ou neutres

- Les violations a11y `S6848`, `S6853`, `S6847`, `S6479` éventuellement présentes dans les composants shadcn ne sont plus remontées par Sonar pour ces fichiers. Mitigation : **les violations a11y dans les pages qui consomment ces composants restent auditées**, ce qui couvre l'a11y effective du parcours utilisateur. Les composants shadcn sont par ailleurs audités pour l'a11y par leur mainteneur amont (le projet shadcn s'appuie sur Radix UI, qui est lui-même testé pour l'a11y).
- Toute modification locale d'un composant shadcn à des fins fonctionnelles (par ex. ajout d'une variante personnalisée) **doit déclencher un retrait du fichier de la liste d'exclusion** ou la création d'un fichier custom `src/components/ui/<name>-custom.tsx`. Cette règle est inscrite ci-dessous.

### 4.3 Règle de gouvernance associée

Toute personne qui modifie un fichier listé en § 2 ci-dessus **doit** :

1. Soit créer un fichier custom adjacent (`<name>-custom.tsx`) qui réutilise le composant shadcn et reste audité, et **ne pas modifier le fichier shadcn original**.
2. Soit assumer la divergence et **retirer le fichier de la liste `sonar.exclusions`** dans `sonar-project.properties`, en mentionnant cette décision dans le commit et dans un nouvel ADR.

Cette règle sera vérifiée par revue de code lors des PR.

---

## 5. Alternatives considérées

| Alternative | Avantage | Inconvénient | Décision |
|---|---|---|---|
| Corriger les violations sur les composants shadcn | Sonar 100 % vert | Surcharge de maintenance à chaque update shadcn ; signal noyé par le bruit. | Rejetée |
| Exclure tout `src/components/ui/` sans distinction | Plus simple à maintenir | Exclut aussi les 10 composants custom du projet (perte de couverture sur du code propriétaire). | Rejetée |
| Garder `src/components/ui/` audité mais marquer chaque issue comme « Won't Fix » dans Sonar | Traçabilité issue par issue | Travail manuel à chaque scan, pas pérenne face aux updates shadcn. | Rejetée |
| **Exclure nominativement les 48 fichiers shadcn purs** | Précis, justifiable, pérenne | Nécessite de tenir la liste à jour si shadcn ajoute / retire des composants. | **Retenue** |

---

## 6. Références

- [Documentation shadcn/ui](https://ui.shadcn.com/) — modèle de distribution par copie de code source.
- [Sonar Documentation — Narrowing the Focus](https://docs.sonarsource.com/sonarqube-server/latest/project-administration/analysis-scope/) — bonnes pratiques pour exclure du code généré ou adopté.
- `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` — § 5 (cartographie des modules propriétaires).
- `docs/audit/documentation_cleanup_report_2026-05-31.md` — recommandation 12.2.4 sur la mise en place d'un dossier `docs/adr/`.
- `sonar-project.properties` — implémentation de la décision.
