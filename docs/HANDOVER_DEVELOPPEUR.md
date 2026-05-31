# HANDOVER DÉVELOPPEUR — DICA Decorator

**Référence** : DICA-DEC-HAND-2026
**Date** : 06/05/2026
**Public visé** : Développeur senior reprenant le projet (intégrateur, mainteneur ou évaluateur).
**Objectif** : Permettre une prise en main complète **sans accès à l'auteur original**.

---

## 0. Lecture rapide

L'application est une SPA React 18 + TypeScript adossée à un backend Supabase. Pour une mise en route locale en moins de 30 minutes :

```bash
git clone <repository-url> dica-decorator
cd dica-decorator
cp .env.example .env.local   # ou créer manuellement (voir §3)
npm install
npm run dev                   # http://localhost:8080
```

Pour les Edge Functions et la base, **un projet Supabase distant** est déjà déployé (référence `urkftxznsynmvkskytih` en région UE). Les credentials d'accès sont à demander au porteur de l'actif.

---

## 1. Prérequis machine

| Outil | Version recommandée | Pourquoi |
|-------|---------------------|----------|
| Node.js | **20 LTS ou 22 LTS** | Le projet build sur 18.x mais une dépendance transitive (`type-fest@5`) requiert ≥20 |
| npm | 10+ | Lockfile au format `package-lock.json` v3 |
| Git | 2.40+ | — |
| Supabase CLI (optionnel) | 1.200+ | Pour développement local des Edge Functions |
| Deno (optionnel) | 1.46+ | Pour exécuter localement les Edge Functions hors Supabase CLI |

> Le projet est officiellement géré par **npm** avec `package-lock.json`. Tout autre lockfile (Bun, pnpm, yarn) doit être régénéré localement par le développeur s'il le souhaite, mais n'est pas commité.

---

## 2. Installation

```bash
# 1. Cloner
git clone <repository-url> dica-decorator
cd dica-decorator

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement (voir §3)
cp .env.example .env.local        # si .env.example existe
#   sinon créer .env.local manuellement

# 4. Vérifier que tout marche
npm run lint        # ESLint (dette documentée — voir §9)
npm run test:run    # 808/811 tests passants (3 pré-existants en échec)
npm run build       # Build de production
npm run dev         # Serveur de développement → http://localhost:8080
```

---

## 3. Variables d'environnement

### 3.1 Frontend (`.env.local` — préfixe `VITE_`)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL de l'API Supabase (`https://<project>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Clé anon publique (sécurisée par RLS — sa diffusion est sans danger côté frontend) |
| `VITE_SUPABASE_PROJECT_ID` | ➖ | Identifiant projet (utilisé par certaines intégrations) |

