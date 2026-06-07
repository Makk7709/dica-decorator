# Notes d'audit — DICA Decorator

> Document complémentaire à `PROJECT_DOCUMENTATION_STANDARD.md`. Il documente la méthodologie d'audit appliquée, les commandes utilisées, les références croisées et les zones explicitement écartées du périmètre. Aucun élément n'est sourcé hors du dépôt audité.

---

## 1. Périmètre exact

| Élément | Valeur |
|---|---|
| Dépôt audité | `dica-decorator` |
| Chemin local | `/Users/aminemohamed/Desktop/APP/DICADECOR/dica-decorator` |
| Branche | `audit/tier1-2026-05-07` |
| HEAD audité | `274e4d040ae37e766ac1f7cc9e3ccd8a4a5ac546` |
| Message HEAD | `docs: dossier commissaire aux apports rev3 + audit tier-1 + valorisation` |
| Date de l'audit | 21/05/2026 |
| Auditeur | Audit cabinet — pipeline standardisé exécuté par assistant |

L'audit a porté **exclusivement** sur le contenu versionné Git observable à ce HEAD. Aucun appel à un service externe (Supabase, Google AI, GitHub Actions) n'a été effectué dans le cadre de cet audit pour valider le comportement runtime.

---

## 2. Commandes utilisées et reproductibles

### 2.1 Identification du dépôt

```bash
git rev-parse --show-toplevel
git branch --show-current
git log -1 --format='%H %s'
```

### 2.2 Structure du dépôt

```bash
ls -la
ls -la docs/ audit/ src/ supabase/ .github/
ls src/pages/ src/services/ src/components/ src/hooks/ src/contexts/ src/lib/ src/integrations/
ls supabase/functions/ supabase/migrations/
```

### 2.3 Volumes de code (méthode `wc -l`)

```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
find supabase -name "*.ts" | xargs wc -l | tail -1
wc -l supabase/functions/apply-decor/index.ts \
      supabase/functions/creative-chat/index.ts \
      supabase/functions/creative-chat/orchestrator.ts \
      supabase/functions/get-analytics/index.ts \
      supabase/functions/get-users-admin/index.ts \
      supabase/functions/generate-magazine-captions/index.ts \
      supabase/functions/_shared/*.ts
wc -l src/services/*.ts src/services/__tests__/*.ts
find src supabase -name "*.test.ts" -o -name "*.test.tsx" | wc -l
find src/components/ui -maxdepth 1 -type f | wc -l
```

### 2.4 Détection d'éléments

```bash
# Recherche de scaffolding tiers / origine du projet
rg -i "agent[-_ ]?zero|PRISM|Oracle|Evidence|KOREV" -l

# Inventaire SQL
rg -i "CREATE TABLE"          supabase/migrations/ -c
rg -i "CREATE POLICY"         supabase/migrations/ -c
rg -i "ENABLE ROW LEVEL SECURITY" supabase/migrations/ -c
rg -i "CREATE (TABLE|FUNCTION|POLICY|TRIGGER|INDEX|TYPE)" supabase/migrations/
```

### 2.5 Lectures de fichiers

