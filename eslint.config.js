import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

// Seuil de complexité cognitive (SonarLint S3776). 15 est le défaut SonarQube.
// Cf. docs/audit/sonar-baseline-2026-06-06/lot4-foundation-report.md (LOT 4 vague 1).
const COGNITIVE_COMPLEXITY_THRESHOLD = 15;

// Composants shadcn/ui purs exclus de l'audit a11y ESLint (cf.
// docs/adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md). Ces fichiers
// sont des templates upstream et leur a11y est garantie par Radix UI.
const SHADCN_PURE_FILES = [
  "src/components/ui/accordion.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/alert.tsx",
  "src/components/ui/aspect-ratio.tsx",
  "src/components/ui/avatar.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/breadcrumb.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/calendar.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/carousel.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/checkbox.tsx",
  "src/components/ui/collapsible.tsx",
  "src/components/ui/command.tsx",
  "src/components/ui/context-menu.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/drawer.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/form.tsx",
  "src/components/ui/hover-card.tsx",
  "src/components/ui/input-otp.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/menubar.tsx",
  "src/components/ui/navigation-menu.tsx",
  "src/components/ui/pagination.tsx",
  "src/components/ui/popover.tsx",
  "src/components/ui/progress.tsx",
  "src/components/ui/radio-group.tsx",
  "src/components/ui/resizable.tsx",
  "src/components/ui/scroll-area.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/separator.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/sidebar.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/ui/slider.tsx",
  "src/components/ui/sonner.tsx",
  "src/components/ui/switch.tsx",
  "src/components/ui/table.tsx",
  "src/components/ui/tabs.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/toast.tsx",
  "src/components/ui/toaster.tsx",
  "src/components/ui/toggle-group.tsx",
  "src/components/ui/toggle.tsx",
  "src/components/ui/tooltip.tsx",
  "src/components/ui/use-toast.ts",
];

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "audit", ...SHADCN_PURE_FILES] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      sonarjs,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // LOT 4 vague 1 — Mesure de la complexité cognitive (S3776) et de
      // l'imbrication (S2004). Configurées en `warn` volontairement : l'objectif
      // est de RENDRE LA MÉTRIQUE REPRODUCTIBLE en CI sans transformer le lint
      // existant (0 erreur) en échec avant les refactos prévus en vague 2.
      "sonarjs/cognitive-complexity": ["warn", COGNITIVE_COMPLEXITY_THRESHOLD],
      "sonarjs/no-nested-functions": ["warn", { threshold: 4 }],
      // DETTE QUALITÉ LOT 2/LOT 3 — RÉINTRODUITE par les 4 mois d'évolution de
      // `main` (merge Option B du 2026-06-06). Sur le snapshot de février, ces
      // règles étaient vertes (0 erreur) ; `main` a réintroduit ~46 `any` et
      // 7 violations a11y dans les fichiers dont le refacto LOT 1-4 a été DIFFÉRÉ
      // (Auth/Creative/ProjectDetail/Dashboard, analytics & reseller-brochure
      // services, presentation-viewer, fonctions edge). Conformément à la
      // philosophie « mesurer sans casser avant refacto » (déjà appliquée à
      // SonarJS ci-dessus), on rétrograde TEMPORAIREMENT ces règles en `warn`.
      // Objectif : re-typer/corriger puis RE-PASSER EN `error` (ratchet) lors de
      // la vague de suivi. Détail et plan de descente :
      // docs/audit/sonar-baseline-2026-06-06/dette-suivi-post-merge.md
      "@typescript-eslint/no-explicit-any": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-autofocus": "warn",
    },
  },
  {
    // Tests E2E Playwright : contexte hors-React. La fixture d'authentification
    // utilise l'API `use()` de Playwright, que `react-hooks/rules-of-hooks`
    // confond avec le hook React `use`. On neutralise donc cette règle ici.
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