### 3.2 Backend Edge Functions (à provisionner via `supabase secrets set`)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `SUPABASE_URL` | ✅ | URL Supabase (auto-injectée en environnement Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role (auto-injectée — **NE JAMAIS exposer côté frontend**) |
| `GOOGLE_AI_API_KEY` | ✅ | Clé Google AI Studio pour Gemini 3 Pro Image Preview (génération d'images) |
| `AI_GATEWAY_API_KEY` | ✅ (ou fallback `LOVABLE_API_KEY`) | Clé d'accès à la passerelle AI Gateway compatible OpenAI Chat Completions (orchestration et captions Magazine DÉCO) |
| `AI_GATEWAY_URL` | ➖ | URL de la passerelle AI Gateway (par défaut : `https://ai.gateway.lovable.dev/v1/chat/completions` pour rétrocompatibilité ; recommandation : pointer vers Google AI Studio OpenAI-compatible, Vertex AI ou un gateway interne — voir `docs/AUDIT_DEPENDANCES.md` §4) |

> ⚠️ La variable historique `LOVABLE_API_KEY` reste lue en fallback **uniquement par compatibilité ascendante**. Tout nouveau déploiement doit utiliser `AI_GATEWAY_API_KEY`.

### 3.3 Provisionnement des secrets Supabase

```bash
supabase secrets set GOOGLE_AI_API_KEY=...
supabase secrets set AI_GATEWAY_API_KEY=...
supabase secrets set AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

---

## 4. Architecture en bref

```
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND (Vite SPA, dist/ statique sur CDN)                    │
│   src/pages → src/components + src/services + src/hooks         │
│   shadcn/ui (Radix), TanStack Query, react-hook-form + zod      │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTPS + JWT
┌──────────────────────────────┴─────────────────────────────────┐
│  SUPABASE CLOUD (région UE)                                     │
│   Auth (JWT) · Postgres 17.6 (RLS) · Storage (3 buckets)        │
│   Edge Functions Deno : apply-decor · creative-chat ·           │
│   generate-magazine-captions · get-analytics · get-users-admin  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┴─────────────────────────────────┐
│  GOOGLE GEMINI                                                  │
│   3 Pro Image Preview (image)  ·  2.5 Flash/Pro (texte)         │
└────────────────────────────────────────────────────────────────┘
```

Voir `docs/DOCUMENTATION_TECHNIQUE.md` et `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` pour le détail.

---

## 5. Setup Supabase

### 5.1 Création / association du projet

```bash
# Si projet déjà existant
supabase login
supabase link --project-ref urkftxznsynmvkskytih

# Si nouveau projet
supabase init
supabase projects create dica-decorator-staging
```

### 5.2 Migrations

```bash
# Appliquer toutes les migrations sur le projet lié
supabase db push

# Inspecter le schéma
supabase db pull            # exporte le schéma distant
supabase migration list     # liste les migrations
```

### 5.3 Buckets Storage

Trois buckets sont nécessaires :

| Bucket | Limite | MIME | Usage |
|--------|-------:|------|-------|
| `decor-textures` | 10 MB | images | Textures du catalogue DICA |
| `project-photos` | 20 MB | images | Photos uploadées par les revendeurs |
| `render-results` | 20 MB | images | Rendus IA générés |

À provisionner via le dashboard Supabase ou via SQL :

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('decor-textures', 'decor-textures', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('project-photos', 'project-photos', false, 20971520, ARRAY['image/png','image/jpeg','image/webp']),
  ('render-results', 'render-results', false, 20971520, ARRAY['image/png','image/jpeg','image/webp']);
```

### 5.4 Edge Functions

```bash
# Déployer une fonction
supabase functions deploy apply-decor
supabase functions deploy creative-chat
supabase functions deploy generate-magazine-captions
supabase functions deploy get-analytics
supabase functions deploy get-users-admin

# Test local
supabase functions serve apply-decor --env-file .env.local
```

### 5.5 RLS

L'ensemble des tables métier a déjà la RLS activée via les migrations (`supabase/migrations/*.sql`). Vérifier dans le dashboard Supabase → Authentication → Policies.

---

## 6. Workflows développeur

### 6.1 Scripts npm

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur Vite (port 8080) avec HMR |
| `npm run build` | Build de production (`dist/`) |
| `npm run build:dev` | Build avec sourcemaps et sans minification |
| `npm run preview` | Prévisualiser le build de production localement |
| `npm run lint` | ESLint (dette documentée, non bloquante) |
| `npm run test` | Tests en mode watch |
| `npm run test:run` | Tests une fois |
| `npm run test:coverage` | Tests avec couverture (à activer pour publication) |
| `npm run test:ui` | Interface UI Vitest |
| `npm run test:watch` | Tests en mode watch (alias) |

### 6.2 Convention de commits

L'historique respecte une convention proche de Conventional Commits :

| Préfixe | Usage |
|---------|-------|
| `feat(<scope>):` | Nouvelle fonctionnalité |
| `fix(<scope>):` | Correctif de bug |
| `chore(<scope>):` | Outillage, dépendances, valorisation |
| `perf(<scope>):` | Optimisation performance |
| `refactor(<scope>):` | Refactor sans changement fonctionnel |
| `docs(<scope>):` | Documentation |
| `test(<scope>):` | Tests |

### 6.3 Branche

- `main` : branche stable, déployée en production.
- Branches feature à créer ponctuellement, mergées par PR.

---

## 7. Déploiement

### 7.1 Frontend

Le frontend est un build statique (`dist/`) déployable sur tout hébergeur compatible CDN :

| Cible | Procédure |
|-------|-----------|
| Vercel | Connecter le repo, framework `Vite`, command `npm run build`, output `dist`, variables `VITE_*` |
| Netlify | Idem, `publish directory` = `dist` |
| OVH / S3 + CloudFront / Nginx | `npm run build` puis upload manuel ou via CI |

⚠️ Configurer le **rewrite SPA** : toutes les routes inconnues doivent renvoyer `index.html` (sinon les routes profondes 404).

### 7.2 Backend (Supabase Cloud)

```bash
# Migrations
supabase db push

# Edge Functions (toutes)
for fn in apply-decor creative-chat generate-magazine-captions get-analytics get-users-admin; do
  supabase functions deploy $fn
done

# Secrets
supabase secrets set GOOGLE_AI_API_KEY=... AI_GATEWAY_API_KEY=...
```

Voir `docs/GUIDE_DEPLOIEMENT.md` pour la procédure complète.

---

## 8. Tests

### 8.1 Lancer la suite

```bash
npm run test:run                     # tout
npm run test:run -- src/services    # ciblé services
npm run test:run -- --reporter verbose
```

### 8.2 Tests par catégorie

| Catégorie | Localisation |
|-----------|--------------|
| Services métier | `src/services/__tests__/*.test.ts` (21 fichiers) |
| Hooks | `src/hooks/__tests__/*.test.ts` |
| Composants UI | `src/components/ui/__tests__/*.test.tsx` |
| Types / contrats | `src/types/__tests__/*.test.ts` |
| Configuration | `src/test/setup.ts`, `src/test/test-utils.tsx`, `src/test/mocks/` |

### 8.3 Tests pré-existants en échec

Voir `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` §3.4 — 3 tests dans `use-decor-context-cache.test.ts` désynchronisés du format de sortie réel. À aligner dans une prochaine itération (~0,5 j/h).

### 8.4 Coverage

```bash
npm run test:coverage
```

Les rapports apparaissent dans `coverage/` (gitignored).

---

## 9. Lint et dette technique

### 9.1 État actuel

- 172 erreurs ESLint, principalement `@typescript-eslint/no-explicit-any` dans :
  - `src/services/reseller-brochure-pdf.service.ts` (events jspdf)
  - `src/services/share-link.service.ts`
  - `src/test/test-utils.tsx`, `src/test/vitest.d.ts` (types de test)
  - Edge Functions (`apply-decor`, `creative-chat`, `generate-magazine-captions`, `get-analytics`, `get-users-admin`)
- 13 warnings (react-refresh)
- **Aucune erreur runtime**.

### 9.2 Plan de remédiation

Voir `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` §9 (~10 j/h cumulés).

### 9.3 Auto-fix immédiat possible

```bash
npx eslint . --fix     # corrige prefer-const + 2 lints automatiques
```

---

## 10. Catalogue de décors et données initiales

Le catalogue est stocké dans la table `decors` (Postgres) avec :

```sql
reference_code TEXT PRIMARY KEY     -- ex: "3020_BN_PF" ou "INOX-DICA-PAROI-3025-HR"
name           TEXT NOT NULL
category       TEXT                 -- metal | unis | marbre | bois | deco
surface        TEXT                 -- PAROI | SOL
finish         TEXT                 -- BRILLANT | SATIN | WOOD | TOUCH | etc.
texture_image_url TEXT              -- chemin bucket decor-textures
is_active      BOOLEAN DEFAULT true
```

L'admin peut CRUDer via `src/pages/Admin.tsx` → onglet Décors.

Les textures (108 images) sont à uploader dans le bucket `decor-textures`. Un dossier `assets/` à la racine contient des assets de référence.

---

## 11. Intégration IA

### 11.1 Flow `apply-decor` (rendu standard)

1. Frontend → `POST /functions/v1/apply-decor` avec `{ projectId, decorRef, sourceImageUrl, options }`
2. Edge → vérifie JWT + quota → fetch texture décor → construit prompt enrichi en anglais → appelle Gemini Image
3. Edge → parse réponse multimodale (image base64 + texte) → upload dans `render-results` → réponse JSON

### 11.2 Flow `creative-chat`

1. Frontend → `POST /functions/v1/creative-chat` avec `{ messages, decorContext, sourceImageUrls, imageLabels }`
2. Edge détecte le mode (texte vs image) :
   - **Image** : appelle l'orchestrateur (`orchestrator.ts`) → validation catalogue → prompt orchestré → Gemini Image
   - **Texte** : streaming SSE compatible OpenAI vers le frontend
3. Frontend affiche image ou stream

### 11.3 Flow `generate-magazine-captions`

1. Frontend → `POST` avec `{ projectName, projectType, decorLabel, decorReference, decorCategory, imageUrl }`
2. Edge → AI Gateway (Gemini 2.5 Pro avec vision si imageUrl fournie) → tool call structuré → 5 textes éditoriaux
3. Frontend → injection dans le PDF Magazine DÉCO

---

## 12. Logs et debug

### 12.1 Frontend

- Console navigateur (logs préfixés par emoji selon le service).
- React DevTools recommandé.
- TanStack Query DevTools : à activer en dev si besoin (`<ReactQueryDevtools />`).

### 12.2 Backend

```bash
supabase functions logs apply-decor --tail
```

Les Edge Functions loggent abondamment (préfixes 🎯, ✅, ❌, ⚠️). Voir `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` §9.2 — un logger conditionnel est recommandé pour la production (1 j/h).

---

## 13. Tâches de maintenance récurrentes

| Fréquence | Tâche | Commande |
|-----------|-------|----------|
| Hebdo | `npm audit` | `npm audit` |
| Mensuel | Mise à jour mineures dépendances | `npm outdated` puis `npm update` |
| Mensuel | Vérifier les logs Edge Functions et les volumes Storage | Dashboard Supabase |
| Trimestriel | Audit RGPD / RLS | Inspection policies |
| Trimestriel | Mise à jour majeure des dépendances | Plan dédié + tests complets |

---

## 14. Contacts et documentation

| Sujet | Document |
|-------|----------|
| Vue d'ensemble | `README.md` (racine) + `docs/README.md` |
| Guide utilisateur | `docs/GUIDE_UTILISATEUR.md` + `docs/MODE_EMPLOI.md` |
| Guide administrateur | `docs/GUIDE_ADMINISTRATEUR.md` |
| Documentation technique détaillée | `docs/DOCUMENTATION_TECHNIQUE.md` |
| API services | `docs/API_REFERENCE.md` + `docs/archive/obsolete/API_SERVICES.md` *(API_SERVICES archivé 2026-05-31, partiellement obsolète ; pour la cartographie services à jour, lire `src/services/index.ts` et `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` § 5)* |
| Orchestrateur IA | `docs/DICA_ORCHESTRATOR_GUIDE.md` |
| Guide déploiement | `docs/GUIDE_DEPLOIEMENT.md` |
| Audit technique | `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` *(courant)* + `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md` *(snapshot historique décembre 2025)* |
| Audit dépendances | `docs/AUDIT_DEPENDANCES.md` |
| Valorisation technique | `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` |
| Matrice heures × qualité | `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` |
| Rapport qualité logicielle | `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` |
| Dossier commissaire aux apports | `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` + `docs/RAPPORT_VALORISATION_TECHNIQUE.md` |

---

## 15. Glossaire

| Terme | Définition |
|-------|-----------|
| Décor | Référence du catalogue DICA (motif + finition) appliqué sur une surface |
| Cas d'usage | Type d'espace cible (ascenseur / van / terrasse / autre) — guide les contraintes IA |
| Rendu | Image générée par Gemini Image |
| Magazine DÉCO | Format d'export PDF éditorial premium |
| Brochure revendeur | Variante du Magazine DÉCO co-brandée |
| Orchestrateur | Couche IA propriétaire de validation + structuration des prompts |
| RLS | Row Level Security (Postgres) |
| SSRF | Server-Side Request Forgery (anti-SSRF via `UrlValidatorService`) |

---

**Tout développeur senior maîtrisant React + TypeScript + Supabase peut reprendre ce projet en autonomie en s'appuyant sur ce document et la documentation `docs/`.**
