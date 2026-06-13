# Documentation DICA Decorator — Index

| Champ | Valeur |
|---|---|
| Projet | `dica-decorator` |
| Version courante | `2.2.0` |
| Date de dernière revue documentaire | 2026-05-31 |
| Rapport de revue | [`audit/documentation_cleanup_report_2026-05-31.md`](./audit/documentation_cleanup_report_2026-05-31.md) |

> **Règle d'or :** la documentation active dans `docs/` (et ses sous-dossiers
> `audit/`, `commissaire_aux_apports/`) est **prioritaire** sur les documents
> archivés (`docs/archive/`). Aucun document archivé ne doit être utilisé comme
> référence opérationnelle courante.

---

## 1. Pour démarrer

| Si vous êtes… | Lisez en priorité |
|---|---|
| Nouvel arrivant développeur | [`GUIDE_DEVELOPPEUR.md`](./GUIDE_DEVELOPPEUR.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`HANDOVER_DEVELOPPEUR.md`](./HANDOVER_DEVELOPPEUR.md). |
| Utilisateur final | [`MANUEL_UTILISATEUR.md`](./MANUEL_UTILISATEUR.md), [`MODE_EMPLOI.md`](./MODE_EMPLOI.md). |
| Administrateur | [`GUIDE_ADMINISTRATEUR.md`](./GUIDE_ADMINISTRATEUR.md). |
| Ops / déploiement | [`DEPLOIEMENT.md`](./DEPLOIEMENT.md), [`CHECKLIST_SMOKE_KILLSWITCH.md`](./CHECKLIST_SMOKE_KILLSWITCH.md). |
| Sécurité | [`audit/PROJECT_DOCUMENTATION_STANDARD.md`](./audit/PROJECT_DOCUMENTATION_STANDARD.md) § 7, [`MIGRATIONS_DIFFEREES_DEPENDANCES.md`](./MIGRATIONS_DIFFEREES_DEPENDANCES.md). |
| Auditeur / cabinet | [`audit/PROJECT_DOCUMENTATION_STANDARD.md`](./audit/PROJECT_DOCUMENTATION_STANDARD.md) et [`audit/PROJECT_AUDIT_NOTES.md`](./audit/PROJECT_AUDIT_NOTES.md). |
| Commissaire aux apports | [`commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md`](./commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md). |

---

## 2. Documentation technique active

| Document | Objet | Date d'origine | Note de fraîcheur |
|---|---|---|---|
| [`DOCUMENTATION_TECHNIQUE.md`](./DOCUMENTATION_TECHNIQUE.md) | Stack, architecture, services TDD, Edge Functions, sécurité, perf | 2025-11-30 | Revue 2026-05-31 |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Endpoints Supabase + Edge Functions historiques | 2025-11-30 | Revue 2026-05-31 |
| [`DICA_ORCHESTRATOR_GUIDE.md`](./DICA_ORCHESTRATOR_GUIDE.md) | Orchestrateur AI Gemini | 2026-05 | Actif |
| [`HANDOVER_DEVELOPPEUR.md`](./HANDOVER_DEVELOPPEUR.md) | Handover technique structuré | 2026-05-06 | Actif |
| [`AUDIT_DEPENDANCES.md`](./AUDIT_DEPENDANCES.md) | Suivi des dépendances tierces (incluant retraits) | 2026-05-06 | Actif |
| [`MIGRATIONS_DIFFEREES_DEPENDANCES.md`](./MIGRATIONS_DIFFEREES_DEPENDANCES.md) | Vulnérabilités npm en migration différée | 2026-05-06 | Actif |
| [`AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md`](./AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md) | Audit ciblé bureau diagnostique | 2026-05-07 | Actif |
| [`CHECKLIST_SMOKE_KILLSWITCH.md`](./CHECKLIST_SMOKE_KILLSWITCH.md) | Checklist smoke + killswitch production | 2026-05-06 | Actif |
| [`MODE_EMPLOI.md`](./MODE_EMPLOI.md) | Mode opératoire condensé | 2026-05-06 | Actif |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture canonique (3 tiers, IA, sécurité) | 2026-06 | Actif |
| [`API_EDGE_FUNCTIONS.md`](./API_EDGE_FUNCTIONS.md) | Référence Edge Functions (code source) | 2026-06 | Actif |
| [`GUIDE_DEVELOPPEUR.md`](./GUIDE_DEVELOPPEUR.md) | Guide développeur canonique | 2026-06 | Actif |

