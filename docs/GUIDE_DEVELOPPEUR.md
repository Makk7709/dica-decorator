# Guide développeur — DICA Decorator

> Document de prise en main pour un développeur rejoignant le projet. Complète
> [`HANDOVER_DEVELOPPEUR.md`](./HANDOVER_DEVELOPPEUR.md) (handover détaillé,
> alertes, credentials) et [`ARCHITECTURE.md`](./ARCHITECTURE.md) (vue
> d'ensemble technique).

| Champ | Valeur |
|---|---|
| Projet | `dica-decorator` v2.2.0 |
| Node requis | ≥ 20.0.0 |
| Dernière revue | 2026-06-13 |

---

## Table des matières

1. [Prérequis et installation](#1-prérequis-et-installation)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Scripts npm](#3-scripts-npm)
4. [Structure du code](#4-structure-du-code)
5. [Conventions](#5-conventions)
6. [Tests](#6-tests)
7. [Quality gate et CI](#7-quality-gate-et-ci)
8. [Edge Functions ( développement )](#8-edge-functions-développement)
9. [Ressources complémentaires](#9-ressources-complémentaires)

---

## 1. Prérequis et installation

### Outils

| Outil | Version | Usage |
|---|---|---|
| Node.js | ≥ 20.0.0 | Build, tests, dev server |
| npm | ≥ 10.0.0 | Gestionnaire de paquets |
| Git | 2.40+ | Versionnement |
| Supabase CLI | 1.200+ (optionnel) | Migrations, déploiement Edge Functions |
| Deno | 1.46+ (optionnel) | Exécution locale Edge Functions |

### Installation rapide

```bash
git clone <repository-url>
cd dica-decorator
npm install
cp .env.example .env.local
# Compléter VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Serveur de développement : **<http://localhost:8080>** (`vite.config.ts`).

### Vérification post-installation

```bash
npm run lint          # ESLint
npm run test:run      # Vitest (une passe)
npm run build         # Build production → dist/
```

Les chiffres de tests et lint évoluent ; source de vérité : exécution locale ou
artefacts CI (`audit/final/` si présents).

---

## 2. Variables d'environnement

### Frontend (`.env.local`)

Préfixe obligatoire `VITE_` pour exposition au client :

| Variable | Obligatoire | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Oui | URL API Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Oui | Clé anon (sécurisée par RLS) |
| `VITE_SUPABASE_PROJECT_ID` | Non | Identifiant projet |

Template : `.env.example`.

**Ne jamais** exposer `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY` ou clés
gateway côté frontend.

### Edge Functions (secrets Supabase)

Provisionnés via `supabase secrets set` :

| Secret | Usage |
|---|---|
| `SUPABASE_URL` | Auto-injecté en environnement Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injecté — accès admin DB |
| `GOOGLE_AI_API_KEY` | Appels directs Gemini (génération image) |
| `AI_GATEWAY_API_KEY` | Passerelle compatible OpenAI (orchestrateur, |
| `AI_GATEWAY_URL` | URL de la passerelle (défaut : endpoint Google OpenAI-c |

Voir [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) pour la procédure complète.

---

## 3. Scripts npm

| Script | Commande | Effet |
|---|---|---|
| Dev | `npm run dev` | Serveur Vite hot-reload |
| Build prod | `npm run build` | Sortie `dist/` |
| Build dev | `npm run build:dev` | Build mode développement |
| Preview | `npm run preview` | Aperçu du build |
| Lint | `npm run lint` | ESLint sur tout le repo |
| Tests watch | `npm run test` | Vitest interactif |
| Tests CI | `npm run test:run` | Vitest une passe |
| Couverture | `npm run test:coverage` | Vitest + rapport v8 |
| UI tests | `npm run test:ui` | Interface Vitest |
| E2E | `npm run test:e2e` | Playwright |
| E2E UI | `npm run test:e2e:ui` | Playwright mode interactif |
| Rapport E2E | `npm run test:e2e:report` | Affiche le rapport Playwright |

---

## 4. Structure du code

```text
src/
├── main.tsx              # Point d'entrée React
├── App.tsx               # Routes + providers (Query, Auth, Theme)
├── pages/                # Écrans (1 fichier ≈ 1 route)
├── components/
│   ├── ui/               # Composants shadcn/ui (génériques)
│   ├── admin/            # Composants administration
│   ├── analytics/        # Graphiques admin
│   ├── decor-selector/   # Sélecteur de décors
│   ├── favorites/        # Galerie favoris
│   └── onboarding/       # Modale bienvenue + checklist
├── services/             # Logique métier (TDD, tests co-localisés)
├── hooks/                # Hooks React réutilisables
├── contexts/             # AuthContext, ThemeContext
├── integrations/
│   └── supabase/         # Client, types générés
├── lib/                  # Utilitaires (utils, compression, signed URLs)
└── types/                # Types métier partagés

supabase/
├── migrations/           # SQL versionné
└── functions/            # Edge Functions Deno
    ├── apply-decor/
    ├── creative-chat/    # + orchestrator.ts
    ├── generate-magazine-captions/
    ├── get-analytics/
    ├── get-users-admin/
    └── _shared/          # ssrf-guard.ts, logger.ts

e2e/                      # Specs Playwright par page
```

### Alias de chemin

`@/` → `src/` (configuré dans `vite.config.ts` et `tsconfig`).

### Lazy loading

Toutes les pages sont importées via `React.lazy()` dans `App.tsx` pour optimiser
le bundle initial.

---

## 5. Conventions

### TypeScript

- Mode strict activé (`tsconfig.app.json`)
- Pas de `any` idéal ; dette documentée (~170 warnings ESLint `no-explicit-any`,
non bloquants)
- Types Supabase générés dans `src/integrations/supabase/types.ts`

### Services métier

- Un service = un fichier dans `src/services/`
- Tests co-localisés : `src/services/__tests__/<service>.test.ts`
- Les appels réseau sensibles passent par Supabase SDK ou
`supabase.functions.invoke()`

### Composants UI

- Composants génériques : `src/components/ui/` (shadcn/ui, Radix) — exclus de
l'audit Sonar (voir
[`adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md`](./adr/0001-exclusion-shadcn-ui-de-l-audit-sonar.md))
- Composants métier : sous-dossiers dédiés (`admin/`, `analytics/`, )

### Authentification et routes

- Contexte global : `AuthContext` (session, rôle, recovery)
- Garde : `ProtectedRoute` avec prop optionnelle `requireAdmin`
- Vérifications serveur : `auth-guard.service.ts`

### État serveur

- TanStack Query pour le cache des données Supabase
- Configuration par défaut : staleTime 5 min, gcTime 30 min, retry 1

### Commits et PR

1. Toute modification de logique métier doit inclure ou mettre à jour des tests
Vitest
2. CI verte avant merge (lint, tests, build)
3. Edge Functions : déploiement manuel via workflow CD (voir
[`DEPLOIEMENT.md`](./DEPLOIEMENT.md))

---

## 6. Tests

### Vitest (unitaires / intégration)

- Config : `vitest.config.ts` (si présent) ou intégré Vite
- Setup : `src/test/setup.ts`
- Mocks réseau : MSW (`src/test/mocks/handlers.ts`)
- Environnement DOM : happy-dom

```bash
npm run test:run          # CI — tous les tests
npm run test:coverage     # Avec couverture
npm run test -- path/to/file.test.ts   # Fichier ciblé
```

Les Edge Functions Deno ont leurs propres tests
(`supabase/functions/_shared/__tests__/`) exécutés séparément (runtime Deno, non
couverts par Vitest).

### Playwright (E2E)

Specs dans `e2e/` :

| Fichier | Page testée |
|---|---|
| `auth.spec.ts` | `/auth` (public, toujours exécuté) |
| `dashboard.spec.ts` | `/dashboard` |
| `project-detail.spec.ts` | `/project/:id` |
| `creative.spec.ts` | `/creative` |
| `admin.spec.ts` | `/admin` |

Les specs protégées sont **skip** en CI si `E2E_TEST_EMAIL` /
`E2E_TEST_PASSWORD` sont absents (voir `.github/workflows/e2e.yml`).

```bash
npm run test:e2e
npm run test:e2e:ui
```

---

## 7. Quality gate et CI

### Pipeline principal (`ci.yml`)

Déclenché sur PR et push vers `main` / `develop` :

1. `npm run lint` — bloquant si erreurs
2. `npm run test:coverage` — bloquant si échec
3. `npm run build` — bloquant si échec
4. `npm audit` — non bloquant (vulnérabilités suivies, voir
[`MIGRATIONS_DIFFEREES_DEPENDANCES.md`](./MIGRATIONS_DIFFEREES_DEPENDANCES.md))
5. Audit licences — non bloquant

Artefacts uploadés 30 jours (lint, tests, build, couverture, audit).

### E2E (`e2e.yml`)

Playwright sur PR et push branches principales. Rapport uploadé en artefact.

### CD Edge Functions

Workflow **manuel** uniquement : `.github/workflows/cd-edge-functions.yml`. Voir
[`DEPLOIEMENT.md`](./DEPLOIEMENT.md).

Description détaillée des pipelines : `.github/workflows/README.md`.

---

## 8. Edge Functions (développement)

### Structure

Chaque fonction = dossier sous `supabase/functions/<nom>/index.ts`.

Modules partagés : `supabase/functions/_shared/`.

### Développement local

```bash
supabase link --project-ref <project-ref>
supabase functions serve apply-decor --env-file .env.local
```

Les secrets locaux doivent être configurés (voir `.env.example` commentaires).

### Catalogue API

Endpoints, inputs/outputs : [`API_EDGE_FUNCTIONS.md`](./API_EDGE_FUNCTIONS.md).

Orchestrateur IA : [`DICA_ORCHESTRATOR_GUIDE.md`](./DICA_ORCHESTRATOR_GUIDE.md).

---

## 9. Ressources complémentaires

| Document | Quand le consulter |
|---|---|
| [`HANDOVER_DEVELOPPEUR.md`](./HANDOVER_DEVELOPPEUR.md) | Reprise complète du projet, credentials, alertes |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Vue d'ensemble 3 tiers, flux IA |
| [`DOCUMENTATION_TECHNIQUE.md`](./DOCUMENTATION_TECHNIQUE.md) | Stack détaillée, services TDD |
| [`API_EDGE_FUNCTIONS.md`](./API_EDGE_FUNCTIONS.md) | Référence Edge Functions |
| [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) | Mise en production |
| [`audit/PROJECT_DOCUMENTATION_STANDARD.md`](./audit/PROJECT_DOCUMENTATION_STANDARD.md) | Audit cabinet, maturité |
| [`MIGRATIONS_DIFFEREES_DEPENDANCES.md`](./MIGRATIONS_DIFFEREES_DEPENDANCES.md) | Vulnérabilités npm en migration |

---

© DICA France — base logicielle développée par KOREV AI.
