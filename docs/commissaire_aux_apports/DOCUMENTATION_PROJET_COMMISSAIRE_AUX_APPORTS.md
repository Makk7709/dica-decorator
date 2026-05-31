# Documentation du projet — DICA Decorator

> Document technique de référence transmis à l'appui d'un dossier d'apport en nature et destiné au commissaire aux apports. Le contenu est strictement factuel et rattaché au contenu du dépôt audité. Les modalités juridiques et contractuelles relèvent d'actes séparés et ne sont pas formalisées dans le présent document.

---

## 1. Identification du projet

| Élément | Valeur constatée dans le dépôt | Référence |
|---|---|---|
| Nom du projet | `dica-decorator` | `package.json` |
| Version applicative | `2.2.0` | `package.json` |
| Éditeur / auteur déclaré | KOREV AI | `package.json`, `README.md` |
| Statut du dépôt | Projet actif, base de code versionnée et structurée | `git log` |
| Branche auditée | `audit/tier1-2026-05-07` | Git |
| Commit audité (HEAD) | `274e4d040ae37e766ac1f7cc9e3ccd8a4a5ac546` | Git |
| Date de génération du présent document | 21/05/2026 | — |
| Type de projet | Application web SaaS B2B, intégrant des modèles d'intelligence artificielle générative pour un usage métier sectoriel | `README.md`, `src/`, `supabase/` |
| Stack frontend principale | React 18, TypeScript, Vite 5, TailwindCSS, shadcn/ui (Radix UI), TanStack Query, React Router DOM | `package.json`, `vite.config.ts` |
| Backend et services tiers principaux | Supabase managé (PostgreSQL, Auth, Storage, Edge Functions Deno) ; Google AI (Gemini) pour la génération d'images et de texte | `src/integrations/supabase/`, `supabase/functions/`, `.env.example` |
| Licence déclarée dans le dépôt | `"license": "UNLICENSED"` dans `package.json` (licence propriétaire, code non publié sous licence open-source). Aucun fichier `LICENSE` ou `LICENCE` racine n'est présent dans le dépôt. Les modalités précises d'usage et d'exploitation sont à confirmer par les actes contractuels applicables. | `package.json`, racine du dépôt |

---

## 2. Objet et finalité du projet

**Description.** `DICA Decorator` est une application web permettant à des utilisateurs authentifiés d'appliquer, sur une photographie d'un espace réel, un décor stratifié sélectionné dans un catalogue, et d'obtenir un rendu visuel généré par un modèle d'intelligence artificielle générative. L'application produit également des livrables documentaires (brochures cobrandées, magazine éditorial, export image et PDF), supporte le partage sécurisé de rendus et offre une interface d'administration multi-tenant.

**Public visé.** L'application est utilisée par :

- des utilisateurs finaux dans un contexte commercial (essai de décors avant décision) ;
- des revendeurs ou prestataires intermédiaires opérant en multi-tenant, chacun disposant d'un branding et de quotas distincts ;
- des administrateurs gérant le catalogue, les utilisateurs et les indicateurs d'usage.