---

## 3. Documentation utilisateurs et exploitation

| Document | Objet | Note de fraîcheur |
|---|---|---|
| [`GUIDE_UTILISATEUR.md`](./GUIDE_UTILISATEUR.md) | Parcours utilisateur final | Revue 2026-05-31 |
| [`GUIDE_ADMINISTRATEUR.md`](./GUIDE_ADMINISTRATEUR.md) | Administration (décors, organisations, utilisateurs, quotas) | Revue 2026-05-31 |
| [`GUIDE_DEPLOIEMENT.md`](./GUIDE_DEPLOIEMENT.md) | Installation locale + mise en production | Revue 2026-05-31 |
| [`MANUEL_UTILISATEUR.md`](./MANUEL_UTILISATEUR.md) | Manuel utilisateur canonique (écrans) | Actif (2026-06) |
| [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) | Déploiement canonique | Actif (2026-06) |

---

## 4. Qualité, valorisation, audit interne

> Documents internes de pilotage et de valorisation. Non destinés à un usage
> marketing ; à manipuler avec discernement.

| Document | Objet |
|---|---|
| [`RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`](./RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md) | Rapport qualité courant (tests, lint, build, sécurité). |
| [`RAPPORT_VALORISATION_TECHNIQUE.md`](./RAPPORT_VALORISATION_TECHNIQUE.md) | Rapport interne de valorisation technique du repo. |
| [`VALORISATION_TECHNIQUE_DICA_DECOR.md`](./VALORISATION_TECHNIQUE_DICA_DECOR.md) | Synthèse interne valorisation. |
| [`MATRICE_HEURES_QUALITE_DICA_DECOR.md`](./MATRICE_HEURES_QUALITE_DICA_DECOR.md) | Matrice heures × qualité. |
| [`PLAN_CORRECTION_RISQUES_DECOTE.md`](./PLAN_CORRECTION_RISQUES_DECOTE.md) | Plan de correction des risques de décote. |
| [`RAPPORT_EXECUTION_PLAN_CORRECTION.md`](./RAPPORT_EXECUTION_PLAN_CORRECTION.md) | Suivi d'exécution du plan de correction. |
| [`DOSSIER_COMMISSAIRE_AUX_APPORTS.md`](./DOSSIER_COMMISSAIRE_AUX_APPORTS.md) | Dossier interne pour commissaire aux apports (synthèse). |

---

## 5. Audit cabinet (`audit/`)

Documentation produite pour un cabinet d'audit / due diligence externe.

| Document | Objet |
|---|---|
| [`audit/PROJECT_DOCUMENTATION_STANDARD.md`](./audit/PROJECT_DOCUMENTATION_STANDARD.md) | Documentation projet standardisée (architecture, modules propriétaires, dépendances, sécurité, qualité, maturité, valorisable). |
| [`audit/PROJECT_AUDIT_NOTES.md`](./audit/PROJECT_AUDIT_NOTES.md) | Notes méthodologiques (commandes, métriques, sources). |
| [`audit/documentation_cleanup_report_2026-05-31.md`](./audit/documentation_cleanup_report_2026-05-31.md) | Rapport de la présente mission de nettoyage documentaire. |

---

## 6. Documentation pour commissaire aux apports (`commissaire_aux_apports/`)

| Document | Objet |
|---|---|
| [`commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md`](./commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md) | Document destiné au commissaire aux apports (identité, fonctionnalités, architecture, propriété intellectuelle, licence). |
| [`commissaire_aux_apports/CONTROLE_DOCUMENTATION_PROJET.md`](./commissaire_aux_apports/CONTROLE_DOCUMENTATION_PROJET.md) | Rapport de contrôle interne (vérifications, sources, points externes à confirmer). |
| [`commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md`](./commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md) | Note interne sur la licence commerciale et droits d'exploitation (à valider juridiquement). |

