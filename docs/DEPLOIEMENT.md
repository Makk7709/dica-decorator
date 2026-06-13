# Déploiement — DICA Decorator

> Procédures opérationnelles de déploiement. Complète
> [`GUIDE_DEPLOIEMENT.md`](./GUIDE_DEPLOIEMENT.md) (guide historique détaillé)
> et [`CHECKLIST_SMOKE_KILLSWITCH.md`](./CHECKLIST_SMOKE_KILLSWITCH.md)
> (vérifications post-déploiement).

| Champ | Valeur |
|---|---|
| Projet | `dica-decorator` v2.2.0 |
| Dernière revue | 2026-06-13 |

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Environnements](#2-environnements)
3. [Déploiement frontend](#3-déploiement-frontend)
4. [Migrations base de données](#4-migrations-base-de-données)
5. [Déploiement Edge Functions](#5-déploiement-edge-functions)
6. [Secrets requis](#6-secrets-requis)
7. [CI/CD GitHub Actions](#7-cicd-github-actions)
8. [Post-déploiement](#8-post-déploiement)
9. [Documents connexes](#9-documents-connexes)

---

## 1. Vue d'ensemble

DICA Decorator se déploie en **deux composants indépendants** :

| Composant | Artefact | Méthode dans le repo |
|---|---|---|
| **Frontend** | Dossier statique `dist/`… | Build manuel ; hébergement CDN… |
| **Backend** | Supabase (DB, Auth, Storage, Edg… | Migrations SQL + déploiem… |

Aucun déploiement frontend automatique n'est configuré dans le dépôt.

---

## 2. Environnements

| Environnement | Usage | Configuration |
|---|---|---|
| **Local** | Développement | `.env.local`, `npm run dev` |
| **Staging** | Pré-production | Projet Supabase dédié (à configurer) |
| **Production** | Utilisateurs finaux | Projet Supabase production + CD |

L'URL de production frontend et les références de projet Supabase ne sont
**pas** codées en dur dans le repo — à configurer par l'opérateur.

---

## 3. Déploiement frontend

### Build

```bash
npm ci
npm run build
```

Sortie : dossier `dist/` (HTML, JS, CSS, assets).

Options :

- `npm run build:dev` — build mode développement (source maps)
- `npm run preview` — prévisualisation locale du build

### Hébergement

Le frontend est une **SPA statique**. Configuration requise :

1. Servir `dist/` sur un hébergeur statique (CDN, object storage + CDN, etc.)
2. **Fallback routing** : toutes les routes (`/dashboard`, `/project/:id`, )
doivent renvoyer `index.html` (React Router côté client)
3. Variables `VITE_*` injectées **au moment du build** (pas au runtime)

### Variables de build

À définir avant `npm run build` :

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>   # optionnel
```

---

## 4. Migrations base de données

Les migrations SQL sont versionnées dans `supabase/migrations/`.

### Application

```bash
# Lier le projet
supabase link --project-ref <project-ref>

# Appliquer les migrations
supabase db push
```

**Précautions** :

- Tester d'abord sur staging
- Sauvegarder la base production avant migration majeure
- Vérifier les policies RLS après migration

Aucun pipeline automatisé de migration n'est configuré dans
`.github/workflows/`.

---

## 5. Déploiement Edge Functions

### Option A — GitHub Actions (recommandée)

Workflow : `.github/workflows/cd-edge-functions.yml`

**Déclenchement** : manuel (`workflow_dispatch`) depuis l'onglet Actions GitHub.

Paramètres :

- **environment** : `staging` ou `production`
- **function** : nom d'une fonction spécifique, ou vide pour toutes

Secrets GitHub requis (par environnement) :

| Secret | Description |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token CLI Supabase |
| `SUPABASE_PROJECT_REF` | Référence du projet cible |

Le workflow exécute `supabase link` puis `supabase functions deploy` pour chaque
fonction.

### Option B — CLI locale

```bash
supabase login
supabase link --project-ref <project-ref>

# Déployer une fonction
supabase functions deploy apply-decor

# Déployer toutes les fonctions
for fn in apply-decor creative-chat generate-magazine-captions \
  get-analytics get-users-admin; do
  supabase functions deploy "$fn"
done
```

### Fonctions déployables

| Fonction | Fichier |
|---|---|
| `apply-decor` | `supabase/functions/apply-decor/index.ts` |
| `creative-chat` | `supabase/functions/creative-chat/index.ts` |
| `generate-magazine-captions` | `supabase/functions/generate-magazine |
| `get-analytics` | `supabase/functions/get-analytics/index.ts` |
| `get-users-admin` | `supabase/functions/get-users-admin/index.ts` |

---

## 6. Secrets requis

### Secrets Edge Functions (Supabase)

```bash
supabase secrets set GOOGLE_AI_API_KEY=<valeur>
supabase secrets set AI_GATEWAY_API_KEY=<valeur>
supabase secrets set AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

| Secret | Obligatoire | Usage |
|---|---|---|
| `SUPABASE_URL` | Auto | Injecté par Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Injecté par Supabase |
| `GOOGLE_AI_API_KEY` | Oui | Génération image Gemini directe |
| `AI_GATEWAY_API_KEY` | Oui | Orchestrateur + captions Magazine |
| `AI_GATEWAY_URL` | Recommandé | URL passerelle OpenAI-compatible |

**Ne jamais** committer de valeurs secrètes. Template sans valeurs :
`.env.example`.

### Secrets GitHub Actions (CI/CD)

| Secret | Workflow | Obligatoire |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | CD Edge | Oui (déploiement) |
| `SUPABASE_PROJECT_REF` | CD Edge | Oui (déploiement) |
| `VITE_SUPABASE_URL` | E2E | Facultatif |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | E2E | Facultatif |
| `E2E_TEST_EMAIL` | E2E | Facultatif (tests authentifiés) |
| `E2E_TEST_PASSWORD` | E2E | Facultatif |

---

## 7. CI/CD GitHub Actions

| Workflow | Fichier | Auto | Rôle |
|---|---|---|---|
| CI Quality Gate | `ci.yml` | PR + push | Lint, tests, build, audit |
| Quality Gate | `quality-gate.yml` | PR + push | Gate complémentaire |
| E2E Playwright | `e2e.yml` | PR + push | Tests caractérisation pages |
| CD Edge Functions | `cd-edge-functions.yml` | **Manuel** | Déploiement Ed… |

Description : `.github/workflows/README.md`.

---

## 8. Post-déploiement

Exécuter la checklist :
[`CHECKLIST_SMOKE_KILLSWITCH.md`](./CHECKLIST_SMOKE_KILLSWITCH.md).

Vérifications minimales :

1. Page `/auth` accessible
2. Connexion utilisateur test
3. Création projet + upload photo + génération rendu
4. Edge Function `apply-decor` répond (pas d'erreur 401/403/500)
5. Assistant créatif (`/creative`) — chat et génération image
6. Admin (`/admin`) — accès réservé au rôle admin
7. Quotas et rate limits fonctionnels

En cas d'incident IA : vérifier `GOOGLE_AI_API_KEY` et quotas Google AI Studio.

---

## 9. Documents connexes

| Document | Contenu |
|---|---|
| [`GUIDE_DEPLOIEMENT.md`](./GUIDE_DEP… | Guide historique (installation, Su… |
| [`GUIDE_DEVELOPPEUR.md`](./GUIDE_DEVELOPPEUR.md) | Setup local, scripts |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture 3 tiers |
| [`API_EDGE_FUNCTIONS.md`](./API_EDGE_F… | Référence Edge Functions |
| [`HANDOVER_DEVELOPPEUR.md`](./H… | Credentials, alertes opérationnelles |

---

© DICA France — base logicielle développée par KOREV AI.