**Cas d'usage principal observé.** Photographier ou téléverser une photo d'un espace (cabine d'ascenseur, véhicule, terrasse, mobilier), choisir une référence du catalogue de décors, générer un rendu réaliste par appel à un modèle d'intelligence artificielle, puis exploiter ce rendu (favoris, partage, export PDF cobrandé, présentation).

**Nature.** Application SaaS B2B sectorielle, intégrant des composants d'intelligence artificielle générative et une couche multi-tenant. Aucune fonctionnalité de paiement en ligne n'est constatée dans le dépôt.

---

## 3. Architecture technique synthétique

L'architecture est de type SaaS 3-tier reposant sur un backend managé. La logique serveur sensible (appels au modèle IA, agrégations administrateur) est portée par des fonctions Edge Deno hébergées par Supabase. Les clés d'accès aux modèles d'IA externes ne transitent pas par le navigateur.

```text
┌─────────────────────────────────────────────────────────────────┐
│  Frontend — SPA React 18 + Vite + TypeScript                    │
│    Routing, état serveur (TanStack Query), composants UI,       │
│    génération PDF côté client (jsPDF), client Supabase JWT.     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────────────────┐
│  Supabase (PaaS managé)                                         │
│    Auth (JWT) · PostgreSQL avec Row Level Security · Storage    │
│    objets · 5 Edge Functions Deno (génération de rendu,         │
│    assistant créatif, génération de légendes, analytics admin,  │
│    administration utilisateurs)                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (clé serveur)
┌─────────────────────────┴───────────────────────────────────────┐
│  Google AI — modèles Gemini (génération image et texte)         │
│  Passerelle compatible OpenAI Chat Completions (URL et clé      │
│  configurables par variables d'environnement)                   │
└─────────────────────────────────────────────────────────────────┘
```

| Composant | Description observée | Référence |
|---|---|---|
| Frontend | Application monopage React 18 buildée par Vite, organisée en pages, services, composants, hooks, contextes et intégrations. Lazy loading systématique des pages. | `src/App.tsx`, `src/pages/`, `src/services/`, `src/components/`, `vite.config.ts` |
| Backend applicatif | 5 fonctions Edge Deno sous `supabase/functions/` (`apply-decor`, `creative-chat` + `orchestrator`, `generate-magazine-captions`, `get-analytics`, `get-users-admin`) et 2 modules partagés sous `_shared/` (`ssrf-guard.ts`, `logger.ts`). | `supabase/functions/` |
| Base de données | PostgreSQL managé, 23 migrations versionnées sous `supabase/migrations/`. Sécurité par lignes activée sur les tables sensibles. | `supabase/migrations/` |
| Authentification | Supabase Auth (email/mot de passe, JWT, refresh token, password recovery). Rôles applicatifs `admin` et `client` (enum SQL `app_role`). | `src/lib/supabase.ts`, `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`, migration initiale |
| Stockage objets | Trois buckets Supabase Storage : `decor-textures`, `project-photos`, `render-results`. | `src/services/image-storage.service.ts`, migration initiale |
| Services IA externes | Google AI — Gemini (génération d'images et de texte). Une passerelle compatible OpenAI Chat Completions est utilisée pour les appels texte d'orchestration ; l'URL et la clé sont configurables par variables d'environnement (`AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY`). | `supabase/functions/apply-decor/index.ts`, `creative-chat/orchestrator.ts`, `generate-magazine-captions/index.ts`, `.env.example` |

---

## 4. Fonctionnalités principales observées

| Fonctionnalité | Statut observé | Fichiers ou dossiers sources | Commentaire factuel |
|---|---|---|---|
| Authentification email/mot de passe et récupération | Implémentée | `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/supabase.ts` | Persistance de session côté navigateur. |
| Contrôle d'accès par rôle (admin / client) | Implémenté | `src/components/ProtectedRoute.tsx`, type SQL `app_role`, fonction SQL `has_role` | Double couche : routage protégé côté client, fonction SQL appelée par les politiques de sécurité. |
| Gestion de projets et de photographies | Implémentée | `src/pages/Dashboard.tsx`, `src/pages/NewProject.tsx`, `src/pages/ProjectDetail.tsx`, tables `projects` et `project_photos` | — |
| Sélection de décor dans un catalogue | Implémentée | `src/components/decor-selector/DecorSelectorDialog.tsx`, tables `decors`, `decor_categories` | — |
| Génération de rendu par appel à un modèle d'IA | Implémentée | Fonction Edge `supabase/functions/apply-decor/index.ts`, service `src/services/gemini-image.service.ts`, table `render_results` | Modèle `gemini-3-pro-image-preview`. Limites resources définies dans le code. |
| Assistant créatif (chat IA avec génération d'images) | Implémenté | `src/pages/Creative.tsx`, Edge `supabase/functions/creative-chat/index.ts` + `orchestrator.ts` | Streaming texte + génération d'image. |
| Couche d'orchestration de prompt | Implémentée | `supabase/functions/creative-chat/orchestrator.ts` | Module métier qui valide et structure les demandes utilisateur avant la génération. |
| Favoris (rendus et créations) | Implémentés | `src/pages/Favorites.tsx`, `src/services/favorites.service.ts`, tables `render_favorites` et `creative_favorites` | — |
| Comparaison avant/après | Implémentée | `src/services/image-comparison.service.ts`, `src/components/ui/before-after-slider.tsx` | — |
| Mode présentation plein écran | Implémenté | `src/pages/Presentation.tsx`, `src/services/presentation.service.ts`, `src/components/ui/presentation-viewer.tsx` | — |
| Export image multi-formats | Implémenté | `src/services/image-export.service.ts`, `src/components/ui/image-export-dropdown.tsx` | PNG / JPEG / WebP, qualité configurable. |
| Génération PDF Brochure revendeur cobrandée | Implémentée | `src/services/reseller-brochure-pdf.service.ts`, `src/components/ui/reseller-brochure-export-button.tsx` | Personnalisation par nom de revendeur, logo, couleur. |
| Génération PDF Magazine éditorial | Implémentée | `src/services/magazine-deco-pdf.service.ts`, Edge `generate-magazine-captions` | Légendes éditoriales produites par appel IA. |
| Partage de rendu par lien | Implémenté | `src/services/share-link.service.ts`, table `share_links`, table `share_link_access_logs` | Expiration paramétrable, journalisation des accès. |
| Tableau de bord analytics administrateur | Implémenté | `src/pages/AdminAnalytics.tsx`, `src/services/analytics.service.ts`, Edge `get-analytics` | — |
| Export analytics multi-formats | Implémenté | `src/services/analytics-export.service.ts` | JSON / CSV / PDF. |
| Administration utilisateurs | Implémentée | `src/pages/Admin.tsx`, Edge `get-users-admin` | — |
| Administration catalogue | Implémentée | `src/components/admin/catalog-management.tsx`, `src/components/admin/bulk-decor-upload.tsx` | — |
| Réglages de branding revendeur | Implémentés | `src/components/admin/reseller-branding-settings.tsx` | — |
| Multi-tenant (organisations, membres, tiers) | Implémenté | `src/services/organization.service.ts` | Rôles `owner` / `admin` / `member`. Tiers `starter` / `pro` / `enterprise`. |
| Quotas mensuels et limitation de débit | Implémentés | `src/services/quota.service.ts`, `src/services/rate-limiter.service.ts` | Quotas par organisation, limites journalières par utilisateur. |
| Onboarding utilisateur | Implémenté | `src/components/onboarding/` | — |
| Thème clair / sombre | Implémenté | `src/contexts/ThemeContext.tsx`, `src/components/ui/theme-toggle.tsx` | — |
| Page mentions légales et page d'aide | Implémentées | `src/pages/Legal.tsx`, `src/pages/Help.tsx` | — |
| Protection anti-SSRF (frontend et Edge) | Implémentée | `src/services/url-validator.service.ts`, `supabase/functions/_shared/ssrf-guard.ts` | — |
| Stockage d'images : migration base64 vers Storage | Implémentée | `src/services/image-storage.service.ts` | — |
| Logger Edge structuré | Implémenté | `supabase/functions/_shared/logger.ts` | — |

---

## 5. Modules propriétaires et éléments valorisables

Le tableau ci-dessous distingue le code propriétaire spécifique au projet, les composants tiers intégrés (scaffold UI, bibliothèques), la documentation et les éléments de configuration.

### 5.1 Code propriétaire identifié

| Module / fichier / dossier | Rôle | Spécificité métier | Potentiel de réutilisation | Réserve factuelle |
|---|---|---|---|---|
| `supabase/functions/creative-chat/orchestrator.ts` | Couche d'orchestration de prompt validant et structurant les demandes utilisateur avant la génération | Élevée — couplée au catalogue et aux contextes d'usage sectoriels | Spécifique au domaine | Module non couvert par les tests Vitest. |
| `supabase/functions/apply-decor/index.ts` | Edge Function de génération de rendu (appel modèle IA, parsing réponse, validation, limites resources) | Élevée — workflow complet métier | Spécifique au domaine | Couverture de tests automatisés non identifiée sur ce fichier. |
| `supabase/functions/creative-chat/index.ts` | Edge Function de l'assistant créatif (streaming texte + génération image) | Élevée | Spécifique au domaine | Idem. |
| `supabase/functions/generate-magazine-captions/index.ts` | Génération de textes éditoriaux pour le format magazine | Moyenne | Réutilisable adapté à d'autres formats éditoriaux | — |
| `supabase/functions/get-analytics/index.ts` | Agrégation d'indicateurs administrateurs | Faible | Générique | — |
| `supabase/functions/get-users-admin/index.ts` | Liste administrateurs des utilisateurs | Faible | Générique | — |
| `supabase/functions/_shared/ssrf-guard.ts` | Garde anti-SSRF dédiée Edge | Faible (transverse) | Générique réutilisable | Couvert par tests Vitest. |
| `supabase/functions/_shared/logger.ts` | Logger structuré conditionnel | Faible (transverse) | Générique réutilisable | Couvert par tests Vitest. |
| `src/services/auth-guard.service.ts` | Validation serveur de session, RBAC, vérification d'ownership, appartenance organisation | Moyenne (multi-tenant) | Module générique réutilisable | Présence de tests unitaires. |
| `src/services/rate-limiter.service.ts` | Limitation de débit utilisateur (quotidien) et organisation (mensuel) | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/quota.service.ts` | Suivi des quotas mensuels par organisation, seuils d'alerte | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/organization.service.ts` | Multi-tenant : organisations, membres, invitations, branding, tiers | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/analytics.service.ts` + `src/services/analytics-export.service.ts` | Indicateurs et export analytics | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/url-validator.service.ts` | Validation d'URL frontend (anti-SSRF) | Faible (transverse) | Générique réutilisable | Présence de tests unitaires nombreux. |
| `src/services/share-link.service.ts` | Liens de partage sécurisés (token, expiration, journalisation d'accès) | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/image-comparison.service.ts` | Comparaison Avant/Après | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/presentation.service.ts` | Mode présentation plein écran | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/image-export.service.ts` | Export image multi-formats | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/image-storage.service.ts` | Téléversement d'images base64 vers Supabase Storage | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/gemini-image.service.ts` | Encapsulation côté frontend des appels au modèle d'image | Moyenne | Générique réutilisable | Présence de tests unitaires. |
| `src/services/magazine-deco-pdf.service.ts` | Génération PDF magazine éditorial | Élevée — format spécifique | Spécifique au format | — |
| `src/services/reseller-brochure-pdf.service.ts` | Génération PDF brochure revendeur cobrandée | Élevée — format spécifique | Spécifique au format | — |
| `src/services/favorites.service.ts`, `parallel-fetch.service.ts`, `project-rename.service.ts`, `project-deletion.service.ts`, `admin-project-viewer.service.ts` | Services CRUD et utilitaires secondaires | Faible à moyenne | Génériques | Présence de tests. |
| `src/components/admin/*` | Composants d'administration spécifiques (catalogue, branding, dialogues projets utilisateur, téléversement en masse) | Élevée | Spécifiques au domaine | — |
| `src/components/decor-selector/DecorSelectorDialog.tsx` | Composant de sélection de décor | Élevée | Spécifique au domaine | — |
| `src/components/analytics/*` | Composants d'analytics (cartes statistiques, graphes) | Moyenne | Générique adaptable | — |
| `src/components/favorites/favorites-gallery.tsx` | Galerie de favoris | Moyenne | Générique adaptable | — |
| `src/components/onboarding/*` | Modale de bienvenue, checklist d'accueil | Moyenne | Générique adaptable | — |
| `src/components/ui/before-after-slider.tsx`, `magazine-deco-export-button.tsx`, `presentation-viewer.tsx`, `reseller-brochure-export-button.tsx`, `safe-image.tsx`, `share-link-dialog.tsx`, `premium-layout.tsx`, `app-footer.tsx`, `theme-toggle.tsx` | Composants UI spécifiques au produit, distincts des composants scaffoldés | Moyenne à élevée | Générique adaptable | Voir § 5.2 pour la distinction avec le scaffold UI. |
| `supabase/migrations/` (23 fichiers SQL) | Schéma de données, sécurité par lignes, fonctions, triggers | Élevée — modèle métier | Spécifique au domaine | — |
| `src/pages/` (13 pages) | Composition applicative spécifique | Élevée | Spécifique au domaine | — |
| `src/integrations/supabase/types.ts` | Types TypeScript dérivés du schéma de base de données (généré) | Faible | Spécifique à l'instance | Fichier généré ; non créatif au sens du droit d'auteur. |

### 5.2 Composants tiers intégrés (scaffold UI et bibliothèques)

| Élément | Nature | Référence |
|---|---|---|
| `src/components/ui/` (composants scaffoldés) | Composants UI issus du scaffold shadcn/ui (Radix UI), copiés dans le dépôt et adaptés. Représentent un volume significatif de fichiers du sous-arbre. | `components.json`, `src/components/ui/` |
| Bibliothèques `@radix-ui/*` (26 paquets) | Primitives d'accessibilité sous licence MIT | `package.json` |
| Bibliothèques React, React DOM, React Router | Cadres applicatifs standards | `package.json` |
| Bibliothèque `@tanstack/react-query` | Cache d'état serveur | `package.json` |
| Bibliothèque `@supabase/supabase-js` | Client SDK Supabase | `package.json` |
| Bibliothèque `jspdf` | Génération PDF côté client | `package.json` |
| Bibliothèque `recharts` | Graphiques | `package.json` |
| Bibliothèques `tailwindcss`, `tailwindcss-animate`, `@tailwindcss/typography` | Styling | `package.json` |
| Bibliothèques de formulaires (`react-hook-form`, `@hookform/resolvers`, `zod`) | Saisie et validation | `package.json` |

Le scaffold UI ne constitue pas une création propriétaire au sens créatif ; il représente une intégration et une configuration de composants tiers standards. La valeur propre du projet est portée par les couches métier (services, pages, fonctions Edge, modèle de données) et par les composants UI spécifiques listés en § 5.1.

### 5.3 Configuration

| Élément | Référence |
|---|---|
| Configuration de build et de tests | `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.ts`, `postcss.config.js`, `components.json` |
| Configuration CI/CD | `.github/workflows/ci.yml`, `.github/workflows/cd-edge-functions.yml` |
| Modèles d'environnement (sans secrets) | `.env.example` |

### 5.4 Documentation existante

Le dépôt comporte une documentation interne abondante (cf. § 9), structurée et exploitable, qui accompagne le code applicatif.

### 5.5 Assets

| Élément | Référence |
|---|---|
| Assets statiques (logo, favicon, images) | `public/images/`, `assets/` |

### 5.6 Dépendances externes

Les dépendances externes (Supabase, Google AI) sont des services tiers opérés par des prestataires distincts et ne sont pas intégrés au code propriétaire ; leur usage relève des conditions contractuelles de ces services.

---

## 6. Propriété intellectuelle, licence commerciale et droits d'exploitation

### 6.1 Propriété du socle logiciel

Le dépôt audité constitue un actif logiciel développé sous contrôle du porteur du projet / de KOREV AI. Sauf stipulation contractuelle contraire à produire séparément, les développements spécifiques, l'architecture applicative, les modules métier, les services, les fonctions backend, les schémas de base de données, la documentation technique et les éléments d'orchestration logicielle constituent un périmètre logiciel valorisable rattaché à l'éditeur.

Les modalités précises de propriété intellectuelle et de cession éventuelle de droits restent à confirmer par les documents contractuels applicables.

### 6.2 Droits d'exploitation et licence commerciale

L'exploitation du logiciel par DICA France doit être comprise, sous réserve des accords contractuels applicables, comme un droit d'usage ou une licence commerciale d'exploitation du service, et non comme une cession automatique de propriété du code source ou du socle logiciel.

Cette distinction permet de séparer l'usage opérationnel du produit par le client final de la propriété du socle logiciel, qui demeure rattachée au porteur du projet / à KOREV AI sauf clause contraire.

### 6.3 Nature recommandée de la licence d'exploitation

Position cible (à confirmer contractuellement) : licence commerciale d'utilisation SaaS, non cessible, non transférable, limitée au périmètre DICA France et à ses utilisateurs autorisés, sans droit de copie, de revente, de sous-licence, d'extraction du code source, de rétro-ingénierie ou de réutilisation indépendante du socle logiciel.

Une exclusivité peut, le cas échéant, être limitée au secteur ou au catalogue DICA France, sans empêcher KOREV AI de réutiliser le socle technique, les composants génériques, les modules d'IA, les briques de sécurité, les interfaces, les services, l'architecture ou les méthodes de développement dans d'autres contextes.

### 6.4 Éléments demeurant dans le périmètre KOREV AI

Sauf clause contractuelle contraire écrite, les éléments suivants sont rattachés au périmètre logiciel de KOREV AI :

- code source applicatif et schémas de base de données ;
- architecture applicative et choix d'architecture ;
- composants génériques et services backend ;
- fonctions Edge ;
- logique d'orchestration IA, prompts systèmes et workflows IA ;
- modules de sécurité (anti-SSRF, RBAC, garde d'authentification, validateurs d'URL) ;
- modules de génération PDF (brochure revendeur, magazine éditorial) ;
- système de partage sécurisé (liens, expiration, journalisation) ;
- système d'administration et tableaux de bord ;
- modèles de données et politiques de sécurité par lignes ;
- documentation technique ;
- scripts de build, d'intégration continue et de déploiement ;
- savoir-faire, méthodes et choix d'architecture ;
- composants réutilisables dans d'autres produits.

### 6.5 Éléments relevant du périmètre DICA France

Distincts du socle logiciel ci-dessus, les éléments suivants peuvent relever du périmètre client ou faire l'objet d'autorisations d'utilisation distinctes :

- catalogue de décors et références produits DICA ;
- marques, logos et visuels commerciaux DICA ;
- contenus métier propres à DICA ;
- données clients DICA et données d'usage selon les conditions contractuelles ;
- photographies, rendus et contenus produits dans le cadre de l'exploitation ;
- supports commerciaux spécifiquement fournis par DICA.

Ces éléments ne doivent pas être confondus avec la propriété du socle logiciel et leur statut relève des accords applicables entre les parties.

### 6.6 Dépendances tierces et composants open-source

Les dépendances open-source et composants tiers intégrés au projet (cf. § 5.2 et § 7) ne sont pas revendiqués comme propriété exclusive. Leur usage doit respecter les licences applicables. La valeur propriétaire du projet porte sur l'intégration, l'architecture, les développements spécifiques, les modules métier et l'orchestration applicative.

### 6.7 Outils de génération et d'édition assistée

Les éventuelles mentions à des outils de génération ou d'édition assistée présents dans l'historique ou dans la documentation technique doivent être qualifiées comme éléments d'outillage ou d'assistance au développement, sauf preuve d'une dépendance runtime active. Elles ne constituent pas, en elles-mêmes, une cession de propriété ou une limitation d'exploitation du logiciel. La qualification factuelle des occurrences observées figure au § 7.4 du présent document.

### 6.8 Modalités contractuelles à confirmer

Les modalités précises de licence, d'usage, d'exploitation, de maintenance, d'accès au code source et de propriété des livrables doivent être confirmées par les contrats conclus ou à conclure entre les parties. La présente documentation technique ne se substitue pas aux actes juridiques correspondants.

---

## 7. Dépendances tierces et licences

### 7.1 Licence globale du projet

`package.json` déclare `"license": "UNLICENSED"`, ce qui correspond, dans la convention npm, à un logiciel propriétaire non publié sous licence open-source. Aucun fichier `LICENSE` ou `LICENCE` n'est présent à la racine du dépôt. La détermination juridique des droits d'usage et de cession relève des actes contractuels applicables et n'entre pas dans le périmètre technique du présent document.

### 7.2 Dépendances runtime principales

| Dépendance | Usage observé | Licence telle que renseignée par les paquets npm |
|---|---|---|
| `react`, `react-dom` | Framework UI | MIT |
| `react-router-dom` | Routage | MIT |
| `@tanstack/react-query` | Cache d'état serveur | MIT |
| `@supabase/supabase-js` | Client Supabase | MIT |
| `@radix-ui/*` (26 paquets) | Primitives UI accessibles | MIT |
| `tailwindcss`, `tailwindcss-animate`, `@tailwindcss/typography` | Styling | MIT |
| `react-hook-form`, `@hookform/resolvers`, `zod` | Saisie et validation | MIT |
| `jspdf` | Génération PDF | MIT |
| `recharts` | Graphiques | MIT |
| `lucide-react` | Icônes | ISC |
| `date-fns`, `clsx`, `class-variance-authority`, `tailwind-merge`, `cmdk`, `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`, `react-resizable-panels`, `sonner`, `vaul` | Composants et utilitaires divers | MIT (selon paquets) |

### 7.3 Récapitulatif des licences observées sur le graphe de production

Le résumé `license-checker` archivé dans le dépôt (`audit/phase-minus-1/licenses-prod-summary.txt`) recense, pour les dépendances de production résolues, la répartition suivante :

| Licence | Nombre de paquets |
|---|---|
| MIT | 237 |
| ISC | 27 |
| Apache-2.0 | 3 |
| BSD-3-Clause | 3 |
| BlueOak-1.0.0 | 3 |
| UNLICENSED | 1 (correspond au projet lui-même) |
| (MPL-2.0 OR Apache-2.0) | 1 |
| (MIT AND Zlib) | 1 |
| MIT* | 1 |
| 0BSD | 1 |
| MIT AND ISC | 1 |

Aucune licence à effet viral (GPL, AGPL, LGPL) n'apparaît dans ce relevé. La conformité d'usage des licences listées relève d'une vérification juridique externe et reste à confirmer en dehors du périmètre technique.

### 7.4 Outils de génération et d'édition assistée — qualification factuelle

Des mentions à Lovable peuvent apparaître dans l'historique du dépôt, dans certains documents techniques et dans une configuration de fallback dans le code des fonctions Edge. Elles doivent être interprétées comme des traces d'outillage ou de génération/édition assistée, sauf présence d'une dépendance runtime active constatée dans `package.json` ou dans le code applicatif.

| Catégorie d'occurrence | Qualification observée dans le périmètre audité |
|---|---|
| Dépendance runtime active dans `package.json` | Aucune. |
| Dépendance dev dans `package.json` | Aucune. |
| Dépendance retirée et documentée | `lovable-tagger` (plugin Vite dev-only) retiré du projet ; retrait documenté dans `docs/AUDIT_DEPENDANCES.md`. |
| Endpoint de fallback dans le code Edge | URL `https://ai.gateway.lovable.dev/v1/chat/completions` présente comme valeur de repli dans `supabase/functions/creative-chat/orchestrator.ts` et `supabase/functions/generate-magazine-captions/index.ts`. Cette URL est substituable par la variable d'environnement `AI_GATEWAY_URL` (cf. `.env.example` qui recommande `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`). |
| Variable d'environnement de rétrocompatibilité | `LOVABLE_API_KEY` lue uniquement en repli de `AI_GATEWAY_API_KEY` dans `supabase/functions/creative-chat/index.ts` et `supabase/functions/generate-magazine-captions/index.ts`. |
| Mentions dans la documentation | Présentes dans des documents internes d'audit et de plan de migration (`docs/AUDIT_DEPENDANCES.md`, `docs/PLAN_CORRECTION_RISQUES_DECOTE.md`, `docs/HANDOVER_DEVELOPPEUR.md`, `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md`, `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md`, etc.) qui documentent précisément le périmètre et le plan de substitution. |

Synthèse : aucune dépendance runtime active n'est constatée. Les éléments résiduels (URL de repli, variable d'environnement de rétrocompatibilité) sont substituables par configuration et leur substitution est documentée.

---

## 8. Qualité logicielle et tests

### 8.1 Mesures consolidées au dernier passage archivé

| Indicateur | Mesure | Source |
|---|---|---|
| Tests automatisés exécutés | 27 fichiers, 825 cas, 100 % verts | `audit/final/test.txt` |
| Build de production | Succès (≈ 3 s) | `audit/final/build.txt` |
| Lint (passage final) | 148 erreurs et 13 avertissements signalés par ESLint, principalement liés à la règle `@typescript-eslint/no-explicit-any` et à des avertissements `react-refresh/only-export-components` sur des composants du scaffold UI | `audit/final/lint.txt` |
| Audit des dépendances `npm audit` | 3 vulnérabilités identifiées (1 critique sur `jspdf`, 2 modérées sur `esbuild`/`vite`). Plan de migration documenté dans `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` | `audit/final/npm-audit.txt` |
| Couverture de tests globale (Vitest + v8) | 30,42 % statements / 77,58 % branches / 67,98 % functions / 30,42 % lines (passage `phase-0`) | `audit/phase-0/coverage.txt` |

### 8.2 Lecture de la mesure de couverture

La couverture globale mesurée est affectée par les fonctions Edge Deno (`apply-decor`, `creative-chat`, `creative-chat/orchestrator`, `generate-magazine-captions`, `get-analytics`, `get-users-admin`) qui ne sont pas exécutées dans le périmètre Vitest et apparaissent en 0 %. Les services applicatifs sous `src/services/` disposent d'une base de tests unitaires identifiée (21 fichiers de tests pour 21 services, volume cumulé d'environ 11 000 lignes de tests dans `src/services/__tests__/`). Une mesure isolée de la couche `src/services/` n'est pas consolidée dans les artefacts archivés au moment de l'audit et reste à produire si une mesure ciblée est souhaitée.

### 8.3 Intégration continue et déploiement

| Élément | Description observée | Référence |
|---|---|---|
| Pipeline CI | Workflow `CI Quality Gate` exécutant lint, tests + couverture, build, `npm audit`, `license-checker`. Statut bloquant sur lint et tests. | `.github/workflows/ci.yml` |
| Pipeline CD Edge | Workflow `CD Edge Functions` à déclenchement manuel, avec choix d'environnement (`staging` / `production`) et de fonction | `.github/workflows/cd-edge-functions.yml` |
| Artefacts CI | Archivage des sorties de lint, tests, couverture, audit pour une durée de 30 jours | `.github/workflows/ci.yml` |

### 8.4 Volumes de code constatés

| Périmètre | Volume mesuré |
|---|---|
| Code source frontend `src/` (TS / TSX) | ≈ 43 282 lignes (incluant les composants du scaffold UI) |
| Code source backend `supabase/functions/` (TS Deno) | ≈ 4 027 lignes |
| Migrations SQL `supabase/migrations/` | 23 fichiers |
| Documentation Markdown `docs/` | 28 fichiers |

---

## 9. Sécurité et gestion des données

Les éléments ci-dessous sont des éléments techniques contribuant à la sécurité, observables dans le dépôt. Ils ne constituent pas, à eux seuls, une attestation de conformité réglementaire (RGPD, AI Act), qui relève d'une analyse juridique distincte.

| Domaine | Élément observé | Référence |
|---|---|---|
| Sécurité de la base de données | `ENABLE ROW LEVEL SECURITY` sur l'ensemble des tables sensibles (au moins 14 tables, au moins 57 politiques `CREATE POLICY` recensées). Fonction `has_role(_user_id, _role)` `SECURITY DEFINER`. | `supabase/migrations/` |
| Contrôle d'accès | Rôles applicatifs `admin` / `client`. Garde de route côté client. Validation côté serveur via `auth-guard.service.ts`. | `src/components/ProtectedRoute.tsx`, `src/services/auth-guard.service.ts` |
| Protection contre les requêtes sortantes contrôlées (SSRF) | Garde dédoublée frontend (`src/services/url-validator.service.ts`) et Edge (`supabase/functions/_shared/ssrf-guard.ts`), avec liste d'autorisation par suffixe d'hôte et blocage des plages IP privées et des points de terminaison de métadonnées cloud | Idem |
| Gestion des secrets | `.gitignore` exclut `.env`, `.env.local`, `.env.*.local`. Un modèle `.env.example` est fourni sans secrets réels. Les secrets des fonctions Edge sont gérés en dehors du dépôt (commandes `supabase secrets set`). Une étape de détection naïve de motifs sensibles est présente dans la CI sur les diffs de pull request. | `.gitignore`, `.env.example`, `.github/workflows/ci.yml` |
| Authentification | Supabase Auth (JWT). Aucun mécanisme de second facteur (MFA) ni de fédération d'identité (SSO) n'est constaté dans le périmètre audité. | `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx` |
| Logs serveur | Logger Edge structuré conditionnel, avec tests. Aucune plateforme externe d'agrégation de logs n'est intégrée au dépôt. | `supabase/functions/_shared/logger.ts` |
| Chiffrement | TLS en transit (HTTPS obligatoire dans la garde SSRF par défaut). Le chiffrement au repos relève du fournisseur Supabase et n'a pas été vérifié dans le périmètre audité. | `supabase/functions/_shared/ssrf-guard.ts` |
| Données personnelles | Une page de mentions légales est présente. La politique de confidentialité, la DPIA et les modalités d'exercice des droits ne sont pas documentées dans le périmètre audité et relèvent d'éléments externes à fournir. | `src/pages/Legal.tsx` |

---

## 10. Documentation et éléments de transmission

Le dépôt contient une documentation interne abondante. Les principaux éléments utiles à un dossier de transmission sont les suivants.

| Document | Objet |
|---|---|
| `README.md` (racine) | Présentation du projet, scripts, architecture résumée |
| `docs/README.md` | Index de la documentation |
| `docs/GUIDE_UTILISATEUR.md` | Manuel utilisateur final |
| `docs/GUIDE_ADMINISTRATEUR.md` | Manuel administrateur |
| `docs/GUIDE_DEPLOIEMENT.md` | Procédure de déploiement |
| `docs/HANDOVER_DEVELOPPEUR.md` | Document de transmission développeur |
| `docs/DOCUMENTATION_TECHNIQUE.md` | Architecture et code |
| `docs/API_REFERENCE.md` | Référence des interfaces |
| `docs/archive/obsolete/API_SERVICES.md` | Documentation des services *(archivée 2026-05-31, partiellement obsolète : décrit `PDFExportService` qui n'existe plus)* |
| `docs/DICA_ORCHESTRATOR_GUIDE.md` | Guide de l'orchestrateur de prompt |
| `docs/AUDIT_DEPENDANCES.md` | Audit du graphe de dépendances et qualification des éléments tiers |
| `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md` | Audit technique synthétique *(snapshot décembre 2025, archivé 2026-05-31 ; voir `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` pour le rapport courant)* |
| `docs/AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md` | Diagnostic technique |
| `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` | Dossier interne associé |
| `docs/RAPPORT_VALORISATION_TECHNIQUE.md` | Rapport interne de valorisation |
| `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` | Synthèse de valorisation technique |
| `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` | Matrice de pondération heures × qualité |
| `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | Rapport qualité logicielle |
| `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` | Plan correctif suivi |
| `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md` | Suivi d'exécution du plan |
| `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` | Justification des migrations différées |
| `docs/CHECKLIST_SMOKE_KILLSWITCH.md` | Checklist d'exploitation |
| `docs/MODE_EMPLOI.md` | Mode d'emploi opérateur |
| `audit/` | Snapshots reproductibles des phases d'audit (`build.txt`, `lint.txt`, `test.txt`, `npm-audit.txt`, rapports de couverture et de licences) |

Les valeurs monétaires éventuelles d'un dossier d'apport ne sont pas reproduites dans le présent document et relèvent, le cas échéant, des documents internes susmentionnés ou d'une évaluation externe distincte.

---

## 11. Limites du périmètre constaté

| Élément | Statut dans le périmètre audité |
|---|---|
| Comportement runtime de l'application | Non vérifié dans le présent audit (aucun appel aux services externes Supabase / Google AI effectué). |
| Contrats, cessions de droits, conditions d'exploitation | Non présents dans le dépôt. À fournir séparément. |
| Volumes d'usage réels et indicateurs commerciaux | Non documentés dans le périmètre audité. |
| Niveaux de service (SLA) des fournisseurs tiers (Supabase, Google AI) | Non documentés dans le périmètre audité. |
| Conformité juridique (RGPD, AI Act, classification, DPIA) | Hors périmètre technique. |

---

## 12. Synthèse finale

Le dépôt audité présente un actif logiciel identifiable, structuré et documenté, comprenant :

- un code source applicatif organisé en couches distinctes (pages, services, composants, hooks, contextes, intégrations) ;
- des modules métier spécifiques au domaine d'usage (orchestration de prompt, génération de rendu, génération de livrables PDF, multi-tenant, quotas, partage sécurisé, administration) ;
- une couche backend portée par des fonctions Edge Deno et un modèle de données sécurisé par lignes ;
- des composants tiers identifiés (scaffold UI shadcn/ui, bibliothèques sous licences principalement MIT et ISC) clairement distincts du code propriétaire ;
- une chaîne d'intégration continue opérationnelle et des artefacts d'audit reproductibles ;
- une documentation interne exploitable.

Les éléments nécessitant une confirmation hors dépôt (modalités contractuelles, indicateurs d'exploitation, conformité juridique) sont mentionnés au § 11 et au § 6.8.

---

*Document technique transmis à des fins d'évaluation logicielle. Pour toute affirmation factuelle, se reporter aux fichiers cités en référence. Les modalités juridiques relèvent d'actes contractuels séparés.*