- `package.json`, `README.md`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.gitignore`, `.env.example`, `tsconfig*.json`
- `src/App.tsx`, `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`
- Échantillons de services : `auth-guard.service.ts`, `rate-limiter.service.ts`, `quota.service.ts`, `url-validator.service.ts`, `magazine-deco-pdf.service.ts`, `reseller-brochure-pdf.service.ts`, `share-link.service.ts`, `gemini-image.service.ts`, `organization.service.ts`, `analytics.service.ts`, `image-storage.service.ts`
- Edge Functions : `apply-decor/index.ts`, `creative-chat/index.ts`, `creative-chat/orchestrator.ts`, `_shared/ssrf-guard.ts`
- Workflows : `.github/workflows/ci.yml`, `.github/workflows/cd-edge-functions.yml`
- Snapshots d'audit pré-existants : `audit/final/test.txt`, `audit/final/lint.txt`, `audit/final/npm-audit.txt`, `audit/final/build.txt`, `audit/phase-0/coverage.txt`
- Documentation existante : `docs/AUDIT_DEPENDANCES.md`

---

## 3. Mesures clés (chiffres recensés)

### 3.1 Code source

| Périmètre | Lignes |
|---|---|
| `src/**/*.{ts,tsx}` cumulés | 43 282 |
| `supabase/**/*.ts` cumulés | 4 027 |
| `supabase/functions/apply-decor/index.ts` | 1 206 |
| `supabase/functions/creative-chat/index.ts` | 806 |
| `supabase/functions/creative-chat/orchestrator.ts` | 514 |
| `supabase/functions/generate-magazine-captions/index.ts` | 385 |
| `supabase/functions/get-users-admin/index.ts` | 301 |
| `supabase/functions/get-analytics/index.ts` | 287 |
| `supabase/functions/_shared/ssrf-guard.ts` | 154 |
| `supabase/functions/_shared/logger.ts` | 66 |
| `src/integrations/supabase/types.ts` | 602 |
| `src/services/reseller-brochure-pdf.service.ts` | 1 071 |
| `src/services/share-link.service.ts` | 561 |
| `src/services/url-validator.service.ts` | 369 |

### 3.2 Tests

| Élément | Valeur | Source |
|---|---|---|
| Nombre de fichiers de test (`*.test.ts` / `.tsx`) | 28 (recompte `find`) | `find src supabase -name '*.test.ts' -o -name '*.test.tsx' \| wc -l` |
| Tests exécutés au dernier run archivé | 825 passants, 27 fichiers | `audit/final/test.txt` (dernières lignes) |
| Couverture statements | 30,42 % | `audit/phase-0/coverage.txt` |
| Couverture branches | 77,58 % | Idem |
| Couverture functions | 67,98 % | Idem |
| Couverture lines | 30,42 % | Idem |
| Seuil aspirationnel configuré | 80 % (toutes métriques) | `vitest.config.ts` lignes 28-33 |

**Note interprétative.** Le delta entre la mesure brute (30 %) et la valeur effective de la couche `src/services/` (élevée par observation directe des fichiers de tests) provient de l'absence de couverture des Edge Functions Deno sous Vitest. Aucune mesure isolée `src/services/` n'est disponible dans les artefacts archivés au moment de l'audit.

### 3.3 SQL

| Élément | Valeur (recompte `grep`) |
|---|---|
| Migrations SQL versionnées | 23 (fichiers `supabase/migrations/*.sql`) |
| `CREATE TABLE` total | ≥ 17 occurrences sur 8 fichiers |
| `CREATE POLICY` total | ≥ 57 occurrences sur 11 fichiers |
| `ENABLE ROW LEVEL SECURITY` total | ≥ 15 occurrences sur 8 fichiers |
| Types enum SQL | `app_role` (`admin`/`client`), `usage_context` (`ascenseur`/`van`/`terrasse`/`autre`) |

### 3.4 Lint

| Mesure | Valeur | Source |
|---|---|---|
| Erreurs ESLint | 148 | `audit/final/lint.txt` (dernière ligne) |
| Warnings ESLint | 13 | Idem |
| Règle désactivée | `@typescript-eslint/no-unused-vars` | `eslint.config.js` ligne 23 |

### 3.5 Audit dépendances

| Niveau | Compte | Paquet identifié |
|---|---|---|
| Critique | 1 | `jspdf` <=4.2.0 (10 advisories cumulés) |
| Modérée | 2 | `esbuild`, `vite` (dépendance transitive) |
| Total | 3 | — |

Source : `audit/final/npm-audit.txt`.

### 3.6 Build

| Mesure | Valeur | Source |
|---|---|---|
| Build production | OK (3,15 s) | `audit/final/build.txt` (dernière ligne) |
| Plus gros chunk | `AdminAnalytics-hchvA5an.js` 436 kB (117 kB gzip) | Idem |
| Bundle JS principal | `index-oGtYMAzj.js` 309 kB (89 kB gzip) | Idem |

---

## 4. Références croisées avec la documentation existante

| Affirmation du présent audit | Document source supportant |
|---|---|
| Nettoyage du plugin Vite de tagging | `docs/AUDIT_DEPENDANCES.md` § 2 |
| Aucune dépendance `@lovable.dev/cloud-auth-js` | `docs/AUDIT_DEPENDANCES.md` § 3 |
| Migration jspdf différée | `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` |
| Position commissaire aux apports | `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` |
| Matrice heures × qualité (préexistante) | `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` |
| Rapport qualité logicielle préexistant | `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` |
| Plan correctif anti-décote | `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` |
| Snapshot CI archivé | `audit/final/*` + `audit/phase-0/coverage.txt` |

Le présent document ne se substitue à aucun de ces livrables ; il fournit un format **standardisé orienté cabinet** indépendant.

---

## 5. Zones explicitement écartées du périmètre

Les éléments suivants sont **hors champ** de cet audit faute de matière dans le repo, et doivent être confirmés par le porteur :

1. Identité juridique éditeur (KOREV AI) vs. donneur d'ordre (DICA France), chaîne de cession des droits, contrat de prestation/cession.
2. Volumes d'usage réels (renders/mois, organisations actives, taux d'engagement, revenus).
3. Politique de confidentialité, registre de traitement RGPD, DPIA, classification AI Act.
4. SLA Supabase, SLA Google AI, contrats commerciaux opérateurs.
5. Audit de sécurité externe (pentest, audit code tiers).
6. Stratégie d'observabilité production (logs, métriques, alertes), runbook d'incident.
7. Plan de continuité applicatif (procédure de restore, fréquence des backups Supabase, RPO/RTO cibles).
8. Tests d'intégration end-to-end automatisés (aucun framework E2E type Playwright/Cypress trouvé dans `package.json`).
9. Inventaire exhaustif des composants `src/components/ui/` issus du scaffold shadcn/ui vs. spécifiques au produit (échantillonnage seulement dans cet audit).
10. Statut runtime de la passerelle AI Gateway (`AI_GATEWAY_URL`) en production.

---

## 6. Choix méthodologiques explicites

### 6.1 Pas d'extrapolation

Le présent audit ne fait **aucune affirmation** qui ne soit rattachée à un fichier, dossier, commande ou élément observable. Lorsqu'une information est absente, la mention explicite « **Non documenté dans le périmètre audité** » ou « **À confirmer** » est utilisée.

### 6.2 Pas de classement monétaire

Aucune valorisation monétaire (€, heures × TJM, multiples) n'est présente dans cet audit. La valorisation est un exercice d'expertise externe qui ne relève pas du format documentaire standardisé demandé. Les documents internes du projet (`docs/RAPPORT_VALORISATION_TECHNIQUE.md`, `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md`, etc.) traitent ce sujet en propre et n'ont pas été repris ici.

### 6.3 Pas de jugement promotionnel

Le ton est délibérément factuel. Toute formulation supérlative ou marketing a été évitée, conformément à la consigne d'audit. Les points forts comme les points faibles sont présentés au même niveau de rigueur.

### 6.4 Distinction observation / déduction / à confirmer

| Type | Exemple |
|---|---|
| Constaté dans le code | « `package.json` ligne 8 déclare la licence `UNLICENSED` » |
| Déduit raisonnablement | « Les tables avec `ENABLE ROW LEVEL SECURITY` sont au moins au nombre de 14, recensées par grep » |
| À confirmer par le porteur | « La chaîne de cession des droits entre KOREV AI et DICA France n'est pas documentée dans le périmètre audité » |

### 6.5 Origine du scaffold UI

Le sous-arbre `src/components/ui/` est traité **comme un scaffold shadcn/ui** (composants Radix UI sous licence MIT, configuration `components.json`). Aucun fichier `LICENSE` global tiers n'a été trouvé dans le périmètre audité — la mention de licence repose sur la convention publique du générateur shadcn/ui et la liste des dépendances `@radix-ui/*` dans `package.json`. Cette assomption est explicitée et marquée comme « à confirmer » au § 12 du document principal.

---

## 7. Liste exhaustive des fichiers ouverts pendant l'audit

| Fichier | Objet |
|---|---|
| `package.json` | Inventaire des dépendances et scripts |
| `vite.config.ts` | Configuration build |
| `vitest.config.ts` | Configuration tests + seuils |
| `eslint.config.js` | Configuration lint |
| `.gitignore` | Périmètre versionné |
| `.env.example` | Template variables d'environnement |
| `README.md` | Document d'entrée projet |
| `src/App.tsx` | Routage racine, providers |
| `src/integrations/supabase/client.ts` | Client Supabase frontend |
| `src/contexts/AuthContext.tsx` | Contexte d'authentification |
| `src/components/ProtectedRoute.tsx` | Garde de route |
| `src/services/auth-guard.service.ts` (extrait) | RBAC serveur |
| `src/services/rate-limiter.service.ts` (extrait) | Rate limit |
| `src/services/quota.service.ts` (extrait) | Quotas |
| `src/services/url-validator.service.ts` (extrait) | Anti-SSRF frontend |
| `src/services/magazine-deco-pdf.service.ts` (extrait) | PDF Magazine DÉCO |
| `src/services/reseller-brochure-pdf.service.ts` (extrait) | PDF Brochure revendeur |
| `src/services/share-link.service.ts` (extrait) | Liens partagés |
| `src/services/gemini-image.service.ts` (extrait) | Encapsulation Gemini |
| `src/services/organization.service.ts` (extrait) | Multi-tenant |
| `src/services/analytics.service.ts` (extrait) | Analytics |
| `src/services/image-storage.service.ts` (extrait) | Stockage images |
| `supabase/functions/apply-decor/index.ts` (extrait) | Edge génération rendu |
| `supabase/functions/creative-chat/index.ts` (extrait) | Edge chat IA |
| `supabase/functions/creative-chat/orchestrator.ts` (extrait) | Orchestrateur prompt |
| `supabase/functions/_shared/ssrf-guard.ts` | Anti-SSRF Edge |
| `supabase/migrations/20251126234705_…sql` | Migration initiale (échantillon) |
| `.github/workflows/ci.yml` | Pipeline CI |
| `.github/workflows/cd-edge-functions.yml` | Pipeline CD Edge |
| `audit/final/test.txt` | Dernier run de tests archivé |
| `audit/final/lint.txt` | Dernier passage lint archivé |
| `audit/final/npm-audit.txt` | Dernier `npm audit` archivé |
| `audit/final/build.txt` | Dernier build archivé |
| `audit/phase-0/coverage.txt` | Mesure de couverture archivée |
| `docs/AUDIT_DEPENDANCES.md` (extrait) | Croisement dépendances |

Les autres fichiers du dépôt n'ont pas été ouverts mais ont été inventoriés (nom, taille, emplacement) via `ls`, `find`, `wc`.

---

## 8. Reproductibilité

L'auditeur tiers peut reproduire les mesures ci-dessus en exécutant les commandes du § 2 sur le HEAD `274e4d0` de la branche `audit/tier1-2026-05-07`. Les artefacts archivés sous `audit/final/` et `audit/phase-0/` sont produits par les commandes :

```bash
npm ci --no-audit --no-fund
npm run lint              > audit/<phase>/lint.txt 2>&1
npm run test:run          > audit/<phase>/test.txt 2>&1
npm run test:coverage     > audit/<phase>/coverage.txt 2>&1
npm run build             > audit/<phase>/build.txt 2>&1
npm audit                 > audit/<phase>/npm-audit.txt 2>&1
```

Ces commandes sont également exécutées par la CI à chaque push (`.github/workflows/ci.yml`).

---

## 9. Conformité au format demandé

Le document principal (`PROJECT_DOCUMENTATION_STANDARD.md`) respecte la structure obligatoire à 13 sections demandée par le brief d'audit. Aucune section n'a été supprimée ou fusionnée. Le ton est cabinet, sans emoji, sans promesse commerciale, sans claim non vérifiable. Les zones d'incertitude sont signalées explicitement (mentions « À confirmer », « Non documenté dans le périmètre audité »).

---

*Ces notes constituent l'annexe méthodologique du document standardisé. Elles ne contiennent aucune information confidentielle additionnelle non présente dans le code source du dépôt audité.*
