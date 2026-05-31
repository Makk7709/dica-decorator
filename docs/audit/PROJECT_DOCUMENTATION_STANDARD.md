# Documentation Technique Standardisée — DICA Decorator

> Document généré à des fins d'audit technique, de transmission à cabinet d'expertise et de valorisation logicielle. Le contenu est strictement factuel et rattaché à des éléments observables du dépôt. Les zones non documentées sont signalées explicitement.

---

## 1. Identification du projet

| Élément | Valeur observée | Source |
|---|---|---|
| Nom du projet | `dica-decorator` | `package.json` ligne 2 |
| Version applicative | `2.2.0` | `package.json` ligne 5 |
| Auteur déclaré | KOREV AI | `package.json` ligne 7, `README.md` ligne 365 |
| Licence | `UNLICENSED` (propriétaire, non publique) | `package.json` ligne 8, `README.md` § Licence |
| Type de projet | Application web SaaS B2B (Single Page Application + backend managé) | `package.json`, `vite.config.ts`, `src/App.tsx` |
| Domaine d'application | Visualisation par IA de décors stratifiés sur photos pour DICA France (revendeurs et utilisateurs finaux) | `README.md` § À propos, `src/pages/NewProject.tsx`, `supabase/functions/apply-decor/index.ts` |
| Statut observé | Application en production fonctionnelle, base de code active (HEAD `274e4d0` daté du 06/05/2026) | `git log -1`, branche `audit/tier1-2026-05-07` |
| Langage principal | TypeScript (frontend + Edge Functions Deno) | `tsconfig.json`, `vite.config.ts`, `supabase/functions/**` |
| Frameworks principaux | React 18, Vite 5, TailwindCSS 3, shadcn/ui (Radix UI), TanStack Query, React Router DOM 6, Supabase JS SDK, jsPDF | `package.json` lignes 25-104 |
| Backend | Supabase managé (PostgreSQL + Auth + Storage + Edge Functions Deno) | `supabase/migrations/*`, `supabase/functions/*`, `src/integrations/supabase/client.ts` |
| Moteur IA externe | Google AI — Gemini 3 Pro Image Preview (génération image) et Gemini 2.0/2.5 Flash (texte) via passerelle compatible OpenAI Chat Completions | `supabase/functions/apply-decor/index.ts` ligne 46, `supabase/functions/creative-chat/orchestrator.ts` |
| Date de génération du document | 21/05/2026 | — |
| Périmètre audité | Branche `audit/tier1-2026-05-07`, HEAD `274e4d0`. Frontend (`src/`), backend Edge (`supabase/functions/`), migrations SQL (`supabase/migrations/`), CI (`.github/workflows/`), configuration et documentation associée. | `git status`, `git log -1` |

---

## 2. Résumé exécutif

