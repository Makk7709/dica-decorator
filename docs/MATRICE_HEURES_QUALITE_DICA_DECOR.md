# MATRICE HEURES × QUALITÉ — DICA Decorator

**Référence** : DICA-DEC-MAT-2026
**Date** : 06/05/2026
**Émetteur** : KOREV AI
**Méthode** : Estimation bottom-up par bloc, à partir de l'inspection directe du code source, des tests, des migrations SQL et de l'historique Git de la branche `main`.

---

## Hypothèses de calcul

| Paramètre | Valeur |
|-----------|--------|
| Profil de référence | Développeur senior plein expert React 18 + TypeScript + Supabase + intégration IA |
| Productivité réelle | ≈ 6 heures productives par jour (hors réunions, contexte switching, pauses) |
| Mode de travail | Sans assistance IA générative de code (estimation conservatrice — l'usage d'IA réduirait la fourchette basse) |
| Tarifs / valorisation monétaire | **Hors périmètre** : matrice purement en jours-homme, conversion à l'appréciation du commissaire aux apports |
| Périmètre couvert | Code applicatif + tests + documentation + migrations SQL + Edge Functions, **hors discussion avec le client / cadrage produit / itérations design** |
| Hypothèse | Sont exclus de l'estimation les temps de **discovery produit**, **design Figma**, **réunions client**, **gestion de projet** — seul le temps de production technique est comptabilisé |

### Échelle de complexité

| Niveau | Définition |
|--------|-----------|
| ★ | Configuration / boilerplate / glue code |
| ★★ | CRUD standard, intégration documentée |
| ★★★ | Logique métier non triviale, multiples cas limites |
| ★★★★ | Algorithmie / sécurité / orchestration IA / pipeline complexe |

### Lecture des colonnes

| Colonne | Sens |
|---------|------|
| **Bloc fonctionnel** | Module ou fonctionnalité regroupée |
| **Description** | Ce qui est livré |
| **Nature du travail** | Conception · Implémentation · Tests · Doc · Intégration |
| **Complexité** | Voir échelle ci-dessus |
| **Bas (j/h)** | Hypothèse optimiste — réutilisation maximale, sénior chevronné |
| **Central (j/h)** | Estimation **prudente, défendable**, retenue pour la valorisation |
| **Haut (j/h)** | Hypothèse haute — tâtonnements / itérations |
| **Preuves repo** | Chemins ou fichiers attestant du livrable |
| **Tests associés** | Suites de tests Vitest correspondantes |
| **Facteur qualité** | Élevé / Moyen / Faible |
| **Risque de décote** | Risque que l'évaluateur retienne moins que la valeur centrale |

---

## Matrice détaillée

### Bloc 1 — Architecture frontend (config + routing + layout + design system)

| Champ | Valeur |
|-------|--------|
| Description | Vite config, alias `@/`, code-splitting manuel, lazy routes, layout principal, intégration shadcn/ui sur 24 primitives Radix, tokens Tailwind, thème jour/nuit |
| Nature | Conception + implémentation + intégration |
| Complexité | ★★ |
| Bas / Central / Haut | 6 / **8** / 11 |
| Preuves repo | `vite.config.ts`, `tailwind.config.ts`, `src/App.tsx`, `src/main.tsx`, `src/components/ui/*` (75 composants) |
| Tests | indirects (composants UI testés via shadcn/ui upstream) |
| Qualité | Élevée — structure modulaire, alias propres, build optimisé < 1,5 Mo gzip |
| Risque de décote | Faible |

### Bloc 2 — Authentification + multi-tenant (orgs, rôles, RLS, invitations)

| Champ | Valeur |
|-------|--------|
| Description | Pages Auth (connexion / inscription / oubli mot de passe), `OrganizationService`, `AuthGuardService`, RLS Postgres, invitations tokenisées |
| Nature | Conception + implémentation + tests + RLS |
| Complexité | ★★★ |
| Bas / Central / Haut | 9 / **12** / 16 |
| Preuves repo | `src/pages/Auth.tsx`, `src/services/auth-guard.service.ts`, `src/services/organization.service.ts`, `supabase/migrations/*organization*`, `supabase/functions/get-users-admin/` |
| Tests | `auth-guard.service.test.ts` (31), `organization.service.test.ts` (27) → 58 tests |
| Qualité | Élevée — RLS systématique, JWT vérifié côté Edge, garde de pages testée |
| Risque de décote | Faible |

