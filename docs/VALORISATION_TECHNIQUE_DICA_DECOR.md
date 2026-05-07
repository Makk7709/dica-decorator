# VALORISATION TECHNIQUE — DICA Decorator

**Référence** : DICA-DEC-VT-2026
**Date** : 06/05/2026
**Destinataire** : Bureau d'évaluation technique (type Diag & Grow)
**Émetteur** : KOREV AI — éditeur, développeur et titulaire des droits sur l'actif logiciel
**Client utilisateur** : DICA France
**Avertissement** : Document factuel, fondé sur le repository, l'historique Git et les artefacts de build. Toute valorisation monétaire relève du commissaire aux apports.

---

## 1. Résumé exécutif de l'actif

**DICA Decorator** est une application web professionnelle (SPA + Backend-as-a-Service) propriétaire de **KOREV AI**, développée pour **DICA France**, fabricant de décors stratifiés pour l'aménagement intérieur (cabines d'ascenseur, vans aménagés, terrasses, mobilier).

Elle permet aux revendeurs et architectes d'intérieur de **visualiser instantanément, en photoréalisme, l'application des décors du catalogue DICA sur des photos de leurs propres projets**, via une orchestration IA propriétaire branchée sur Google Gemini, et de **générer des supports commerciaux finalisés** (Magazine DÉCO, brochure revendeur co-brandée) en sortie PDF haute définition.

| Élément | Valeur |
|---------|--------|
| Statut | Déployé en production (Supabase Cloud + frontend statique) |
| Stack | React 18 / TypeScript / Vite / Tailwind / shadcn/ui · Supabase (Postgres + Auth + Storage + Edge Functions Deno) · Google Gemini |
| Code exécutable mesuré | ~48 000 lignes (frontend + backend + migrations + tests) |
| Tests automatisés | 26 fichiers · 808 tests passants / 811 (3 échecs pré-existants documentés) |
| Documentation | 19 documents · ~7 500 lignes |
| Modèle IA | Gemini 3 Pro Image Preview (image), Gemini 2.5 Flash/Pro (texte) |

---

## 2. Périmètre fonctionnel

### 2.1 Macro-fonctions

| Bloc | Description |
|------|-------------|
| Authentification & multi-tenant | Inscription, connexion, mot de passe oublié, organisations revendeur, rôles, invitations |
| Gestion de projets | CRUD projets typés (ascenseur / van / terrasse / autre), historique, suppression sécurisée, renommage |
| Pipeline de visualisation IA | Upload photo → application d'un décor catalogue → rendu Gemini → comparaison avant/après |
| Assistant créatif (chat IA) | Chat en langage naturel avec orchestration validée du catalogue + génération d'images multi-source |
| Catalogue de décors | Référentiel de décors (texture, catégorie, surface, références) géré côté admin |
| Annotation rendus | Ajout automatique des références DICA sur l'image générée pour présentation client |
| Favoris | Marquage et galerie cross-projets |
| Partage sécurisé | Génération de liens publics éphémères avec token et expiration |
| Mode présentation | Plein écran commercial (transitions, slider avant/après) |
| Magazine DÉCO PDF | Export éditorial style AD Magazine, captions générées par IA, multi-pages |
| Brochure revendeur | Magazine personnalisable avec couverture co-brandée (logo, raison sociale revendeur) |
| Export multi-formats images | PNG / JPEG / WebP, qualité paramétrable |
| Dashboard admin & analytics | Métriques globales, par décor, par utilisateur, export JSON / Excel(CSV) / PDF |
| Quotas & rate limiting | Quotas mensuels par tier (starter 100 / pro 500 / enterprise 2 000), rate limit quotidien |
| Sécurité périmètre | RLS, validation serveur, JWT, anti-SSRF, Edge Functions authentifiées |
| Mode nuit | Thème jour/nuit complet |

### 2.2 Cas d'usage métier

| Contexte | Surfaces traitées |
|----------|-------------------|
| Cabine d'ascenseur | Panneaux muraux, portes |
| Van aménagé | Parois latérales, cloisons intérieures |
| Terrasse | Sols, bardages, cabanons |
| Autre | Mobilier, comptoirs, plans de travail |