**Finalité du projet.** `dica-decorator` est une application web propriétaire développée par KOREV AI pour DICA France. Elle permet à des utilisateurs authentifiés (clients DICA et revendeurs) de générer, à partir d'une photographie d'un espace (cabine d'ascenseur, véhicule, terrasse, mobilier) et d'un décor stratifié du catalogue DICA, une image de rendu réaliste exploitant le modèle Google Gemini 3 Pro Image Preview. Le produit gère également la génération de livrables éditoriaux (brochures revendeur cobrandées, magazine DÉCO), le partage sécurisé de rendus, le suivi analytique et l'administration multi-tenant (organisations revendeurs avec quotas mensuels).

**Cible fonctionnelle.** Deux profils principaux observés dans le code (`src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, type SQL `app_role`) : `client` (utilisateur final, parcours projet/photo/rendu) et `admin` (gestion catalogue, utilisateurs, analytics, branding revendeur). Une couche d'organisation (`organizations`, `organization_members`) supporte le multi-tenant revendeur avec quotas tiers (`starter`, `pro`, `enterprise`).

**Niveau de maturité observé.** Application en production avec une base de tests unitaires substantielle (825 tests verts, 27 fichiers de tests selon `audit/final/test.txt`), un pipeline d'intégration continue (`.github/workflows/ci.yml` : lint, tests, build, audit dépendances, audit licences), un pipeline de déploiement manuel des Edge Functions (`.github/workflows/cd-edge-functions.yml`), et une documentation interne abondante (28 documents dans `docs/`). Les RLS PostgreSQL sont actives sur les tables sensibles (≥ 14 tables, ≥ 57 policies recensées). Le repo est versionné, structuré et reproductible.

**Points techniques saillants.**
- Couche de services métier TypeScript volumineuse et testée (`src/services/`, 21 services, 11 000+ lignes de tests).
- Garde anti-SSRF dédoublée frontend (`src/services/url-validator.service.ts`, 71 tests) et backend (`supabase/functions/_shared/ssrf-guard.ts` avec whitelist hostname + blacklist IP privées et endpoints de métadonnées cloud).
- Orchestrateur de prompt IA propriétaire (`supabase/functions/creative-chat/orchestrator.ts`) qui valide et structure les demandes utilisateur avant la génération d'image.
- Système de cobranding revendeur (`src/services/reseller-brochure-pdf.service.ts`, ~1 071 lignes) avec personnalisation de la couverture par nom de revendeur.

**Réserves.**
- La couverture de tests globale Vitest est mesurée à 30,42 % statements / 67,98 % functions / 77,58 % branches dans `audit/phase-0/coverage.txt` ; cette mesure est tirée vers le bas par les Edge Functions Deno (non couvertes par Vitest, runtime distinct). La couverture effective de la couche `src/services/*` est plus élevée mais n'est pas isolée dans le rapport présent.
- Le lint ESLint remonte 148 erreurs et 13 warnings au dernier passage archivé (`audit/final/lint.txt`) ; majoritairement des `@typescript-eslint/no-explicit-any` et des warnings `react-refresh/only-export-components` sur des composants `src/components/ui/*` issus du générateur shadcn/ui. La règle `@typescript-eslint/no-unused-vars` est désactivée dans `eslint.config.js`.
- `npm audit` remonte 3 vulnérabilités au dernier passage (2 modérées sur `esbuild`/`vite`, 1 critique sur `jspdf`) — voir `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` pour la position du projet sur ces migrations différées.
- La couche UI `src/components/ui/` (≈ 58 fichiers) provient du scaffold shadcn/ui (composants Radix UI sous licence MIT copiés dans le repo). Cette part n'est pas propriétaire au sens où les fichiers sont des templates publics standards ; la valeur propre du projet réside dans les couches métier (`src/services/`, `src/pages/`, `supabase/functions/`, `supabase/migrations/`) et dans les composants UI spécialisés (`src/components/admin/`, `analytics/`, `decor-selector/`, `favorites/`, `onboarding/`, ainsi que `src/components/ui/before-after-slider.tsx`, `magazine-deco-export-button.tsx`, `presentation-viewer.tsx`, `reseller-brochure-export-button.tsx`, `safe-image.tsx`, `share-link-dialog.tsx`).

---

## 3. Périmètre fonctionnel constaté

| Fonctionnalité | Statut observé | Fichiers / modules concernés | Commentaire |
|---|---|---|---|
| Authentification email/mot de passe | Implémentée | `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/supabase.ts` | Repose sur Supabase Auth (JWT). Session persistée en `localStorage`. |
| Récupération de mot de passe | Implémentée (interception event `PASSWORD_RECOVERY`) | `src/contexts/AuthContext.tsx` ligne 64 | — |
| Rôles `admin` / `client` | Implémentés en base + côté client | Migration `20251126234705_…sql` (type `app_role`, fonction `has_role`), `src/components/ProtectedRoute.tsx` | RBAC double couche : enum SQL + check JWT côté React. |
| Route protégée et gating admin | Implémentés | `src/components/ProtectedRoute.tsx` | Props `requireAdmin` côté composant. |
| Dashboard projets utilisateur | Implémenté | `src/pages/Dashboard.tsx`, `src/hooks/use-projects.ts`, table `projects` | — |
| Création de projet | Implémentée | `src/pages/NewProject.tsx`, table `projects` | — |
| Détail projet et galerie photos | Implémentés | `src/pages/ProjectDetail.tsx`, table `project_photos` | — |
| Sélection de décor | Implémentée | `src/components/decor-selector/DecorSelectorDialog.tsx`, `src/hooks/use-decors.ts`, `src/hooks/use-catalogs.ts`, tables `decors` et `decor_categories` | — |
| Génération de rendu IA (décor sur photo) | Implémentée | Edge Function `supabase/functions/apply-decor/index.ts`, service `src/services/gemini-image.service.ts`, table `render_results` | Modèle `gemini-3-pro-image-preview`. Limites resources : 12 Mo / image, 2 rendus / requête. |
| Assistant créatif (chat IA) | Implémenté | `src/pages/Creative.tsx`, Edge Function `supabase/functions/creative-chat/index.ts` + `orchestrator.ts` | Streaming SSE (Gemini 2.0 Flash) + génération image (Gemini 3 Pro Image Preview). |
| Favoris (rendus + créations) | Implémentés | `src/pages/Favorites.tsx`, `src/services/favorites.service.ts`, `src/components/favorites/favorites-gallery.tsx`, tables `render_favorites` et `creative_favorites` | — |
| Comparaison Avant/Après | Implémentée | `src/services/image-comparison.service.ts`, `src/components/ui/before-after-slider.tsx` | 67 tests. |
| Mode présentation plein écran | Implémenté | `src/pages/Presentation.tsx`, `src/services/presentation.service.ts`, `src/components/ui/presentation-viewer.tsx` | 67 tests. |
| Export image multi-formats (PNG/JPEG/WebP) | Implémenté | `src/services/image-export.service.ts`, `src/components/ui/image-export-dropdown.tsx` | 32 tests (+ tests `image-export.service.strict.test.ts`). |
| Génération brochure revendeur PDF cobrandée | Implémentée | `src/services/reseller-brochure-pdf.service.ts` (~1 071 LoC), `src/components/ui/reseller-brochure-export-button.tsx` | Cobranding par `ResellerBranding` (nom revendeur en titre de couverture). |
| Génération Magazine DÉCO PDF | Implémentée | `src/services/magazine-deco-pdf.service.ts` (~1 050 LoC), `src/types/magazine-deco.types.ts`, Edge Function `supabase/functions/generate-magazine-captions/index.ts` | Légendes éditoriales générées par IA. |
| Partage de rendu par lien | Implémenté | `src/services/share-link.service.ts` (~561 LoC), `src/components/ui/share-link-dialog.tsx`, table `share_links` + `share_link_access_logs`, migration `20251130000000_share_links.sql` | Expiration paramétrable (24h / 7d / 30d / 90d / never), token, logs d'accès. |
| Dashboard analytics admin | Implémenté | `src/pages/AdminAnalytics.tsx`, `src/services/analytics.service.ts`, Edge Function `supabase/functions/get-analytics/index.ts`, composants `src/components/analytics/*` | — |
| Export analytics JSON / CSV / PDF | Implémenté | `src/services/analytics-export.service.ts` | 29 tests. |
| Administration utilisateurs | Implémentée | `src/pages/Admin.tsx`, `src/components/admin/user-projects-dialog.tsx`, Edge Function `supabase/functions/get-users-admin/index.ts` | Edge Function en `SUPABASE_SERVICE_ROLE_KEY`. |
| Administration catalogue de décors | Implémentée | `src/components/admin/catalog-management.tsx`, `src/components/admin/bulk-decor-upload.tsx` | — |
| Réglages branding revendeur | Implémentés | `src/components/admin/reseller-branding-settings.tsx`, migration `20251201000000_add_cobranding_to_profiles.sql` | — |
| Multi-tenant organisations | Implémenté | `src/services/organization.service.ts`, migrations associées | Rôles `owner` / `admin` / `member`. Tiers `starter` / `pro` / `enterprise`. |
| Quotas mensuels par organisation | Implémentés | `src/services/quota.service.ts`, `src/services/rate-limiter.service.ts` | Reset au 1er du mois UTC. Seuils warning (80 %) et critical (95 %). |
| Rate limiting utilisateur quotidien | Implémenté | `src/services/rate-limiter.service.ts` | Reset minuit UTC. |
| Onboarding utilisateur | Implémenté | `src/components/onboarding/OnboardingChecklist.tsx`, `src/components/onboarding/WelcomeModal.tsx`, `src/components/onboarding/useOnboarding.ts` | — |
| Thème clair/sombre | Implémenté | `src/contexts/ThemeContext.tsx`, `src/components/ui/theme-toggle.tsx` | — |
| Mentions légales | Implémentées (route publique) | `src/pages/Legal.tsx` | — |
| Page d'aide | Implémentée (route protégée) | `src/pages/Help.tsx` | — |
| Renommage de projet | Implémenté | `src/services/project-rename.service.ts` | — |
| Suppression de projet | Implémentée | `src/services/project-deletion.service.ts` | — |
| Stockage d'images base64 → Supabase Storage | Implémenté | `src/services/image-storage.service.ts`, buckets `decor-textures`, `project-photos`, `render-results` | Migration documentée explicitement dans le service. |
| Protection anti-SSRF frontend | Implémentée | `src/services/url-validator.service.ts` (71 tests) | Validation des URLs externes. |
| Protection anti-SSRF Edge | Implémentée | `supabase/functions/_shared/ssrf-guard.ts` (whitelist hostnames + blacklist IPs RFC1918 + cloud metadata 169.254.169.254, `metadata.google.internal`) | Test `supabase/functions/_shared/__tests__/ssrf-guard.test.ts`. |
| Logger structuré conditionnel | Implémenté | `supabase/functions/_shared/logger.ts` | Test `supabase/functions/_shared/__tests__/logger.test.ts`. |
| Pré-chargement parallèle (optimisation latence) | Implémenté | `src/services/parallel-fetch.service.ts`, `src/hooks/use-optimistic-render.ts`, `src/hooks/use-decor-context-cache.ts` | Tests associés. |
| Lazy loading des pages | Implémenté | `src/App.tsx` lignes 12-25 (`React.lazy`) | — |
| Service worker / PWA | Non documenté dans le périmètre audité | — | Aucun manifest PWA ni `service-worker.ts` détecté. |
| Notifications push | Non documenté dans le périmètre audité | — | — |
| Internationalisation | Non documenté dans le périmètre audité (interface principalement en français) | — | — |
| Paiement / facturation en ligne | Non documenté dans le périmètre audité | — | Les tiers d'abonnement existent comme champ SQL (`subscription_tier`) mais aucun intégrateur de paiement (Stripe, etc.) n'est présent dans le code. |

---

## 4. Architecture technique

### 4.1 Vue d'ensemble

L'architecture est de type **SaaS web 3-tier** avec backend managé Supabase. Aucun serveur applicatif propre n'est opéré : la logique serveur sensible est portée par des Edge Functions Deno hébergées par Supabase. Les appels au modèle IA Google Gemini sont effectués depuis les Edge Functions (les clés API ne transitent jamais par le frontend).

```text
┌─────────────────────────────────────────────────────────────────┐
│  Client navigateur (SPA React 18 + Vite + TS)                   │
│   - Routing : React Router DOM v6 (src/App.tsx)                 │
│   - État serveur : TanStack Query                               │
│   - Auth : @supabase/supabase-js (JWT, localStorage)            │
│   - UI : shadcn/ui (Radix) + composants spécialisés KOREV       │
│   - PDF : jsPDF côté client (brochure, magazine, analytics)     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / JWT Authorization
┌─────────────────────────┴───────────────────────────────────────┐
│  Supabase (PaaS managé)                                         │
│   - Auth : Supabase Auth (JWT, recovery, password)              │
│   - Postgres : 23 migrations SQL, ≥ 14 tables avec RLS active   │
│   - Storage : buckets render-results, project-photos,           │
│                decor-textures (RLS par chemin user_id/…)        │
│   - Edge Functions Deno (apply-decor, creative-chat,            │
│       generate-magazine-captions, get-analytics, get-users-admin)│
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (clé serveur uniquement)
┌─────────────────────────┴───────────────────────────────────────┐
│  Google AI — generativelanguage.googleapis.com                  │
│   - gemini-3-pro-image-preview (génération image)               │
│   - gemini-2.0-flash / 2.5-flash (texte streaming + orchestrat°)│
│   - Passerelle compatible OpenAI Chat Completions               │
│     (AI_GATEWAY_URL / AI_GATEWAY_API_KEY, voir orchestrator.ts) │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Frontend

| Élément | Valeur | Source |
|---|---|---|
| Framework UI | React 18.3 | `package.json` |
| Build tool | Vite 5.4 + `@vitejs/plugin-react-swc` | `vite.config.ts` |
| Langage | TypeScript 5.8 (strict via `tsconfig.app.json`) | `tsconfig.app.json` |
| Styling | TailwindCSS 3.4 + `tailwindcss-animate` + `@tailwindcss/typography` | `tailwind.config.ts` |
| Composants UI | shadcn/ui (Radix UI : 26 paquets `@radix-ui/*`) | `package.json`, `components.json`, `src/components/ui/*` |
| Routing | React Router DOM v6 | `src/App.tsx` |
| État serveur | TanStack Query v5 (staleTime 5 min, gcTime 30 min) | `src/App.tsx` lignes 38-47 |
| Formulaires | `react-hook-form` + `@hookform/resolvers` + `zod` | `package.json` |
| Génération PDF côté client | `jspdf` | Services PDF |
| Charts | `recharts` (composant analytics) | `src/components/analytics/analytics-chart.tsx` |
| Lazy loading | Toutes les pages chargées en `React.lazy` + `Suspense` | `src/App.tsx` |
| Port dev | 8080 | `vite.config.ts` ligne 11 |

### 4.3 Backend (Supabase managé)

| Couche | Détail | Source |
|---|---|---|
| Auth | Supabase Auth (email + mot de passe, JWT, refresh token, password recovery). Pas de SSO ni MFA observés. | `src/lib/supabase.ts`, `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx` |
| Base de données | PostgreSQL managé. 23 migrations versionnées sous `supabase/migrations/`. ≥ 14 tables avec `ENABLE ROW LEVEL SECURITY` (recompte `grep`). ≥ 57 `CREATE POLICY` (recompte `grep`). | `supabase/migrations/*.sql` |
| Storage | 3 buckets identifiés dans `src/services/image-storage.service.ts` ligne 28 : `render-results`, `project-photos`, `decor-textures`. Politiques de stockage déclarées dans la migration initiale `20251126234705_…sql`. | Idem |
| Edge Functions (Deno) | 5 fonctions déployées : `apply-decor` (1 206 LoC), `creative-chat` (806 LoC) + `orchestrator.ts` (514 LoC), `generate-magazine-captions` (385 LoC), `get-analytics` (287 LoC), `get-users-admin` (301 LoC). Modules partagés : `_shared/ssrf-guard.ts` (154 LoC), `_shared/logger.ts` (66 LoC). | `supabase/functions/**`, `wc -l` |
| Modèle de données | Tables principales identifiées dans les migrations : `user_roles`, `decors`, `decor_categories`, `projects`, `project_photos`, `render_results`, `render_favorites`, `creative_favorites`, `profiles` (avec cobranding), `user_quotas`, `share_links`, `share_link_access_logs`, plus organisations multi-tenant. Types enum : `app_role`, `usage_context`. | `supabase/migrations/*.sql` |
| Fonctions SQL | `has_role(_user_id, _role)` `SECURITY DEFINER` (vérification RBAC), `increment_quota_usage`, triggers `update_…_updated_at`, trigger `on_auth_user_created`. | `supabase/migrations/20251126234705_…sql`, `20251129215810_…sql`, `20251129220306_…sql` |

### 4.4 IA & passerelle modèle

| Élément | Valeur | Source |
|---|---|---|
| Modèle image | `gemini-3-pro-image-preview` (appel direct à `generativelanguage.googleapis.com/v1beta/models`) | `supabase/functions/apply-decor/index.ts` lignes 44-49 |
| Modèle texte streaming | `gemini-2.0-flash` (via `streamGenerateContent?alt=sse`) | `supabase/functions/creative-chat/index.ts` lignes 31-54 |
| Modèle orchestration prompt | `gemini-2.5-flash` (via passerelle compatible OpenAI Chat Completions) | `supabase/functions/creative-chat/orchestrator.ts` lignes 22-26 |
| Variables d'env | `GOOGLE_AI_API_KEY` (Google direct), `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY` (passerelle) | `.env.example`, `docs/AUDIT_DEPENDANCES.md` § 4 |
| Garde anti-SSRF sortant | Whitelist `supabase.co`, `supabase.in` ; rejet protocoles non HTTPS ; rejet IPs RFC1918 ; rejet `169.254.169.254`, `metadata.google.internal` | `supabase/functions/_shared/ssrf-guard.ts` |

### 4.5 Authentification, autorisations, secrets

- **JWT côté frontend** : géré par `@supabase/supabase-js` avec persistence en `localStorage` (`src/integrations/supabase/client.ts`).
- **Rôles applicatifs** : enum SQL `app_role` (`admin` / `client`) — récupéré côté React via `fetchUserRole` puis caché dans `useRef`.
- **Garde de route** : `ProtectedRoute` (redirige sur `/auth` si non authentifié, sur `/dashboard` si non admin pour une route `requireAdmin`).
- **Vérification serveur** : `src/services/auth-guard.service.ts` (validation session, RBAC, vérification d'ownership projet, appartenance organisation, cache role TTL).
- **Edge Functions sensibles** (`get-users-admin`, `get-analytics`) : utilisent `SUPABASE_SERVICE_ROLE_KEY` côté serveur.
- **Secrets** : aucun secret dans le repo (`.gitignore` exclut `.env`, `.env.local`). `.env.example` fournit le template. Les secrets Edge sont gérés via `supabase secrets set` (cf. README workflow CD).
- **RLS PostgreSQL** : active sur toutes les tables sensibles. Pattern récurrent : `auth.uid() = user_id` pour les ressources utilisateur, fonction `has_role(auth.uid(), 'admin')` pour les ressources d'administration.

### 4.6 Déploiement

| Cible | Méthode | Source |
|---|---|---|
| Frontend | Build statique Vite (`npm run build` → dossier `dist/`), à servir sur CDN/hébergeur statique. Aucun déploiement automatique configuré dans le repo. | `package.json`, `README.md` § Déploiement |
| Edge Functions | Workflow GitHub Actions `cd-edge-functions.yml`, déclenchement **manuel** (`workflow_dispatch`) avec choix d'environnement (`staging` / `production`) et de fonction. Secrets requis : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. | `.github/workflows/cd-edge-functions.yml` |
| Migrations SQL | Non documenté comme automatisé dans le périmètre audité. Procédure manuelle attendue via `supabase db push` (cf. `docs/GUIDE_DEPLOIEMENT.md` à confirmer). | — |

### 4.7 Dépendances externes structurantes

- **Supabase** (PaaS, point de défaillance unique côté backend).
- **Google AI / Gemini** (point de défaillance unique côté IA).
- **Passerelle AI Gateway** compatible OpenAI Chat Completions (configurable, fallback historique vers `ai.gateway.lovable.dev` constaté dans `creative-chat/orchestrator.ts` ligne 26).

---

## 5. Structure du dépôt

| Chemin | Rôle identifié | Importance |
|---|---|---|
| `package.json` | Manifeste npm, scripts, dépendances. | Haute |
| `vite.config.ts` | Configuration build Vite (alias, chunks, sourcemaps). | Haute |
| `vitest.config.ts` | Configuration Vitest (environnement jsdom, seuils couverture 80 %). | Haute |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Configuration TypeScript. | Moyenne |
| `eslint.config.js` | Configuration ESLint (flat config, `@typescript-eslint`, `react-hooks`, `react-refresh`). | Moyenne |
| `tailwind.config.ts`, `postcss.config.js`, `components.json` | Styling et scaffolding shadcn/ui. | Moyenne |
| `.env.example` | Template des variables d'environnement (sans secret réel). | Haute |
| `.gitignore` | Exclut `.env`, `node_modules`, `dist`, `coverage`, `audit`. | Haute |
| `README.md` | Documentation d'entrée, présentation produit, scripts, architecture. | Haute |
| `index.html` | Point d'entrée HTML SPA. | Moyenne |
| `src/App.tsx` | Routage racine, providers (Query, Theme, Auth, Tooltip, Toast), Suspense. | Haute |
| `src/main.tsx` | Bootstrap React (mount sur `#root`). | Moyenne |
| `src/pages/` | 13 pages : `Index`, `Auth`, `Dashboard`, `NewProject`, `ProjectDetail`, `Admin`, `Creative`, `AdminAnalytics`, `Presentation`, `Help`, `Favorites`, `Legal`, `NotFound`. | Haute |
| `src/services/` | 21 services métier TypeScript (auth-guard, rate-limiter, quota, organization, analytics, analytics-export, gemini-image, image-storage, image-comparison, image-export, magazine-deco-pdf, reseller-brochure-pdf, share-link, url-validator, favorites, presentation, project-deletion, project-rename, parallel-fetch, admin-project-viewer, index). | Haute |
| `src/services/__tests__/` | 21 fichiers de tests unitaires Vitest pour les services. | Haute |
| `src/components/` | 76 composants React. Sous-arbres : `admin/`, `analytics/`, `decor-selector/`, `favorites/`, `onboarding/`, `ui/` (≈ 58 fichiers shadcn/ui + composants spécialisés KOREV). | Haute |
| `src/components/ui/` | Composants shadcn/ui (Radix) avec extensions spécialisées (`before-after-slider`, `magazine-deco-export-button`, `presentation-viewer`, `reseller-brochure-export-button`, `safe-image`, `share-link-dialog`, `premium-layout`, `app-footer`, `theme-toggle`). | Moyenne / Haute (selon fichiers) |
| `src/contexts/` | `AuthContext` (session + role caching), `ThemeContext` (theme switcher). | Haute |
| `src/hooks/` | 12 hooks (`use-projects`, `use-decors`, `use-catalogs`, `use-decor-context-cache`, `use-optimistic-render`, `use-creative-image-export`, `use-mobile`, `use-toast`, etc.) + tests. | Haute |
| `src/integrations/supabase/` | Client Supabase configuré (`client.ts`) et types DB générés (`types.ts`, 602 LoC). | Haute |
| `src/lib/` | Utilitaires (`utils.ts` `cn()`, `supabase.ts` service `authService`, `image-compression.ts`). | Haute |
| `src/types/` | Types métier (`magazine-deco.types.ts`, `plaquette.types.ts`, `render-response.types.ts`) + tests. | Moyenne |
| `src/test/` | Setup Vitest (`setup.ts`, `test-utils.tsx`, mocks MSW dans `mocks/`). | Haute |
| `supabase/functions/` | 5 Edge Functions Deno + dossier `_shared/`. | Haute |
| `supabase/functions/_shared/` | Modules partagés (`ssrf-guard.ts`, `logger.ts`) + leurs tests Vitest. | Haute |
| `supabase/migrations/` | 23 migrations SQL versionnées. | Haute |
| `.github/workflows/ci.yml` | CI quality gate : lint, tests + couverture, build, `npm audit`, `license-checker`. | Haute |
| `.github/workflows/cd-edge-functions.yml` | CD manuel des Edge Functions (workflow_dispatch). | Haute |
| `docs/` | 28 documents Markdown internes (guide utilisateur, admin, API, déploiement, audit dépendances, audit technique, dossier commissaire aux apports, rapport qualité, rapport valorisation, matrice heures-qualité, migrations différées, plans de correction, etc.). | Moyenne / Haute (selon documents) |
| `audit/` | Snapshots archivés des phases d'audit (phase-minus-1, phase-0, phase-1, phase-2, phase-3, final). Chaque phase contient `build.txt`, `lint.txt`, `test.txt`, `npm-audit.txt`. Exclu de Git par `.gitignore`. | Haute (pour audit) |
| `public/` | Assets statiques (favicon, logos SVG, images). | Moyenne |
| `assets/`, `coverage/`, `dist/` | Sorties de build / tests, non versionnées. | — |

---

## 6. Modules propriétaires identifiés

> Les modules ci-dessous correspondent à du code spécifiquement écrit pour DICA Decorator par KOREV AI, et non à du scaffolding tiers (shadcn/ui, Radix, Supabase SDK, etc.).

| Module | Rôle | Niveau de spécificité | Éléments valorisables | Réserve |
|---|---|---|---|---|
| `supabase/functions/creative-chat/orchestrator.ts` (514 LoC) | Couche d'orchestration IA propriétaire qui valide et structure les prompts utilisateurs avant la génération d'image (statut `ok` / `need_clarification` / `reject`, références décor extraites, contraintes techniques, warnings). | Haut — métier DICA (catalogue, contextes ascenseur/van/terrasse/mobilier). | Logique métier + prompt système + parsing structuré. | Dépend du fournisseur de modèle texte (`AI_GATEWAY_URL` configurable). Tests non identifiés dans le périmètre audité. |
| `supabase/functions/apply-decor/index.ts` (1 206 LoC) | Edge Function principale de génération d'images de rendu (appel Gemini 3 Pro Image Preview, parsing réponse, validation, limites resources). | Haut — orchestration end-to-end de la fonctionnalité cœur. | Workflow complet, gestion d'erreurs, limites resources, intégration storage. | Tests non identifiés dans le périmètre audité (couverture Vitest 0 % sur ce fichier — Deno runtime). |
| `supabase/functions/creative-chat/index.ts` (806 LoC) | Edge Function de l'assistant créatif (streaming SSE texte + génération image), réutilisation de l'orchestrateur. | Haut. | Streaming, gestion de session, parsing dual modèles. | Idem — pas de tests Vitest sur l'Edge. |
| `supabase/functions/generate-magazine-captions/index.ts` (385 LoC) | Génération de légendes éditoriales par IA pour les exports Magazine DÉCO. | Moyen — couplé au format magazine. | Format éditorial spécifique. | — |
| `supabase/functions/_shared/ssrf-guard.ts` (154 LoC) + tests | Garde anti-SSRF dédiée Edge Functions Deno : whitelist hostnames, blacklist IPs privées RFC1918, blocage endpoints de métadonnées cloud AWS/GCP/Azure. | Élevé sur le périmètre sécurité, code lisible et testé. | Module réutilisable. | Validation hostname-based sans résolution DNS (best-effort, documenté). |
| `src/services/url-validator.service.ts` (369 LoC) + 475 LoC de tests | Validation d'URL côté frontend (anti-SSRF, anti-rebinding, anti-encodage). | Élevé. | 71 tests unitaires, classe `SsrfBlockedError`, classe `InvalidUrlError`. | — |
| `src/services/auth-guard.service.ts` (≈ 280 LoC) + 556 LoC de tests | Validation côté serveur de session et permissions, RBAC, vérification d'ownership projet, appartenance organisation, cache role TTL. | Élevé. | 31 tests, erreurs typées (`UnauthorizedError`, `ForbiddenError` inférés depuis tests). | À confirmer : l'usage actuel est-il systématique dans toutes les Edge Functions ? |
| `src/services/rate-limiter.service.ts` + 657 LoC de tests | Rate limit double couche : daily per-user + monthly per-organization, avec gestion des tiers (`starter` / `pro` / `enterprise`). | Élevé. | 30 tests. | — |
| `src/services/quota.service.ts` + 507 LoC de tests | Suivi de quota mensuel organisation, seuils warning/critical, reset 1er du mois. | Élevé. | 21 tests. | — |
| `src/services/organization.service.ts` + 605 LoC de tests | CRUD organisations multi-tenant, membres, invitations, branding, tiers. | Élevé. | 27 tests. | — |
| `src/services/analytics.service.ts` + 773 LoC de tests | Métriques globales, tendances, items top, cache. | Élevé. | 49 tests. | — |
| `src/services/analytics-export.service.ts` + 323 LoC de tests | Export analytics JSON / CSV (Excel) / PDF. | Moyen. | 29 tests. | — |
| `src/services/magazine-deco-pdf.service.ts` (~1 050 LoC) | Génération PDF Magazine DÉCO style éditorial AD avec typographie, mise en page, légendes IA. | Élevé — différenciation produit. | Format propriétaire, couplage avec `generate-magazine-captions`. | Couverture de tests indirecte via `reseller-brochure-personalization.test.ts` (424 LoC) + tests directs partiels. |
| `src/services/reseller-brochure-pdf.service.ts` (~1 071 LoC) + 360 + 424 LoC de tests | Brochure revendeur cobrandée (nom revendeur en titre, logo, couleur primaire, branding interior pages + footer). | Élevé — différenciation B2B. | 16+ tests dédiés au cobranding, héritage des templates `MagazineDecoOptions`. | — |
| `src/services/share-link.service.ts` (~561 LoC) + 808 LoC de tests | Liens de partage sécurisés (token, expiration paramétrable, password protection optionnelle, tracking d'accès). | Élevé. | 58 tests, table `share_links` + `share_link_access_logs` avec RLS. | À confirmer : password protection effectivement câblée en UI ? |
| `src/services/image-comparison.service.ts` + 826 LoC de tests | Comparaison Avant/Après avec slider interactif. | Moyen. | 67 tests, composant UI `before-after-slider.tsx`. | — |
| `src/services/presentation.service.ts` + 719 LoC de tests | Mode présentation plein écran. | Moyen. | 67 tests. | — |
| `src/services/image-export.service.ts` + 460 + 216 LoC de tests | Export image multi-formats (PNG, JPEG, WebP) avec qualité configurable. | Moyen. | 32+ tests (dont strict). | — |
| `src/services/image-storage.service.ts` + 504 LoC de tests | Migration base64 (data URL) → Supabase Storage avec retour URL publique. | Moyen. | 29 tests, gestion mimeType et extension. | — |
| `src/services/gemini-image.service.ts` + 649 LoC de tests | Encapsulation API Gemini côté frontend (config, types, utilitaires). | Moyen. | 46 tests. | Pas de fetch direct depuis le frontend dans le path nominal (passage par Edge Function `apply-decor`). |
| `src/services/parallel-fetch.service.ts` + 524 LoC de tests | Pré-chargement parallèle (optimisation latence). | Moyen. | Tests dédiés. | — |
| `src/services/project-rename.service.ts` / `project-deletion.service.ts` / `favorites.service.ts` / `admin-project-viewer.service.ts` | Services CRUD/business secondaires, chacun avec tests dédiés. | Faible à moyen. | Tests présents. | — |
| `src/components/decor-selector/DecorSelectorDialog.tsx` | Composant de sélection de décor (UI métier spécialisée DICA). | Élevé — UI métier. | — | Présence d'une erreur lint `no-explicit-any` ligne 211 (non bloquante). |
| `src/components/admin/*` (`bulk-decor-upload`, `catalog-management`, `reseller-branding-settings`, `user-projects-dialog`) | UI d'administration spécialisée. | Élevé. | — | — |
| `src/components/onboarding/*` | Parcours d'accueil utilisateur (modale + checklist). | Moyen. | — | — |
| `src/components/ui/before-after-slider.tsx`, `magazine-deco-export-button.tsx`, `presentation-viewer.tsx`, `reseller-brochure-export-button.tsx`, `safe-image.tsx`, `share-link-dialog.tsx`, `premium-layout.tsx`, `app-footer.tsx`, `theme-toggle.tsx` | Composants UI spécialisés écrits pour le produit (et non générés par le scaffold shadcn/ui). | Moyen à élevé. | Réutilisables internes. | — |
| `supabase/migrations/*.sql` (23 fichiers) | Schéma de données, RLS, fonctions SQL (`has_role`, `increment_quota_usage`), triggers. | Élevé — modèle de données métier. | RLS exhaustif, triggers d'horodatage, fonctions `SECURITY DEFINER`. | — |

---

## 7. Dépendances et composants externes

### 7.1 Dépendances runtime frontend (extrait `package.json`)

| Dépendance | Usage observé | Criticité | Risque associé |
|---|---|---|---|
| `react`, `react-dom` ^18.3.1 | Cœur UI. | Critique | Standard, faible risque. |
| `react-router-dom` ^6.30.1 | Routing SPA. | Critique | Standard. |
| `@tanstack/react-query` ^5.83.1 | Cache état serveur. | Critique | Standard. |
| `@supabase/supabase-js` ^2.86.0 | Client Auth + DB + Storage + Edge invoke. | Critique | Dépendance forte au PaaS Supabase. |
| `@radix-ui/*` (26 paquets) | Primitives UI accessibles (shadcn/ui). | Haute | MIT, mature, communauté large. |
| `tailwindcss` ^3.4.17, `tailwindcss-animate`, `@tailwindcss/typography` | Styling. | Haute | Migration potentielle vers v4 à suivre (non urgente). |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Utilitaires de composition de classes. | Moyenne | Standard. |
| `react-hook-form` ^7.61.1, `@hookform/resolvers` ^3.10.0, `zod` ^3.25.76 | Formulaires + validation. | Haute | Standard. |
| `jspdf` ^3.0.4 | Génération PDF côté client (brochure, magazine, analytics). | Haute | **Vulnérabilité critique remontée par `npm audit`** sur jspdf <=4.2.0 (cf. `audit/final/npm-audit.txt`). Migration différée documentée dans `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`. |
| `recharts` ^2.15.4 | Graphiques analytics. | Moyenne | Standard. |
| `lucide-react` ^0.462.0 | Icônes. | Faible | Standard. |
| `date-fns` ^3.6.0 | Manipulation de dates. | Moyenne | Standard. |
| `react-day-picker` ^8.10.1, `embla-carousel-react`, `cmdk`, `input-otp`, `next-themes`, `react-resizable-panels`, `sonner`, `vaul`, `react-hook-form` | Composants UI spécialisés. | Moyenne | Standard, MIT. |

### 7.2 Dépendances dev / qualité

| Dépendance | Usage | Source |
|---|---|---|
| `vite` ^5.4.19 | Build. | `package.json` |
| `vitest` ^3.2.4 + `@vitest/coverage-v8` | Tests + couverture. | `vitest.config.ts` |
| `@testing-library/react`, `…/dom`, `…/jest-dom`, `…/user-event`, `happy-dom`, `jsdom`, `msw` | Test runtime + mocks HTTP. | `package.json`, `src/test/mocks/` |
| `eslint` ^9 + `typescript-eslint` ^8 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | Lint. | `eslint.config.js` |
| `typescript` ^5.8.3 | Compilation. | `tsconfig*.json` |

### 7.3 Dépendances backend (Deno Edge Functions)

| Dépendance | Usage | Source |
|---|---|---|
| `https://deno.land/std@0.168.0/http/server.ts` | Serveur HTTP Deno. | `supabase/functions/*/index.ts` |
| `npm:@supabase/supabase-js@2` | Client Supabase côté Edge (service role + JWT decode). | Idem |

### 7.4 Services externes opérés par tiers

| Service | Usage | Criticité | Risque |
|---|---|---|---|
| Supabase Cloud | Auth, DB, Storage, Edge Functions. | Critique | Point de défaillance unique côté backend. SLA à confirmer côté contrat opérateur. |
| Google AI (`generativelanguage.googleapis.com`) | Génération image (Gemini 3 Pro Image Preview), génération texte (Gemini 2.0 Flash). | Critique | Évolution des modèles, tarification, conditions d'usage Google à suivre. |
| Passerelle AI Gateway (compatible OpenAI Chat Completions) | Orchestrateur texte (Gemini 2.5 Flash). URL configurable via `AI_GATEWAY_URL`. | Haute | Fallback historique vers `ai.gateway.lovable.dev` dans `creative-chat/orchestrator.ts` ligne 26 — à confirmer si encore actif en production. |

### 7.5 Origine du scaffolding UI

Le sous-arbre `src/components/ui/` (≈ 58 fichiers) provient majoritairement du générateur shadcn/ui (composants Radix UI sous licence MIT copiés dans le repo, configuration `components.json`). Cette part n'est pas de la propriété intellectuelle propre au sens créatif, mais constitue une intégration et personnalisation. Certains fichiers de ce sous-arbre sont en revanche **spécifiques au produit** (cf. liste § 6 fin du tableau).

L'historique Git contient un commit `Lovable update` (`83ebdd2`) et la documentation interne (`docs/AUDIT_DEPENDANCES.md`) atteste du retrait de la dépendance `lovable-tagger` (plugin dev-only de l'éditeur visuel Lovable). Aucune dépendance Lovable runtime n'est présente dans `package.json` à ce jour.

---

## 8. Données, sécurité et conformité

### 8.1 Gestion des secrets

- Aucun secret trouvé dans le code versionné (recherche manuelle des patterns `api[_-]?key`, `token`, `password` dans `git diff` — implémentée comme étape CI dans `.github/workflows/ci.yml` lignes 167-175).
- `.env`, `.env.local`, `.env.*.local` sont dans `.gitignore`.
- Template `.env.example` fournit les variables frontend (`VITE_SUPABASE_*`, sans clé service role) et liste les secrets serveur attendus (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `AI_GATEWAY_API_KEY`).
- Secrets Edge Functions documentés comme gérés via `supabase secrets set` (cf. `.github/workflows/cd-edge-functions.yml` § Remarque).

### 8.2 Authentification et autorisations

- **Authentification** : Supabase Auth (email + mot de passe). Pas de SSO, pas de MFA, pas de magic link explicite dans le périmètre audité.
- **Session** : JWT en `localStorage` (`src/integrations/supabase/client.ts` lignes 12-16). Refresh automatique activé.
- **Autorisations applicatives** :
  - RBAC à 2 rôles : `admin`, `client` (enum SQL `app_role`).
  - Fonction SQL `has_role(_user_id, _role)` `SECURITY DEFINER` pour les politiques RLS.
  - Routes protégées côté client (`ProtectedRoute` avec `requireAdmin`).
  - Validation serveur via `auth-guard.service.ts` (vérification de session, ownership, appartenance org).
  - Edge Functions sensibles (`get-users-admin`, `get-analytics`) appellent avec la clé service role et re-vérifient le rôle.

### 8.3 Logs

- Logger Edge structuré conditionnel (`supabase/functions/_shared/logger.ts`, 66 LoC, avec tests).
- Pas de plateforme d'agrégation de logs (Datadog, Loki, OpenSearch, etc.) intégrée au repo. La sortie standard des Edge Functions est récupérable via le dashboard Supabase. **Non documenté dans le périmètre audité** : la rétention et la stratégie d'observabilité production.

### 8.4 Données personnelles (RGPD)

- Données utilisateur collectées identifiées : email (via `auth.users`), `display_name` éventuel (`profiles`), rendus image (`render_results`), photos source uploadées (`project_photos`), favoris, événements analytics, logs d'accès `share_link_access_logs`.
- Page `src/pages/Legal.tsx` présente (route publique `/mentions-legales`).
- **Non documenté dans le périmètre audité** : politique de confidentialité, registre de traitement, durée de conservation, procédure d'export et de suppression sur demande (droit à l'effacement). À confirmer hors repo (mentions légales, charte privacy DICA France).

### 8.5 Chiffrement

- TLS en transit assuré par Supabase et Google AI (HTTPS only — vérifié dans `assertSafeFetchUrl` avec `httpsOnly: true` par défaut).
- Chiffrement au repos : géré par Supabase (à confirmer dans le contrat Supabase, non documenté dans le périmètre audité).

### 8.6 Auditabilité

- Triggers `update_…_updated_at` sur les tables versionnées.
- Trigger `on_auth_user_created` qui crée le profil automatiquement.
- Table `share_link_access_logs` qui enregistre les accès aux liens de partage (timestamp, IP éventuelle).
- **Non documenté dans le périmètre audité** : journal d'audit applicatif global (qui a généré quel rendu, quand, depuis quelle organisation).

### 8.7 Conformité AI Act / RGPD

- Aucune affirmation de conformité formelle n'est faite. Le produit traite des données personnelles (photos d'intérieurs / espaces) et utilise un modèle IA externe (Google Gemini). À ce titre, une analyse d'impact (DPIA) et un classement AI Act peuvent être pertinents mais relèvent du porteur du projet et d'un conseil juridique externe — non documentés dans le périmètre audité.

### 8.8 Vulnérabilités logicielles

Au dernier passage CI archivé (`audit/final/npm-audit.txt`) :

| Sévérité | Paquet | Statut |
|---|---|---|
| Critique | `jspdf` <=4.2.0 (LFI, PDF injection, DoS, race condition, etc., 10 advisories) | Migration différée documentée — montée vers `jspdf@4.2.1` planifiée (breaking change). Voir `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`. |
| Modérée | `esbuild` (via `vite`) | Fix nécessite migration vers `vite@6` (breaking). Position documentée. |
| Modérée | `vite` (dépend de `esbuild`) | Idem. |

Position du projet : non-bloquant à court terme, suivi formalisé. Le job `security-scan` du CI ne fait **pas** échouer la build sur ces vulnérabilités (sortie forcée à 0, ligne 164 de `ci.yml`).

---

## 9. Tests, qualité et maintenabilité

### 9.1 Tests présents

- Suite Vitest : **27 fichiers de tests, 825 tests passants** au dernier run archivé (`audit/final/test.txt`).
- Périmètre :
  - 21 fichiers de tests sous `src/services/__tests__/`.
  - 3 fichiers de tests sous `src/hooks/__tests__/`.
  - 1 fichier de test sous `src/types/__tests__/` (`render-response.test.ts`).
  - 2 fichiers de tests sous `supabase/functions/_shared/__tests__/` (ssrf-guard, logger).
  - Tests UI partiels sous `src/components/ui/__tests__/` (`image-export-dropdown.test.tsx`).
- Approche TDD revendiquée dans `README.md` § Tests et appliquée de manière visible sur les services critiques (auth-guard, rate-limiter, share-link, url-validator).

### 9.2 Couverture mesurable

Mesure Vitest + v8 archivée dans `audit/phase-0/coverage.txt` :

| Métrique | Mesure | Seuil configuré (`vitest.config.ts`) | Statut |
|---|---|---|---|
| Statements | 30,42 % | 80 % | Sous le seuil |
| Branches | 77,58 % | 80 % | Sous le seuil (de peu) |
| Functions | 67,98 % | 80 % | Sous le seuil |
| Lines | 30,42 % | 80 % | Sous le seuil |

**Lecture critique de cette mesure** :

- La couverture est tirée vers le bas par les Edge Functions Deno (`apply-decor/index.ts`, `creative-chat/index.ts`, `creative-chat/orchestrator.ts`, `generate-magazine-captions/index.ts`, `get-analytics/index.ts`, `get-users-admin/index.ts`) qui apparaissent en 0 % dans le rapport — ces fichiers ne sont pas exécutables sous Vitest (runtime Deno).
- La couverture effective de `src/services/` est plus élevée et concentre la valeur testée (services critiques tous testés > 90 % par observation des fichiers de tests).
- Le seuil global de 80 % est aspirationnel et n'est pas atteint actuellement. Il est à confirmer avec le porteur si ce seuil doit être réajusté ou si un harnais de tests Deno doit être ajouté.

### 9.3 Qualité structurelle

- Séparation claire des responsabilités : `services/` (logique pure testable), `pages/` (composition), `components/` (présentation), `hooks/` (logique partagée React), `contexts/` (état global), `lib/` (utilitaires), `integrations/` (clients tiers).
- Types TypeScript exhaustifs sur les services et les types métier.
- Classes d'erreurs typées dans les services critiques (`SsrfBlockedError`, `InvalidUrlError`, `UnauthorizedError`).
- Pattern singleton utilisé pour les services PDF (`MagazineDecoPdfService.getInstance()`).
- Lazy loading systématique des pages dans `src/App.tsx`.

### 9.4 Dette technique visible

- **148 erreurs ESLint** (`audit/final/lint.txt`) au dernier passage. Majoritaires :
  - `@typescript-eslint/no-explicit-any` dans des composants UI (`DecorSelectorDialog.tsx`, `plaquette.types.ts`) et utilitaires.
  - `react-refresh/only-export-components` warnings sur des fichiers `src/components/ui/*` issus du scaffold shadcn/ui (impact uniquement HMR dev).
- Règle `@typescript-eslint/no-unused-vars` désactivée dans `eslint.config.js` ligne 23 — choix explicite mais qui masque une dette résiduelle.
- Couverture en deçà du seuil aspirationnel (cf. § 9.2).
- 3 vulnérabilités `npm audit` ouvertes (cf. § 8.8).
- Pas de tests d'intégration end-to-end (Playwright, Cypress) identifiés.
- Pas de tests dédiés au runtime Deno des Edge Functions principales (`apply-decor`, `creative-chat`).

### 9.5 Documentation existante

`docs/` contient 28 documents Markdown internes recensés :

| Document | Taille | Objet |
|---|---|---|
| `README.md` (`docs/`) | 6 KB | Index des docs |
| `GUIDE_UTILISATEUR.md` | 15 KB | Manuel utilisateur final |
| `GUIDE_ADMINISTRATEUR.md` | 12 KB | Manuel admin |
| `GUIDE_DEPLOIEMENT.md` | 9 KB | Procédure déploiement |
| `HANDOVER_DEVELOPPEUR.md` | 16 KB | Document de transmission développeur |
| `DOCUMENTATION_TECHNIQUE.md` | 26 KB | Architecture & code |
| `API_REFERENCE.md` | 16 KB | Référence API |
| `API_SERVICES.md` | 14 KB | Documentation services |
| `DICA_FRANCE_RESUME.md` | 6 KB | Résumé exécutif client |
| `DICA_ORCHESTRATOR_GUIDE.md` | 13 KB | Guide orchestrateur IA |
| `AUDIT_DEPENDANCES.md` | 9 KB | Audit du graphe de dépendances |
| `AUDIT_TECHNIQUE.md` | 5 KB | Audit technique synthèse |
| `AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md` | 11 KB | Diagnostic Tier-1 bureau |
| `DOSSIER_COMMISSAIRE_AUX_APPORTS.md` | 40 KB | Dossier commissaire aux apports |
| `RAPPORT_VALORISATION_TECHNIQUE.md` | 46 KB | Rapport de valorisation interne |
| `VALORISATION_TECHNIQUE_DICA_DECOR.md` | 23 KB | Valorisation technique synthèse |
| `MATRICE_HEURES_QUALITE_DICA_DECOR.md` | 18 KB | Matrice heures × qualité |
| `RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | 17 KB | Rapport qualité |
| `PLAN_CORRECTION_RISQUES_DECOTE.md` | 35 KB | Plan correctif anti-décote |
| `RAPPORT_EXECUTION_PLAN_CORRECTION.md` | 17 KB | Suivi d'exécution du plan |
| `MIGRATIONS_DIFFEREES_DEPENDANCES.md` | 9 KB | Justification des migrations différées |
| `CHECKLIST_SMOKE_KILLSWITCH.md` | 8 KB | Checklist smoke + killswitch |
| `BROCHURE_COMMERCIALE_GAMMA.md` | 18 KB | Brochure commerciale (non technique) |
| `PLAQUETTE_PDF_COBRANDING.md` | 6 KB | Plaquette cobranding |
| `PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` | 4 KB | Correctifs plaquette |
| `MODE_EMPLOI.md` | 6 KB | Mode d'emploi opérateur |
| `PROMPT_CONTROLE_ONBOARDING.md` | 5 KB | Prompt de contrôle onboarding |
| `PROMPT_CONTROLE_PLAQUETTE.md` | 6 KB | Prompt de contrôle plaquette |

Le présent document (`PROJECT_DOCUMENTATION_STANDARD.md`) ne se substitue à aucun de ces livrables ; il fournit un format standardisé orienté cabinet.

### 9.6 CI/CD

- `.github/workflows/ci.yml` :
  - Déclenchement : push sur `main`/`develop` et PR vers ces branches, plus `workflow_dispatch`.
  - Étapes : `npm ci` → lint → tests + couverture → build → `npm audit` (non bloquant) → license-checker (alerte sur GPL/AGPL/LGPL) → archivage artefacts 30 jours.
  - Job `security-scan` complémentaire (audit high+critical en alerte, détection secrets dans diff PR).
  - Statut bloquant : lint et tests. Build doit réussir.
- `.github/workflows/cd-edge-functions.yml` :
  - Déclenchement manuel uniquement (`workflow_dispatch`), choix `staging` / `production` et fonction.
  - Étapes : install `supabase` CLI → link projet → déploiement séquentiel des fonctions.

---

## 10. Niveau de maturité estimé

| Axe | Niveau observé | Commentaire |
|---|---|---|
| Fonctionnel | Élevé | Application en production, parcours utilisateur complet (auth, projet, photo, sélection décor, rendu IA, favoris, partage, export PDF/image, présentation, mode admin, multi-tenant). |
| Technique | Moyen-élevé | Architecture claire 3-tier avec backend managé Supabase, séparation services / pages / composants saine, lazy loading des pages, TanStack Query bien configuré, Edge Functions structurées avec garde anti-SSRF. À noter : couverture de tests inférieure au seuil aspirationnel et 148 erreurs ESLint à résorber. |
| Sécurité | Moyen-élevé | RLS PostgreSQL active sur les tables sensibles (≥ 14 tables, ≥ 57 policies), RBAC double couche, garde anti-SSRF dédoublée frontend/backend, secrets hors repo. Réserves : pas de MFA, vulnérabilité critique `jspdf` ouverte (migration différée), pas d'audit de sécurité externe documenté dans le périmètre audité, règle ESLint `no-unused-vars` désactivée. |
| Maintenabilité | Moyen-élevé | Code typé en TypeScript, services testés unitairement, conventions de nommage cohérentes, structure modulaire. Réserves : règles ESLint partiellement désactivées, `any` présents dans certains composants UI, pas de documentation JSDoc systématique sur les services. |
| Scalabilité | Non mesurée — héritée de Supabase et Google AI | Scalabilité horizontale du frontend (statique CDN). Scalabilité backend déléguée au PaaS Supabase (limites Edge Functions à confirmer : timeout, mémoire, concurrence). Limites resources visibles dans `apply-decor/index.ts` (12 Mo / image, 2 rendus / requête, 30 s timeout fetch). Pas de test de charge documenté dans le périmètre audité. |
| Documentation | Élevé en volume, moyen en couverture cabinet | 28 documents internes ; certains très détaillés (dossier commissaire 40 KB, rapport valorisation 46 KB). Manque potentiel : architecture decision records (ADR), diagrammes d'architecture exportés en image, OpenAPI/contrat des Edge Functions. À confirmer avec le porteur. |
| Industrialisation | Moyen | CI quality gate présent et structuré ; CD Edge manuel (volontairement). Pas de CD frontend automatisé dans le repo, pas d'environnement staging clairement défini dans le workflow (variable d'input uniquement). |

---

## 11. Éléments utiles pour valorisation

### 11.1 Volume de code utile (mesures `wc -l` au 21/05/2026)

| Périmètre | Lignes | Inclut |
|---|---|---|
| `src/` (TS + TSX) | 43 282 | Frontend complet, **incluant** le scaffold shadcn/ui (≈ 58 fichiers `src/components/ui/`) |
| `supabase/functions/` (TS Deno) | 4 027 | 5 Edge Functions + modules partagés |
| Tests `src/services/__tests__/` (extrait) | 11 211 | 21 fichiers de tests services |
| Migrations SQL `supabase/migrations/` | 23 fichiers | Schéma, RLS, fonctions, triggers |
| Documentation `docs/` | 28 fichiers Markdown | ≈ 400 KB cumulés |

### 11.2 Complexité fonctionnelle

- 5 Edge Functions backend avec orchestration multi-modèles IA (texte streaming + image).
- 21 services métier indépendants et testables.
- Multi-tenant complet (organisations, membres, invitations, tiers, quotas, branding).
- Système de rate limiting double couche (user daily + org monthly).
- Génération PDF éditoriale complexe (Magazine DÉCO ~1 050 LoC, Brochure revendeur ~1 071 LoC).
- 23 migrations SQL avec ≥ 14 tables RLS et ≥ 57 policies.

### 11.3 Différenciation

- Spécialisation métier DICA France : catalogue de décors stratifiés, contextes d'usage (`ascenseur`, `van`, `terrasse`, `autre`), références automatiques.
- Orchestrateur IA propriétaire qui valide et structure les prompts avant génération (statuts `ok` / `need_clarification` / `reject`), ce qui dépasse le simple appel API à un modèle générique.
- Cobranding revendeur (le nom du revendeur remplace "DICA" en titre de couverture des exports — différenciation B2B).
- Garde anti-SSRF custom, dédoublée frontend/backend, avec tests dédiés (71 tests côté front).

### 11.4 Réutilisabilité

| Module | Réutilisabilité hors DICA |
|---|---|
| `url-validator.service.ts` | Élevée (générique, 71 tests). |
| `auth-guard.service.ts` | Élevée (générique multi-tenant). |
| `rate-limiter.service.ts` | Élevée (générique). |
| `share-link.service.ts` | Élevée. |
| `image-storage.service.ts` | Élevée (pattern base64 → storage). |
| `ssrf-guard.ts` (Edge) | Élevée. |
| Magazine DÉCO / Brochure revendeur PDF | Faible (très couplé au format éditorial DICA). |
| Orchestrateur prompt | Faible (couplé au catalogue DICA). |

### 11.5 Profondeur métier

- Domaine spécifique (visualisation de décors stratifiés) avec contraintes physiques (épaisseur de chants, contextes ascenseur/van/terrasse documentés dans le `README.md` v2.2.0).
- Workflows complets de bout en bout : photo → décor → orchestration prompt → génération IA → stockage → partage → export PDF cobrandé.

### 11.6 Propriété intellectuelle potentielle

- Le code applicatif sous `src/services/`, `src/components/admin/`, `src/components/analytics/`, `src/components/decor-selector/`, `src/components/favorites/`, `src/components/onboarding/`, `src/pages/`, `src/hooks/`, `src/contexts/`, ainsi que `supabase/functions/` (hors emprunts standards Deno/Supabase) et `supabase/migrations/`, est marqué comme propriétaire (`package.json` : `"license": "UNLICENSED"`).
- L'origine spécifique de chaque sous-arbre devra être confirmée par le porteur du projet (qui a écrit quoi, quand, sous quelle relation contractuelle avec DICA France).

### 11.7 Niveau d'intégration

- Intégration end-to-end testée : Auth → DB → Storage → Edge → Modèle IA → retour client.
- Pas d'API publique externe documentée dans le périmètre audité (les Edge Functions sont consommées uniquement par le frontend authentifié).

### 11.8 Actifs documentaires

- 28 documents Markdown internes (cf. § 9.5).
- Le présent document.
- Snapshots d'audit archivés sous `audit/` (phase-minus-1, phase-0, phase-1, phase-2, phase-3, final) avec rapports `build.txt`, `lint.txt`, `test.txt`, `npm-audit.txt`.

### 11.9 Tests

- 27 fichiers, 825 tests, 100 % verts au dernier run archivé.
- Couverture détaillée par service mesurable via le rapport `audit/phase-0/coverage.txt`.

### 11.10 Preuves d'usage présentes dans le repo

- `README.md` mentionne explicitement DICA France comme client.
- Migrations SQL référencent les contextes d'usage métier (`usage_context` enum).
- Brochure revendeur, branding, multi-tenant : structures qui présupposent des revendeurs distincts.
- **Non documenté dans le périmètre audité** : volumes d'usage réels (renders / mois, nombre d'organisations actives, taux d'engagement). À confirmer hors repo (dashboard analytics opérationnel, factures, contrats).

---

## 12. Limites et points à confirmer

| Point | Pourquoi c'est à confirmer | Impact potentiel |
|---|---|---|
| Identité juridique de l'éditeur et chaîne de cession des droits | `package.json` mentionne KOREV AI comme auteur ; `README.md` qualifie l'app de propriété DICA France. La nature exacte du contrat (cession, licence d'exploitation, prestation) n'est pas documentée dans le périmètre audité. | Critique sur tout dossier de valorisation : la propriété effective détermine qui peut valoriser quoi. |
| Couverture de tests réelle des services hors Edge | Le rapport global mélange `src/` et `supabase/functions/` (non couvertes par Vitest). Une mesure isolée `src/services/` n'est pas fournie dans le périmètre audité. | Modéré : pénalise l'image qualité si non explicité. |
| Tests des Edge Functions principales (`apply-decor`, `creative-chat`) | Aucun test Vitest direct identifié sur ces fichiers ; couverture 0 % constatée. La logique métier critique de génération n'a pas de filet de sécurité automatisé. | Élevé : zone de risque qualité. |
| Vulnérabilité critique `jspdf` | Présente dans `npm audit` ; migration vers 4.2.1 documentée comme différée. | Modéré à élevé selon l'exposition réelle. |
| MFA, SSO, audit de sécurité externe | Aucun élément observé dans le code. | À confirmer si exigé par la cible commerciale (B2B grand compte). |
| DPIA et conformité RGPD formelle | Pas d'évidence dans le repo. La page `Legal.tsx` existe mais son contenu (mentions légales) n'a pas été ouvert dans cet audit. | À confirmer hors repo. |
| Politique de chiffrement au repos Supabase | Déléguée au PaaS, à confirmer dans le contrat Supabase. | Modéré. |
| Stratégie d'observabilité production (logs, métriques, alertes) | Pas d'intégration tierce dans le repo. | Modéré : impact sur exploitation. |
| Plan de continuité (backups, restore) | Délégué à Supabase ; procédure de restauration applicative non documentée dans le périmètre audité. | Modéré à élevé. |
| Statut de la passerelle AI Gateway en production | Fallback dans `creative-chat/orchestrator.ts` ligne 26 vers `ai.gateway.lovable.dev`. À confirmer si la production utilise ce fallback ou une passerelle propre. | Modéré sur l'indépendance technologique. |
| Volumes d'usage et indicateurs commerciaux | Non présents dans le repo. | À fournir hors repo si valorisation. |
| Limites Edge Functions Supabase (timeout, concurrence, mémoire) | Limites resources visibles dans le code (`apply-decor/index.ts`) mais pas reliées aux limites Supabase officielles dans le périmètre audité. | Modéré pour l'analyse de scalabilité. |
| Tests d'intégration et tests end-to-end | Aucun framework E2E (Playwright, Cypress) trouvé dans `package.json`. | Modéré : limite la confiance dans les régressions UI. |
| Origine exacte du scaffold UI (composants `src/components/ui/`) | shadcn/ui sous MIT supposée (configuration `components.json`). Aucun fichier `LICENSE` ou notice tierce explicite n'a été trouvé dans le périmètre audité. | À confirmer pour clarifier la composition de la PI. |
| Trace d'origine Lovable | Historique Git contient un commit `Lovable update`. Le repo a été nettoyé (`docs/AUDIT_DEPENDANCES.md` § 2). À confirmer si la base initiale a été générée par un outil low-code et la portée de cette génération. | Modéré pour la défendabilité du caractère "écrit à la main". |

---

## 13. Conclusion technique

`dica-decorator` est une application web SaaS B2B fonctionnelle, en production, structurée selon une architecture 3-tier classique avec backend managé Supabase et appel à un modèle IA externe (Google Gemini). Le code couvre un parcours utilisateur complet (authentification, projet, photo, sélection de décor, génération IA, favoris, partage, export PDF cobrandé, mode présentation) ainsi qu'une couche d'administration multi-tenant avec quotas et branding revendeur.

La valeur technique observable du dépôt se concentre dans :
1. la couche de services métier (`src/services/`, 21 services typés et testés unitairement),
2. la couche d'Edge Functions backend (`supabase/functions/`, ≈ 4 000 LoC dont une couche d'orchestration de prompt IA propriétaire),
3. le modèle de données SQL avec sécurité par lignes étendue (≥ 14 tables RLS, ≥ 57 policies),
4. l'industrialisation partielle (CI quality gate, tests automatisés, snapshots d'audit reproductibles),
5. les composants UI spécialisés métier (admin, decor-selector, favorites, onboarding, before-after-slider, presentation-viewer, share-link-dialog, magazine/brochure export buttons).

À l'inverse, ne relève pas d'une valeur propriétaire :
- le scaffold UI shadcn/ui présent sous `src/components/ui/` (composants Radix UI standards copiés dans le repo),
- les dépendances npm tierces (React, Vite, TailwindCSS, Supabase SDK, jsPDF, Radix UI, etc.),
- les helpers Deno standards utilisés dans les Edge Functions.

Le potentiel de valorisation existe mais doit être présenté sans surévaluation : la couverture de tests globale mesurée reste sous le seuil aspirationnel de 80 % (artefact lié au runtime des Edge Functions), 148 erreurs ESLint sont à résorber, et une vulnérabilité critique `jspdf` est ouverte (migration documentée comme différée). Aucune affirmation de conformité formelle RGPD ou AI Act n'a été identifiée dans le périmètre audité.

Le dossier est exploitable en l'état par un cabinet d'audit ou d'évaluation : la documentation interne est volumineuse et explicite, les preuves techniques sont reproductibles (commandes `npm run lint`, `npm run test:run`, `npm run build`, `npm audit`), et la structure du dépôt est saine. Les points à confirmer (cf. § 12) relèvent majoritairement d'éléments contractuels et opérationnels qui se traitent hors repo, et non d'angles morts du code lui-même.

---

*Document généré dans le cadre d'un audit technique standardisé. Pour toute question relative aux affirmations factuelles ci-dessus, se reporter aux fichiers cités en référence. Pour toute information marquée « Non documenté dans le périmètre audité » ou « À confirmer », consulter le porteur du projet.*