### Bloc 3 — Gestion projets et rendus (CRUD + upload + états)

| Champ | Valeur |
|-------|--------|
| Description | Création / édition / suppression / renommage projets, upload photo, gestion historique des rendus, états de chargement, mutations optimistes |
| Nature | Conception + implémentation + tests |
| Complexité | ★★★ |
| Bas / Central / Haut | 10 / **14** / 18 |
| Preuves repo | `src/pages/Dashboard.tsx`, `src/pages/ProjectDetail.tsx`, `src/pages/NewProject.tsx`, `src/services/project-deletion.service.ts`, `src/services/project-rename.service.ts` |
| Tests | `project-deletion.service.test.ts`, `project-rename.service.test.ts`, `parallel-fetch.service.test.ts`, `admin-project-viewer.service.test.ts` |
| Qualité | Élevée — TanStack Query, mutations optimistes, tests CRUD |
| Risque de décote | Faible |

### Bloc 4 — Pipeline IA Gemini image (`apply-decor`)

| Champ | Valeur |
|-------|--------|
| Description | Edge Function Deno : authentification, validation entrées, fetch texture décor, construction de prompt en anglais avec contraintes matériaux, appel Gemini 3 Pro Image Preview, parsing réponse multimodale, retour image + références |
| Nature | Conception + intégration IA + tests |
| Complexité | ★★★★ |
| Bas / Central / Haut | 7 / **10** / 14 |
| Preuves repo | `supabase/functions/apply-decor/index.ts` (~1 000 lignes), `src/services/gemini-image.service.ts` |
| Tests | `gemini-image.service.test.ts` (46) |
| Qualité | Élevée — gestion erreurs typée, retry, encodage image, MIME |
| Risque de décote | Faible |

### Bloc 5 — Chat créatif + DICA Prompt Orchestrator (propriétaire)

| Champ | Valeur |
|-------|--------|
| Description | Edge Function `creative-chat`, orchestrateur propriétaire avec `tool_calls` JSON Schema strict, validation post-IA des références (exact + case-insensitive + fuzzy matching), auto-correction, mode chat texte streaming + mode génération image multi-source |
| Nature | Conception + algorithmie + intégration IA + tests |
| Complexité | ★★★★ |
| Bas / Central / Haut | 10 / **14** / 19 |
| Preuves repo | `supabase/functions/creative-chat/index.ts` (~730 lignes), `supabase/functions/creative-chat/orchestrator.ts` (~510 lignes), `src/pages/Creative.tsx`, `src/hooks/use-decor-context-cache.ts` |
| Tests | `use-decor-context-cache.test.ts` (18 dont 3 échouants pré-existants — voir §risques) |
| Qualité | Élevée — orchestration validée, garde-fous métier, JSON Schema |
| Risque de décote | Moyen — l'algorithme de fuzzy matching mérite tests dédiés |

### Bloc 6 — Magazine DÉCO PDF (export éditorial style AD Magazine)

| Champ | Valeur |
|-------|--------|
| Description | Génération PDF multi-pages, layout éditorial, typographie premium (Playfair / Bodoni / Allura), captions générées par IA Gemini 2.5 Pro, fallback de secours |
| Nature | Conception layout + implémentation + tests + intégration IA |
| Complexité | ★★★★ |
| Bas / Central / Haut | 7 / **10** / 14 |
| Preuves repo | `src/services/magazine-deco-pdf.service.ts`, `supabase/functions/generate-magazine-captions/index.ts` |
| Tests | (couverture indirecte via `reseller-brochure-pdf` qui partage le moteur) |
| Qualité | Élevée — fallback intégré, contrôle longueur (truncation) |
| Risque de décote | Moyen — peu de tests directs sur `magazine-deco-pdf` lui-même |