---

## 7. Archives (`archive/`) — ne pas utiliser comme référence active

### 7.1 Obsolètes (`archive/obsolete/`)

Documents qui contredisent l'état actuel du code (services supprimés, version
incompatible).

| Document archivé | Raison |
|---|---|
| [`archive/obsolete/PLAQUETTE_PDF_COBRANDING.md`](./archive/obsolete/PLAQUETTE_PDF_COBRANDING.md) | Décrit `plaquette-pdf.service.ts` (`PlaquettePdfService`) supprimé du code. |
| [`archive/obsolete/PROMPT_CONTROLE_PLAQUETTE.md`](./archive/obsolete/PROMPT_CONTROLE_PLAQUETTE.md) | Prompt de contrôle ciblant le service ci-dessus. |
| [`archive/obsolete/API_SERVICES.md`](./archive/obsolete/API_SERVICES.md) | Décrit `PDFExportService` qui n'existe pas dans le code actuel ; v2.0.0. |
| [`archive/obsolete/README_v2.0.0_2025-12.md`](./archive/obsolete/README_v2.0.0_2025-12.md) | Index documentaire v2.0.0 (décembre 2025), incomplet. |

### 7.2 Historiques (`archive/historical/`)

Documents anciens utiles pour la traçabilité, l'audit et la valorisation. Ne pas
opposer à un état présent.

| Document archivé | Usage |
|---|---|
| [`archive/historical/AUDIT_TECHNIQUE_2025-12.md`](./archive/historical/AUDIT_TECHNIQUE_2025-12.md) | Snapshot d'audit du 17 décembre 2025 (commit `47f5aa8`, 784 tests / 25 suites). |
| [`archive/historical/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md`](./archive/historical/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md) | Plan correctif TDD exécuté (décembre 2025). |
| [`archive/historical/BROCHURE_COMMERCIALE_GAMMA.md`](./archive/historical/BROCHURE_COMMERCIALE_GAMMA.md) | Support de présentation commerciale (Gamma.app). |
| [`archive/historical/DICA_FRANCE_RESUME_2025-12.md`](./archive/historical/DICA_FRANCE_RESUME_2025-12.md) | Résumé exécutif v2.0.0 (décembre 2025). |
| [`archive/historical/PROMPT_CONTROLE_ONBOARDING.md`](./archive/historical/PROMPT_CONTROLE_ONBOARDING.md) | Checklist d'onboarding ponctuelle (décembre 2025). |

Chaque document archivé porte en tête un encadré `⚠️ DOCUMENT ARCHIVÉ` indiquant
son statut, sa date d'archivage, la raison et le document de remplacement.

---

## 8. Règles de maintenance documentaire

Pour éviter que la documentation redevienne obsolète :

1. **Toute nouvelle documentation est créée dans `docs/`** (ou un sous-dossier
   dédié si elle relève d'audit, de commissaire aux apports, etc.). Elle est
   référencée dans le présent index.
2. **Tout document devenu obsolète est archivé**, pas supprimé : déplacer dans
   `docs/archive/obsolete/` ou `docs/archive/historical/`, ajouter un encadré
   `⚠️ DOCUMENT ARCHIVÉ` en tête, mettre à jour le présent index et le
   `README.md` racine.
3. **Toute référence à un module supprimé doit être marquée comme telle** (par
   exemple : `*(archivé YYYY-MM-DD, service remplacé par X)*`).
4. **Les chiffres opérationnels** (nombre de tests, nombre de suites,
   vulnérabilités, etc.) sont datés et reproductibles via les commandes `npm run
   lint` / `npm run test:run` / `npm audit`. Ne pas mettre de chiffres non
   sourcés.
5. **La distinction documentation technique / commerciale / audit / historique
   est stricte.** Les supports commerciaux n'ont pas vocation à être opposables
   comme référence technique.
6. **Le `README.md` racine et le présent `docs/README.md` sont les deux uniques
   points d'entrée fiables.** Toute autre porte d'entrée informelle doit y
   renvoyer.

---

© DICA France — base logicielle développée par KOREV AI.
