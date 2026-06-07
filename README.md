# DICA Decorator

Application web propriétaire de visualisation IA des décors stratifiés du catalogue **DICA France**, développée par **KOREV AI**.

| Champ | Valeur |
|---|---|
| Nom | `dica-decorator` |
| Version (package.json) | `2.2.0` |
| Licence | `UNLICENSED` (propriétaire ; voir `package.json` et `docs/commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md`) |
| Propriétaire de la base logicielle | KOREV AI |
| Client / utilisateur final | DICA France et ses revendeurs |
| Statut du repository | Actif, en production |
| Stack | React 18 + TypeScript 5 / Vite 5 / Supabase / Edge Functions Deno / Google AI (Gemini) |
| Dernière revue documentaire | 2026-05-31 (cf. `docs/audit/documentation_cleanup_report_2026-05-31.md`) |

---

## 1. Description courte

DICA Decorator permet d'appliquer un décor stratifié du catalogue DICA sur une photographie d'un support réel (cabine d'ascenseur, van, terrasse, mobilier) via génération d'image par Google Gemini, et de produire des livrables visuels (comparaisons avant/après, brochures revendeur cobrandées, magazine de décoration, mood boards).

Le produit est un **SaaS web multi-tenant** : authentification Supabase, isolation par organisation, quotas de génération, audit log, et exports PDF/PNG/JPEG/WebP.

---

## 2. Modules actifs

Les services réellement présents dans `src/services/` au 2026-05-31 :

| Service | Rôle |
|---|---|
| `gemini-image.service.ts` | Génération d'image via Gemini (intégration et fallbacks) |
| `magazine-deco-pdf.service.ts` | Export PDF magazine éditorial (style AD) |
| `reseller-brochure-pdf.service.ts` | Brochure revendeur cobrandée |
| `image-comparison.service.ts` | Comparaison Avant / Après |
| `image-export.service.ts` | Export multi-format (PNG, JPEG, WebP) |
| `image-storage.service.ts` | Migration base64 → Storage Supabase |
| `share-link.service.ts` | Partage sécurisé par lien à expiration |
| `presentation.service.ts` | Mode présentation plein écran |
| `analytics.service.ts` / `analytics-export.service.ts` | Métriques produit et exports JSON / Excel / PDF |
| `auth-guard.service.ts` | Vérification rôles & permissions |
| `rate-limiter.service.ts` / `quota.service.ts` | Limites de génération (jour, mois, organisation) |
| `organization.service.ts` | Multi-tenant (organisations, membres, invitations) |
| `url-validator.service.ts` | Garde anti-SSRF (frontend) |
| `parallel-fetch.service.ts` | Chargement parallèle de ressources |
| `project-deletion.service.ts` / `project-rename.service.ts` / `admin-project-viewer.service.ts` | Gestion projets et opérations admin |
| `favorites.service.ts` | Gestion des rendus favoris |

Les Edge Functions Deno actives sont dans `supabase/functions/` (notamment `apply-decor`, `creative-chat`, `generate-magazine-captions`, `analytics`, `_shared/ssrf-guard.ts`).

---

## 3. Modules legacy / archivés

Pour ne pas induire en erreur un nouvel arrivant ou un auditeur, les services et documents suivants ont été supprimés ou archivés :

| Élément | Statut | Trace |
|---|---|---|
| `plaquette-pdf.service.ts` (avec classe `PlaquettePdfService`) | **Supprimé du code** ; remplacé par `magazine-deco-pdf.service.ts` + `reseller-brochure-pdf.service.ts` | `docs/archive/obsolete/PLAQUETTE_PDF_COBRANDING.md` |
| `PDFExportService` (alias documenté) | **Jamais présent dans le code actuel** ; vestige de doc | `docs/archive/obsolete/API_SERVICES.md` |
| Plugin Vite de tagging hérité de l'outil de scaffolding initial | **Retiré** des dépendances runtime/devDependencies | `docs/AUDIT_DEPENDANCES.md` |
| Index documentaire v2.0.0 (décembre 2025) | **Remplacé** par `docs/README.md` (à jour) | `docs/archive/obsolete/README_v2.0.0_2025-12.md` |
| Audit technique snapshot (17 décembre 2025, 784 tests / 25 suites) | **Historique** ; conservé pour traçabilité | `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md` |
| Plan correctif personnalisation revendeur (décembre 2025) | **Plan exécuté** ; conservé pour traçabilité TDD | `docs/archive/historical/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` |
| Brochure commerciale Gamma (décembre 2025) | **Document commercial** non technique ; conservé pour mémoire | `docs/archive/historical/BROCHURE_COMMERCIALE_GAMMA.md` |
| Résumé exécutif v2.0.0 (décembre 2025) | **Historique** | `docs/archive/historical/DICA_FRANCE_RESUME_2025-12.md` |
| Prompt de contrôle onboarding (décembre 2025) | **Checklist ponctuelle** archivée | `docs/archive/historical/PROMPT_CONTROLE_ONBOARDING.md` |
| Prompt de contrôle plaquette (novembre 2025) | **Obsolète** (cible `PlaquettePdfService` supprimé) | `docs/archive/obsolete/PROMPT_CONTROLE_PLAQUETTE.md` |

> La documentation active prime sur les documents archivés. Aucun document archivé ne doit être utilisé comme référence opérationnelle courante.

---

## 4. Architecture générale

Architecture trois couches, factuelle :

1. **Frontend** : SPA React 18 / TypeScript 5 / Vite 5, routing `react-router-dom@6`, état serveur via TanStack Query, UI shadcn/ui + Radix, formulaires `react-hook-form` + `zod`. Code source : `src/`.
2. **Backend managé** : projet Supabase (PostgreSQL, Auth JWT, Storage, RLS), avec Edge Functions Deno pour orchestration IA et logique côté serveur. Définition : `supabase/`.
3. **IA externe** : Google AI Gemini (modèle `gemini-3-pro-image-preview` pour la génération d'image, `gemini-2.5-flash` pour la composition texte). Appelée uniquement depuis les Edge Functions ; aucune clé API n'est exposée au navigateur.

Pour une description détaillée et auditable de l'architecture (modules propriétaires, dépendances tierces, flux de données, sécurité), voir `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md`.

---

## 5. Démarrage local

### Prérequis

- Node.js `>= 20.0.0` (cf. `package.json#engines`)
- npm `>= 10.0.0`
- Un projet Supabase (URL + clés `anon` et `service_role` côté serveur)
- Une clé Google AI (utilisée par les Edge Functions, pas par le frontend)

### Installation

```bash
git clone <repository-url>
cd dica-decorator
npm install
cp .env.example .env.local
# Compléter .env.local : VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, etc.
npm run dev
```

L'application est alors servie sur `http://localhost:8080`.

### Scripts disponibles (cf. `package.json`)

| Script | Effet |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (sortie : `dist/`) |
| `npm run build:dev` | Build en mode développement |
| `npm run preview` | Aperçu du build de production |
| `npm run lint` | ESLint sur l'ensemble du repo |
| `npm run test` / `test:run` | Tests Vitest (mode watch / une passe) |
| `npm run test:coverage` | Tests + couverture v8 |
| `npm run test:ui` | UI Vitest |

---

## 6. Tests et qualité

Mesures observées au 2026-05-31, sources reproductibles :

| Indicateur | Valeur | Source |
|---|---|---|
| Suites de tests Vitest | 27 | `npm run test:run` |
| Tests unitaires | 825 | `npm run test:run` |
| TypeScript | `tsc --noEmit` = 0 erreur | `audit/final/build.txt` |
| ESLint | 0 erreur, ~170 warnings `any` (non bloquants) | `audit/final/lint.txt` |
| Vulnérabilités npm | Suivies en migration différée | `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` |
| Pipelines CI/CD | GitHub Actions : `ci.yml` (qualité), `cd-edge-functions.yml` (déploiement Edge) | `.github/workflows/README.md` |

Pour le rapport de qualité courant, voir `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`.
Pour la trajectoire historique (incluant le snapshot décembre 2025 à 784 tests / 25 suites), voir `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md`.

---

## 7. Sécurité (énoncé synthétique)

- Authentification JWT via Supabase Auth.
- Row Level Security (RLS) sur l'ensemble des tables métier.
- Garde anti-SSRF côté frontend (`url-validator.service.ts`) et côté Edge Functions (`supabase/functions/_shared/ssrf-guard.ts`).
- Rate limiting et quotas de génération par utilisateur et organisation.
- Aucun secret en clair dans le repository ; les secrets sont gérés via variables d'environnement et secrets Supabase / GitHub Actions.
- Audits de licences et de vulnérabilités automatisés en CI.

Pour le détail, voir `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` § 7 et `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`.

---

## 8. Procédure de contribution

Le repository est privé. Les contributions internes suivent la règle suivante :

1. Les modifications de logique métier doivent être accompagnées de tests Vitest.
2. La CI (`.github/workflows/ci.yml`) doit être verte sur la PR avant merge : lint, tests, build.
3. Toute modification d'Edge Function doit être déployée via le workflow manuel `cd-edge-functions.yml`.
4. Toute modification de la documentation doit respecter la séparation **active / archive** décrite ci-dessous (§ 10).
5. Les rapports d'audit, de qualité et de valorisation ne doivent jamais être supprimés ; en cas d'obsolescence, ils sont archivés (cf. `docs/audit/documentation_cleanup_report_2026-05-31.md`).

---

## 9. Documentation de référence

> **Règle générale : la documentation active (`docs/*.md`, `docs/audit/`, `docs/commissaire_aux_apports/`) est prioritaire sur les documents archivés (`docs/archive/`).**

### 9.1 Index documentaire

Le point d'entrée détaillé est `docs/README.md`.

### 9.2 Documents techniques actifs

| Document | Contenu |
|---|---|
| `docs/DOCUMENTATION_TECHNIQUE.md` | Stack technique, architecture applicative, services TDD, sécurité (note de fraîcheur 2026-05-31). |
| `docs/API_REFERENCE.md` | Endpoints Supabase et Edge Functions historiques (note de fraîcheur 2026-05-31). |
| `docs/DICA_ORCHESTRATOR_GUIDE.md` | Orchestrateur AI Gemini et fonctions associées. |
| `docs/HANDOVER_DEVELOPPEUR.md` | Handover technique structuré (architecture, scripts, alertes, points de vigilance). |
| `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` | Vulnérabilités npm en migration différée et plan de traitement. |
| `docs/AUDIT_DEPENDANCES.md` | Suivi des dépendances tierces et retraits (ex. plugin Vite de tagging du scaffolding initial). |
| `docs/AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md` | Audit ciblé bureau diagnostique. |
| `docs/CHECKLIST_SMOKE_KILLSWITCH.md` | Checklist de vérification post-déploiement (smoke + killswitch). |
| `docs/MODE_EMPLOI.md` | Mode opératoire condensé. |
| `.github/workflows/README.md` | Description factuelle des pipelines CI/CD. |

### 9.3 Documents utilisateurs et exploitation

| Document | Contenu |
|---|---|
| `docs/GUIDE_UTILISATEUR.md` | Guide de l'utilisateur final (note de fraîcheur 2026-05-31). |
| `docs/GUIDE_ADMINISTRATEUR.md` | Guide d'administration (note de fraîcheur 2026-05-31). |
| `docs/GUIDE_DEPLOIEMENT.md` | Procédure d'installation et de déploiement (note de fraîcheur 2026-05-31). |

### 9.4 Documents de qualité, valorisation, audit cabinet

| Document | Usage |
|---|---|
| `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | Rapport qualité courant. |
| `docs/RAPPORT_VALORISATION_TECHNIQUE.md` | Rapport interne de valorisation technique. |
| `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` | Synthèse interne valorisation. |
| `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` | Matrice heures × qualité (interne). |
| `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` | Plan de correction des risques de décote. |
| `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md` | Suivi d'exécution du plan de correction. |
| `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` | Dossier interne pour commissaire aux apports. |
| `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` | Documentation projet standardisée pour cabinet d'audit. |
| `docs/audit/PROJECT_AUDIT_NOTES.md` | Notes méthodologiques de l'audit cabinet. |
| `docs/audit/documentation_cleanup_report_2026-05-31.md` | Rapport de la présente mission de nettoyage documentaire. |
| `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` | Document destiné au commissaire aux apports. |
| `docs/commissaire_aux_apports/CONTROLE_DOCUMENTATION_PROJET.md` | Rapport de contrôle interne associé. |
| `docs/commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md` | Note interne sur licence commerciale et droits d'exploitation. |

---

## 10. Documents archivés / historiques

`docs/archive/` contient les documents qui **ne doivent plus être utilisés comme référence opérationnelle**.

| Sous-dossier | Contenu | Politique |
|---|---|---|
| `docs/archive/obsolete/` | Documents contradictoires avec le code actuel (services supprimés, version incompatible). | Ne pas utiliser. Conservés pour traçabilité. |
| `docs/archive/historical/` | Documents anciens utiles à la traçabilité (snapshots d'audit, plans exécutés, supports commerciaux datés). | Lecture autorisée pour comprendre la trajectoire ; ne pas opposer à un état présent. |

Chaque document archivé porte un encadré `⚠️ DOCUMENT ARCHIVÉ` en tête, précisant son statut, sa date d'archivage, la raison de l'archivage, et le document de remplacement.

---

## 11. Pour les auditeurs et le commissaire aux apports

Pour éviter toute confusion entre **état actuel** et **historique** :

- **Vue technique courante** auditable : `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md`. C'est le document de référence pour un cabinet d'audit ou de due diligence.
- **Vue commissaire aux apports** : `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md`, complétée par les notes internes (`CONTROLE_DOCUMENTATION_PROJET.md`, `NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md`).
- **Trajectoire historique** : `docs/archive/historical/` (snapshot audit décembre 2025, plans exécutés, support de présentation commerciale).
- **Méthodologie de l'audit documentaire** : `docs/audit/documentation_cleanup_report_2026-05-31.md`.

Les chiffres opérationnels (tests, suites, services, vulnérabilités) cités dans la documentation active sont reproductibles à partir des artefacts dans `audit/final/` (sortie de `npm run lint`, `npm run test:run`, `npm run build`, `npm audit`). Les chiffres cités dans la documentation archivée correspondent à un état antérieur du projet et ne doivent pas être confondus avec l'état présent.

---

## 12. Licence

Le code source est sous licence `UNLICENSED` (cf. `package.json`). Cela signifie qu'il s'agit d'un logiciel propriétaire dont aucun droit n'est concédé par défaut. Les dépendances open-source sont sous leurs licences respectives (majoritairement MIT, ISC, Apache-2.0) ; voir `audit/phase-minus-1/licenses-prod.csv` et `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` § 6.

Pour la position détaillée sur la propriété intellectuelle, la licence commerciale et les droits d'exploitation (KOREV AI vs DICA France), voir `docs/commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md` (note interne, à valider juridiquement).

---

## 13. Contact

- Support technique DICA : `tech@dica-france.com`
- Documentation : `docs/README.md`
- Issues internes : suivi GitHub privé du projet.

---

© DICA France — base logicielle développée par KOREV AI. Application propriétaire ; reproduction et redistribution non autorisées sans accord écrit.