---

## 3. Architecture technique

### 3.1 Vue logique

```
┌──────────────────────────────────────────────────────────────────┐
│                FRONTEND — SPA React 18 + TypeScript              │
│  Pages (13)  ·  Composants (75)  ·  Services métier (21)         │
│  Hooks (9)   ·  shadcn/ui sur Radix Primitives                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / JWT Bearer
┌────────────────────────────┴─────────────────────────────────────┐
│                    BACKEND — Supabase Cloud                      │
│  Auth (JWT)  ·  Postgres 17.6 (RLS)  ·  Storage (3 buckets)      │
│  Edge Functions Deno (5)                                         │
│   ├─ apply-decor                  (rendu IA décor → image)       │
│   ├─ creative-chat + orchestrator (chat IA + image multi-source) │
│   ├─ generate-magazine-captions   (textes éditoriaux IA)         │
│   ├─ get-analytics                (agrégation métriques)         │
│   └─ get-users-admin              (administration utilisateurs)  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴─────────────────────────────────────┐
│                       GOOGLE GEMINI API                          │
│  Gemini 3 Pro Image Preview  (génération photoréaliste 4K)       │
│  Gemini 2.5 Flash / Pro      (orchestration + analyse image)     │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Frontend

| Élément | Détail |
|---------|--------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 (esbuild, code-splitting manuel sur vendor-react / vendor-query, lazy loading des pages lourdes) |
| Styling | Tailwind 3.4 + tokens design système (`tailwind.config.ts`) |
| UI primitives | shadcn/ui (Radix) — 24 composants Radix |
| Routing | react-router-dom v6 (lazy routes) |
| État serveur | TanStack Query v5 (cache, mutations optimistes, parallélisation) |
| Formulaires | react-hook-form + zod |
| PDF | jspdf + html2canvas |
| Tests | Vitest 3 + Testing Library + happy-dom + msw |

Volumétrie frontend : 161 fichiers TS/TSX, ~30 000 lignes hors tests, ~13 000 lignes de tests.

### 3.3 Backend

| Élément | Détail |
|---------|--------|
| Plateforme | Supabase Cloud, région UE |
| Base | PostgreSQL 17.6.1 |
| Migrations versionnées | 23 fichiers SQL (`supabase/migrations/*.sql`, ~1 023 lignes) |
| Sécurité données | Row Level Security activée sur l'ensemble des tables métier |
| Storage | 3 buckets (`decor-textures`, `project-photos`, `render-results`) avec quotas et MIME-type whitelisting |
| Edge Functions | 5 fonctions Deno (~3 300 lignes) |
| Authentification | Supabase Auth (JWT) — toutes les Edge Functions vérifient le token + service role admin |

### 3.4 IA

| Modèle | Usage | Endpoint |
|--------|-------|----------|
| Gemini 3 Pro Image Preview | Application photoréaliste de décors, mood boards, plaquettes | `generativelanguage.googleapis.com` (direct) |
| Gemini 2.5 Flash | Orchestration prompt (validation catalogue, structuration tool-calling) | Passerelle AI Gateway compatible OpenAI Chat Completions |
| Gemini 2.5 Pro | Analyse image éditoriale (Magazine DÉCO captions) | Idem |

---

## 4. Modules propriétaires (KOREV AI)

| Module | Localisation | Originalité |
|--------|--------------|-------------|
| **DICA Prompt Orchestrator** | `supabase/functions/creative-chat/orchestrator.ts` | Couche IA propriétaire : validation stricte du catalogue, auto-correction des références (fuzzy matching), garde-fous métier, contrats `tool_calls` JSON Schema |
| **Magazine DÉCO PDF Service** | `src/services/magazine-deco-pdf.service.ts` + `reseller-brochure-pdf.service.ts` | Moteur d'export éditorial style AD Magazine, multi-pages, typographie premium, layout dynamique |
| **Reseller Brochure Personalization** | `src/services/reseller-brochure-pdf.service.ts` + admin co-branding | Couverture personnalisable revendeur (logo + raison sociale) |
| **Image Comparison Service** | `src/services/image-comparison.service.ts` (67 tests) | Slider Avant/Après avec labels en serif italique |
| **Image Storage Service** | `src/services/image-storage.service.ts` (29 tests) | Migration progressive base64 → bucket Storage avec dé-duplication |
| **URL Validator (anti-SSRF)** | `src/services/url-validator.service.ts` (71 tests) | Whitelist + blacklist IP privée + validation MIME — protection des Edge Functions contre fetch arbitraire |
| **Rate Limiter Service** | `src/services/rate-limiter.service.ts` (30 tests) | Quotas quotidiens / mensuels avec persistance Postgres |
| **Quota Service** | `src/services/quota.service.ts` (21 tests) | Tiers organisationnels (starter/pro/enterprise) |
| **Auth Guard Service** | `src/services/auth-guard.service.ts` (31 tests) | Validation rôles, garde de pages, vérification permissions admin |
| **Share Link Service** | `src/services/share-link.service.ts` (58 tests) | Liens publics tokenisés à expiration |
| **Analytics Service + Export** | `src/services/analytics.service.ts` + `analytics-export.service.ts` (78 tests) | Agrégations + export multi-format JSON / Excel / PDF |
| **Presentation Service** | `src/services/presentation.service.ts` (67 tests) | Mode commercial plein écran |
| **Gemini Image Service** | `src/services/gemini-image.service.ts` (46 tests) | Wrapper de l'API Gemini pour application de décor avec retry et erreurs typées |

L'ensemble est intégralement écrit en TypeScript, couvert par des tests unitaires, et ne contient aucune dépendance d'éditeur visuel ou de générateur de code tiers.

---

## 5. Services métier testés

État du repository à la date du document (`npm run test:run`) :

```
Test Files  : 25 passés / 1 échec (échec pré-existant — voir §13)
Tests       : 808 passés / 3 échecs pré-existants (sur 811)
Durée       : ~2,06 s
```

Décomposition par service (volumétrie de tests) :

| Service | Tests | Préoccupation testée |
|---------|------:|----------------------|
| `reseller-brochure-pdf.service` | 60 + 26 perso. | Génération PDF revendeur, personnalisation |
| `plaquette-pdf.service` (legacy) | 138 | Génération brochure historique |
| `share-link.service` | 58 | Partage sécurisé avec expiration |
| `url-validator.service` | 71 | Protection anti-SSRF |
| `presentation.service` | 67 | Mode présentation |
| `image-comparison.service` | 67 | Avant / Après |
| `analytics.service` | 49 | Dashboard admin |
| `gemini-image.service` | 46 | Pipeline IA |
| `auth-guard.service` | 31 | Gardes & permissions |
| `image-export.service` | 32 | Export multi-format |
| `rate-limiter.service` | 30 | Limitations |
| `analytics-export.service` | 29 | Export analytics |
| `image-storage.service` | 29 | Migration storage |
| `organization.service` | 27 | Multi-tenant |
| `favorites.service` | 18 | Favoris |
| `quota.service` | 21 | Quotas |
| `image-export-dropdown` (UI) | 18 | Composant export |
| `admin-project-viewer.service` | 14 | Vue admin projets |
| `parallel-fetch.service` | 8 | Optimisation latence |
| `project-deletion.service` | 6 | Suppression sécurisée |
| `project-rename.service` | 5 | Renommage |
| `render-response` (types) | 4 | Contrats types |
| `use-decor-context-cache` (hook) | 18 (3 échouants) | Cache catalogue côté client |

L'approche est **TDD-first** sur tous les services métier critiques.

---

## 6. Sécurité

### 6.1 Authentification & autorisation

- Auth JWT via Supabase Auth.
- Edge Functions : vérification systématique du Bearer token, décodage JWT, contrôle d'expiration et appel `auth.admin.getUserById` côté service role pour confirmation.
- Row Level Security (RLS) activée sur toutes les tables métier.
- Rôles applicatifs (`admin` / `client` / membres d'organisation) gérés via `auth-guard.service`.

### 6.2 Validation entrées

- Côté client : `react-hook-form` + `zod`.
- Côté serveur : validation explicite de chaque payload Edge Function (présence champs obligatoires, type, longueurs).
- Anti-SSRF : `UrlValidatorService` (71 tests) sur tous les fetch d'images externes — whitelist domaine, blacklist IP privée (RFC 1918, link-local, loopback), validation MIME.

### 6.3 Limitations

- Rate limiting quotidien (50 rendus / jour utilisateur en profil standard).
- Quotas mensuels par organisation (100 / 500 / 2 000 selon le tier).
- Storage : limites de taille par bucket (10 MB textures, 20 MB photos & rendus) et restriction MIME images uniquement.

### 6.4 Secrets

- Aucun secret dans le code. Toutes les clés (Supabase service role, Google AI, AI Gateway) sont injectées par variables d'environnement côté Edge Function.
- `.env` est gitignored.

---

## 7. Multi-tenant / organisations / quotas

| Élément | Détail |
|---------|--------|
| Table `organizations` | Stocke les revendeurs avec branding (logo, couleurs, raison sociale) |
| Table `organization_members` | Rôles : `owner`, `admin`, `member` |
| Table `invitations` | Tokens d'invitation à expiration |
| Tier | `starter` (100 rendus/mois) · `pro` (500) · `enterprise` (2 000) |
| `quota.service.ts` | 21 tests — vérification quota avant chaque action coûteuse |
| `organization.service.ts` | 27 tests — CRUD organisations, membership, rôles |

---

## 8. IA intégrée — Gemini

### 8.1 Application de décor (`apply-decor`)

- Reçoit : photo source + référence décor catalogue + paramètres (cas d'usage, format).
- Construit un prompt enrichi (en anglais) avec contraintes matérialité (brillant/satin/bois/marbre/etc.), encore les instructions de préservation (plafond, mobilier).
- Appelle Gemini 3 Pro Image Preview en mode multimodal (texte + image source + texture décor).
- Retourne l'image générée + références identifiées.

### 8.2 Chat créatif (`creative-chat`)

- Étape 1 — Orchestration : envoi catalogue + prompt utilisateur à Gemini 2.5 Flash via `tool_calls` JSON Schema strict (`validate_dica_request`).
- Étape 2 — Validation post-IA : extraction des `reference_code`, vérification d'existence dans le catalogue (exact match + case-insensitive + fuzzy), auto-correction des références mal orthographiées.
- Étape 3 — Génération image : prompt orchestré en anglais + textures décors fetchées + images sources utilisateur, envoyé à Gemini 3 Pro Image Preview.

### 8.3 Captions Magazine DÉCO (`generate-magazine-captions`)

- Analyse de l'image du rendu par Gemini 2.5 Pro.
- Génération de 5 textes éditoriaux structurés (`headline`, `subheadline`, `slugline`, `caption`, `article` 80–120 mots).
- Fallback de secours en cas d'erreur AI (5 textes pré-rédigés génériques).

---

## 9. Exports et génération documentaire

| Export | Service | Caractéristiques |
|--------|---------|------------------|
| Magazine DÉCO PDF | `magazine-deco-pdf.service.ts` | Layout AD Magazine, typographie Playfair / Bodoni, multi-pages |
| Brochure revendeur PDF | `reseller-brochure-pdf.service.ts` | Couverture personnalisable revendeur |
| Image PNG / JPEG / WebP | `image-export.service.ts` | Qualité paramétrable |
| Analytics JSON / CSV / PDF | `analytics-export.service.ts` | Tabulaire admin |
| Lien public éphémère | `share-link.service.ts` | Token + expiration |

---

## 10. Documentation existante (19 documents)

Localisation : `docs/`

| Document | Lignes | Objet |
|----------|------:|-------|
| `README.md` (racine) | ~370 | Vue d'ensemble produit |
| `docs/README.md` | 144 | Sommaire documentation |
| `GUIDE_UTILISATEUR.md` | — | Pour l'utilisateur final |
| `GUIDE_ADMINISTRATEUR.md` | — | Pour l'admin |
| `DOCUMENTATION_TECHNIQUE.md` | — | Architecture & code |
| `GUIDE_DEPLOIEMENT.md` | — | Installation, prod |
| `API_REFERENCE.md` | — | Endpoints & types |
| `API_SERVICES.md` | — | Contrats services |
| `DICA_FRANCE_RESUME.md` | — | Résumé exécutif client |
| `DICA_ORCHESTRATOR_GUIDE.md` | — | Orchestration IA |
| `MODE_EMPLOI.md` | 165 | Quick start utilisateur |
| `RAPPORT_VALORISATION_TECHNIQUE.md` | ~900 | Rapport commissaire aux apports détaillé |
| `DOSSIER_COMMISSAIRE_AUX_APPORTS.md` | — | Dossier de transmission |
| `AUDIT_TECHNIQUE.md` | 187 | Audit interne (Décembre 2025) |
| `BROCHURE_COMMERCIALE_GAMMA.md` | — | Brochure commerciale |
| `PLAQUETTE_PDF_COBRANDING.md` | — | Spec co-branding |
| `PROMPT_CONTROLE_*.md` | — | Procédures de validation |
| `PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` | — | Plan correctif |
| `VALORISATION_TECHNIQUE_DICA_DECOR.md` | (ce document) | — |
| `MATRICE_HEURES_QUALITE_DICA_DECOR.md` | nouveau | Matrice temps homme |
| `RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | nouveau | Rapport qualité |
| `HANDOVER_DEVELOPPEUR.md` | nouveau | Transmission développeur |
| `AUDIT_DEPENDANCES.md` | nouveau | Justification dépendances |

---

## 11. Estimation du temps de développement reconstitué

### 11.1 Méthode

Estimation **bottom-up** par bloc fonctionnel, fondée sur :

1. Inspection directe du code (services, composants, tests, migrations).
2. Tarif d'effort développeur senior plein expert React/TypeScript/Supabase **en environnement professionnel non-IA-assisté** (≈ 6 h productives par jour, hors réunions).
3. Hypothèse **prudente** : on retient la **fourchette centrale** comme estimation défendable, on ne capitalise pas la fourchette haute.

Voir le détail bloc par bloc dans `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md`.

### 11.2 Synthèse

| Catégorie | Temps central (j/h sénior) |
|-----------|---------------------------:|
| Architecture frontend (config, routing, layout, design system) | 8 |
| Auth + multi-tenant (orgs, rôles, RLS, invitations) | 12 |
| Gestion projets / rendus (CRUD, upload, états) | 14 |
| Pipeline IA Gemini image (apply-decor + retry + erreurs) | 10 |
| Chat créatif + orchestrateur propriétaire | 14 |
| Export Magazine DÉCO PDF | 10 |
| Brochure revendeur + co-branding admin | 7 |
| Export analytics multi-format | 6 |
| Partage sécurisé par lien | 4 |
| Comparaison avant/après | 3 |
| Rate limiting + quotas | 5 |
| Anti-SSRF + validation URL | 4 |
| Image storage + migration base64 → bucket | 5 |
| Tests automatisés (811 tests, TDD) | 18 |
| Documentation (19 documents, ~7 500 lignes) | 12 |
| Catalogue décors + admin (108 textures, gestion CRUD) | 8 |
| Mode présentation + thème jour/nuit + skeletons | 5 |
| Quality gates, lint, build, optimisations | 5 |
| **TOTAL CENTRAL** | **150 j/h** |

### 11.3 Fourchette globale

| Scénario | j/h |
|----------|----:|
| **Bas** (équipe expérimentée + bonne réutilisation) | 120 |
| **Central** (estimation prudente défendable) | 150 |
| **Haut** (tâtonnements, intégrations IA non maîtrisées) | 200 |

---

## 12. Facteurs de qualité

| Critère | Constat | Niveau |
|---------|---------|--------|
| Architecture modulaire | Services / composants / hooks / pages séparés, alias `@/` | Élevé |
| Couverture de tests | 811 tests, TDD strict sur les services critiques | Élevé |
| Typage statique | TypeScript strict côté frontend, types centralisés (`src/types/`) | Élevé |
| Sécurité | RLS, JWT, anti-SSRF, rate limit, quotas, validation serveur | Élevé |
| Documentation | 19 documents, guides utilisateur/admin/technique/déploiement | Élevé |
| Reproductibilité du build | Lockfile commit, scripts npm standards, dépendances pinées | Élevé |
| Migrations versionnées | 23 migrations SQL ordonnancées | Élevé |
| Lint | Dette documentée (~172 erreurs `any`, déjà connue avant la mission) | Moyen |
| Coverage formelle (`vitest --coverage`) | À mesurer (commande disponible : `npm run test:coverage`) | À mesurer |
| Vulnérabilités dépendances | 19 vulnérabilités héritées, plan d'`audit fix` à programmer | Moyen |

---

## 13. Risques résiduels

| Risque | Description | Mitigation |
|--------|-------------|------------|
| Échec test pré-existant | 3 tests sur `use-decor-context-cache.test.ts` ne reflètent plus le format réel du contexte catalogue (la fonction a évolué, le test n'a pas été synchronisé) | Test ou implémentation à harmoniser dans une prochaine itération. **Validé sur main pristine** : ce sont des échecs antérieurs, pas une régression introduite. |
| Dette `any` | ~172 erreurs ESLint liées au typage `any` dans services PDF, mocks de tests, et certaines Edge Functions | Sans impact runtime, à éroder progressivement. Documenté dans `docs/AUDIT_TECHNIQUE.md`. |
| Vulnérabilités npm | 19 issues dans dépendances transitives (Vite, Vitest, jspdf) | Programmer `npm audit fix --force` + re-test. |
| Engine Node | `type-fest@5` exige Node ≥20, CI sur Node 18 | Bumper la pipeline CI vers Node 20 LTS. |
| Dépendance API Gemini | Nécessite clé Google AI valide ; en cas de panne fournisseur, l'application est dégradée | API multi-fournisseurs (passerelle abstraite, voir `AUDIT_DEPENDANCES.md` §4). Migration en 0,5 j/h. |

Aucun risque ne remet en cause la transférabilité de l'actif ni son exploitabilité actuelle en production.

---

## 14. Éléments de preuve à annexer

| Preuve | Localisation |
|--------|-------------|
| Commandes de validation | `npm run lint`, `npm run test:run`, `npm run build` (CLI logs) |
| Lockfile reproductible | `package-lock.json` (commit) |
| Migrations SQL versionnées | `supabase/migrations/*.sql` (23 fichiers) |
| Schéma de base | À extraire via `supabase gen types typescript` ou inspection MCP Supabase |
| Liste exhaustive des Edge Functions | `supabase/functions/{apply-decor,creative-chat,generate-magazine-captions,get-analytics,get-users-admin}/index.ts` |
| Liste exhaustive des services métier | `src/services/*.ts` (21 fichiers) |
| Suite de tests | `src/**/__tests__/*.test.ts(x)` (26 fichiers) |
| Historique Git | Branche `main`, ~150+ commits typés (chore/feat/fix/perf/refactor) |
| Documentation | `docs/` (19 documents) |
| Build de production | `dist/` (généré, exclu du repo) — bundle optimisé < 1,5 Mo gzip |
| Audit dépendances | `docs/AUDIT_DEPENDANCES.md` |
| Matrice heures × qualité | `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` |
| Rapport qualité logicielle | `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` |
| Handover développeur | `docs/HANDOVER_DEVELOPPEUR.md` |
| Audit technique préalable | `docs/AUDIT_TECHNIQUE.md` |
| Rapport valorisation détaillé | `docs/RAPPORT_VALORISATION_TECHNIQUE.md` (V4.0, 14/02/2026) |

---

**Conclusion** : DICA Decorator est un actif logiciel propriétaire **complet, déployé, testé, documenté, sécurisé et transférable**. Sa reconstitution par une équipe senior à compétences équivalentes est estimée à **150 j/h** en scénario central, avec une fourchette défendable de **120 à 200 j/h**.