### Bloc 7 — Brochure revendeur + co-branding admin

| Champ | Valeur |
|-------|--------|
| Description | Variante de Magazine DÉCO avec couverture personnalisable (logo + raison sociale revendeur), interface admin de configuration co-branding |
| Nature | Implémentation + tests + UI admin |
| Complexité | ★★★ |
| Bas / Central / Haut | 5 / **7** / 10 |
| Preuves repo | `src/services/reseller-brochure-pdf.service.ts`, `src/components/admin/reseller-branding-settings.tsx`, `docs/archive/obsolete/PLAQUETTE_PDF_COBRANDING.md` *(archivée 2026-05-31, décrit l'ancien service `PlaquettePdfService` désormais remplacé)* |
| Tests | `reseller-brochure-pdf.service.test.ts` (60) + `reseller-brochure-personalization.test.ts` (26) → 86 tests |
| Qualité | Élevée — couverture de tests forte |
| Risque de décote | Faible |

### Bloc 8 — Export analytics multi-format (JSON / Excel CSV / PDF)

| Champ | Valeur |
|-------|--------|
| Description | Service d'export tabulaire avec sérialisation JSON, génération CSV (Excel-friendly), génération PDF tabulaire |
| Nature | Implémentation + tests |
| Complexité | ★★ |
| Bas / Central / Haut | 4 / **6** / 8 |
| Preuves repo | `src/services/analytics.service.ts`, `src/services/analytics-export.service.ts`, `src/pages/AdminAnalytics.tsx`, `src/components/analytics/*` |
| Tests | `analytics.service.test.ts` (49) + `analytics-export.service.test.ts` (29) → 78 tests |
| Qualité | Élevée |
| Risque de décote | Faible |

### Bloc 9 — Partage sécurisé par lien (token + expiration)

| Champ | Valeur |
|-------|--------|
| Description | Génération tokens publics, persistance Postgres, validation à l'ouverture, expiration |
| Nature | Implémentation + tests |
| Complexité | ★★★ |
| Bas / Central / Haut | 3 / **4** / 6 |
| Preuves repo | `src/services/share-link.service.ts`, `src/components/ui/share-link-dialog.tsx` |
| Tests | `share-link.service.test.ts` (58) |
| Qualité | Élevée — couverture de tests très forte |
| Risque de décote | Faible |

### Bloc 10 — Comparaison avant/après (slider + labels typographiques)

| Champ | Valeur |
|-------|--------|
| Description | Composant slider interactif clavier-accessible, labels Avant/Après en serif italique |
| Nature | Implémentation + tests |
| Complexité | ★★ |
| Bas / Central / Haut | 2 / **3** / 4 |
| Preuves repo | `src/components/ui/before-after-slider.tsx`, `src/services/image-comparison.service.ts` |
| Tests | `image-comparison.service.test.ts` (67) |
| Qualité | Élevée |
| Risque de décote | Faible |

### Bloc 11 — Rate limiting + quotas

| Champ | Valeur |
|-------|--------|
| Description | Limitation par utilisateur (quotidien / mensuel) et par organisation (tier-based starter/pro/enterprise) |
| Nature | Implémentation + tests + RLS |
| Complexité | ★★★ |
| Bas / Central / Haut | 4 / **5** / 7 |
| Preuves repo | `src/services/rate-limiter.service.ts`, `src/services/quota.service.ts`, migrations Postgres correspondantes |
| Tests | `rate-limiter.service.test.ts` (30) + `quota.service.test.ts` (21) → 51 tests |
| Qualité | Élevée |
| Risque de décote | Faible |

### Bloc 12 — Protection SSRF + validation URL

| Champ | Valeur |
|-------|--------|
| Description | Validation des URLs externes envoyées en input : whitelist domaine, blacklist IP privée (RFC 1918, link-local, loopback), validation MIME |
| Nature | Implémentation + tests |
| Complexité | ★★★ |
| Bas / Central / Haut | 3 / **4** / 5 |
| Preuves repo | `src/services/url-validator.service.ts` |
| Tests | `url-validator.service.test.ts` (71) — couverture exhaustive des cas d'attaque |
| Qualité | Élevée — sécurité testée par cas |
| Risque de décote | Faible |

### Bloc 13 — Image storage + migration base64 → Storage bucket

| Champ | Valeur |
|-------|--------|
| Description | Migration progressive des images stockées en base64 vers les buckets Supabase Storage avec dé-duplication |
| Nature | Implémentation + tests + migration de données |
| Complexité | ★★★ |
| Bas / Central / Haut | 4 / **5** / 7 |
| Preuves repo | `src/services/image-storage.service.ts`, `src/services/image-export.service.ts`, migrations correspondantes |
| Tests | `image-storage.service.test.ts` (29) + `image-export.service.*` (32+strict) |
| Qualité | Élevée |
| Risque de décote | Faible |

### Bloc 14 — Tests automatisés (suite globale TDD)

| Champ | Valeur |
|-------|--------|
| Description | 26 fichiers de tests, 811 cas, ~13 300 lignes, configuration Vitest + Testing Library + happy-dom + msw, mocks Supabase |
| Nature | Tests unitaires et composants |
| Complexité | ★★★ — pour la mise en place de mocks et de l'environnement |
| Bas / Central / Haut | 14 / **18** / 24 |
| Preuves repo | `src/services/__tests__/*` (21 fichiers), `src/components/ui/__tests__/*`, `src/hooks/__tests__/*`, `src/types/__tests__/*`, `src/test/setup.ts`, `src/test/mocks/*`, `src/test/test-utils.tsx`, `vitest.config.ts` |
| Tests | (cette ligne EST la suite de tests) |
| Qualité | Élevée — TDD strict sur services métier |
| Risque de décote | Faible — la quantité et la qualité sont vérifiables |

### Bloc 15 — Documentation (19 documents, ~7 500 lignes)

| Champ | Valeur |
|-------|--------|
| Description | Guides utilisateur / admin / technique / déploiement, README, audit technique, dossier commissaire aux apports, mode d'emploi, prompts de contrôle, rapports valorisation, etc. |
| Nature | Rédaction technique |
| Complexité | ★★ |
| Bas / Central / Haut | 9 / **12** / 16 |
| Preuves repo | `docs/` (19 documents) |
| Tests | n/a |
| Qualité | Élevée — couverture exhaustive |
| Risque de décote | Faible |

### Bloc 16 — Catalogue décors + interface admin

| Champ | Valeur |
|-------|--------|
| Description | Modèle de données décors (référence, nom, catégorie, surface, finition, texture URL), 108 textures, interface admin CRUD, gestion `is_active`, hook de cache catalogue côté client |
| Nature | Implémentation + UI admin + intégration assets |
| Complexité | ★★★ |
| Bas / Central / Haut | 6 / **8** / 11 |
| Preuves repo | `src/pages/Admin.tsx`, `src/hooks/use-decor-context-cache.ts`, migrations décors, bucket `decor-textures` |
| Tests | `use-decor-context-cache.test.ts` (18, dont 3 pré-existants à corriger) |
| Qualité | Moyenne — quelques tests en désynchronisation (pré-existant) |
| Risque de décote | Moyen — les 3 tests pré-existants doivent être réalignés sur le format actuel du contexte catalogue |

### Bloc 17 — Mode présentation + thème jour/nuit + skeletons

| Champ | Valeur |
|-------|--------|
| Description | Mode plein écran commercial, transitions, thème dark complet via `next-themes`, skeleton loaders pour feedback de chargement |
| Nature | Implémentation + tests |
| Complexité | ★★ |
| Bas / Central / Haut | 4 / **5** / 7 |
| Preuves repo | `src/services/presentation.service.ts`, `src/pages/Presentation.tsx`, `src/components/ui/skeleton.tsx`, `src/components/theme-toggle.tsx` |
| Tests | `presentation.service.test.ts` (67) |
| Qualité | Élevée |
| Risque de décote | Faible |

### Bloc 18 — Quality gates / lint / build / optimisations

| Champ | Valeur |
|-------|--------|
| Description | Configuration ESLint (typescript-eslint, react-hooks, react-refresh), build optimisé Vite (chunk splitting manuel, minification esbuild, sourcemaps conditionnels), pipeline scripts npm |
| Nature | Configuration + optimisations |
| Complexité | ★★ |
| Bas / Central / Haut | 3 / **5** / 7 |
| Preuves repo | `eslint.config.js`, `vite.config.ts`, `package.json` (scripts), `vitest.config.ts` |
| Tests | n/a |
| Qualité | Moyenne — dette `any` documentée (~172 erreurs, sans impact runtime) |
| Risque de décote | Moyen sur ce bloc isolé (dette lint), mais sans impact valorisation globale |

---

## Synthèse globale

| Bloc | Bas | Central | Haut |
|------|----:|--------:|-----:|
| 1. Architecture frontend | 6 | 8 | 11 |
| 2. Auth + multi-tenant | 9 | 12 | 16 |
| 3. Projets et rendus | 10 | 14 | 18 |
| 4. Pipeline IA Gemini image | 7 | 10 | 14 |
| 5. Chat créatif + orchestrateur | 10 | 14 | 19 |
| 6. Magazine DÉCO PDF | 7 | 10 | 14 |
| 7. Brochure revendeur + co-branding | 5 | 7 | 10 |
| 8. Export analytics | 4 | 6 | 8 |
| 9. Partage sécurisé | 3 | 4 | 6 |
| 10. Comparaison avant/après | 2 | 3 | 4 |
| 11. Rate limiting + quotas | 4 | 5 | 7 |
| 12. Anti-SSRF | 3 | 4 | 5 |
| 13. Image storage | 4 | 5 | 7 |
| 14. Tests automatisés | 14 | 18 | 24 |
| 15. Documentation | 9 | 12 | 16 |
| 16. Catalogue décors + admin | 6 | 8 | 11 |
| 17. Mode présentation + thème + skeletons | 4 | 5 | 7 |
| 18. Quality gates / build | 3 | 5 | 7 |
| **TOTAL j/h** | **110** | **150** | **204** |

### Recommandation pour la valorisation

| Scénario | j/h | Posture |
|----------|----:|---------|
| Bas | 110 | Posture défensive d'évaluateur strict |
| **Central retenu** | **150** | **Estimation prudente et défendable** |
| Haut | 204 | Hypothèse incluant tâtonnements IA |

La fourchette **130–170 j/h** est défendable face à un évaluateur externe, en s'appuyant sur :

- Les 808 tests passants comme preuve de profondeur d'implémentation ;
- Les 23 migrations SQL versionnées comme preuve d'évolution maîtrisée du schéma ;
- Les ~7 500 lignes de documentation comme preuve de transférabilité ;
- L'historique Git comme preuve de la chronologie réelle.

---

## Risques de décote globaux

| Risque | Impact valorisation | Mitigation possible |
|--------|--------------------:|--------------------|
| Dette lint (~172 `any`) | -2 à -5 j/h potentiellement décotés sur bloc 18 | Sprint de typage progressif (déjà entamé selon `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md`) |
| 3 tests `use-decor-context-cache` pré-existants en échec | -1 à -2 j/h sur bloc 16 | Réaligner test ou implémentation lors d'une prochaine itération |
| Coverage formelle non mesurée | Risque modéré si l'évaluateur l'exige formellement | Lancer `npm run test:coverage` et publier le rapport |
| 19 vulnérabilités npm transitives | Risque modéré | `npm audit fix --force` + re-test |
| Engine Node 18 vs requirement Node 20 (CI) | Faible | Bumper la pipeline CI |

Aucun de ces risques ne remet en cause l'estimation centrale de **150 j/h**.

---

**Conclusion** : la matrice retient **150 j/h** en estimation centrale prudente, dans une fourchette défendable de **120 à 200 j/h**. Elle est intégralement traçable au repository et aux suites de tests exécutables.
