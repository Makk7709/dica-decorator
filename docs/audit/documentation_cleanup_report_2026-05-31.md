# Rapport de nettoyage documentaire — DICA Decorator

| Champ | Valeur |
|---|---|
| Mission | Audit documentaire, archivage des documents obsolètes et mise à jour du README principal |
| Repository | `dica-decorator` |
| Version courante | `2.2.0` (cf. `package.json`) |
| Date d'exécution | 2026-05-31 |
| Périmètre | Documentation uniquement (aucune modification de code métier, de tests, ou de configuration runtime) |
| Persona | Documentaliste-archiviste technique senior |

---

## 1. Résumé exécutif

L'audit documentaire du repository a été conduit en sept étapes (cartographie → classification → archivage → nettoyage des contradictions → mise à jour des actifs → mise à jour des README → rapport).

L'état initial de la documentation présentait un risque modéré d'induire un nouvel arrivant ou un auditeur en erreur :

- coexistence de documents techniques de novembre / décembre 2025 (version 2.0.0) et de documents récents de mai 2026 (version 2.2.0), sans démarcation explicite ;
- présence de documents décrivant des services qui ont été retirés du code (`PlaquettePdfService`, `PDFExportService`) ;
- chiffres de qualité périmés (784 tests / 25 suites) cités comme actuels alors que le projet est désormais à 825 tests / 27 suites ;
- index documentaire (`docs/README.md`) en version 2.0.0 (décembre 2025), pointant vers un sous-ensemble incomplet de la documentation ;
- supports commerciaux (brochure Gamma) et notes de présentation à risque d'être confondus avec des référentiels techniques.

À l'issue de la mission, ces risques ont été traités par archivage et signalisation explicite. La documentation active reflète désormais l'état réel du repository, et un nouvel arrivant ou un auditeur disposera d'une porte d'entrée fiable (`README.md` racine + `docs/README.md`).

**Verdict final : documentation saine.** Quelques zones d'incertitude résiduelles sont listées en § 9 et § 10 ; aucune n'est de nature à compromettre l'auditabilité.

---

## 2. Méthodologie

### 2.1 Étapes

1. Cartographie complète des fichiers de documentation (`*.md`, `*.txt`, README, dossiers `docs/`, `audit/`, `.github/`).
2. Classification de chaque document selon une grille à six statuts : `ACTIF`, `À METTRE À JOUR`, `OBSOLÈTE`, `HISTORIQUE À CONSERVER`, `DOUBLON`, `À RISQUE`.
3. Création de l'arborescence d'archive (`docs/archive/obsolete/`, `docs/archive/historical/`).
4. Déplacement des documents avec ajout d'un encadré `⚠️ DOCUMENT ARCHIVÉ` standardisé en tête.
5. Nettoyage des références cassées dans les documents actifs, ajout d'encadrés de fraîcheur sur les documents anciens conservés actifs.
6. Réécriture du `README.md` racine et du `docs/README.md` (index documentaire).
7. Rédaction du présent rapport.

### 2.2 Sources de vérification utilisées

- `package.json` (version, licence, scripts, engines).
- `src/services/` (liste réelle des services présents au 2026-05-31).
- `supabase/functions/` (liste des Edge Functions).
- `.github/workflows/` (CI/CD).
- `audit/final/` et `audit/phase-*/` (artefacts d'audit reproductibles).
- Recherches `rg` ciblées (services, versions, chiffres de tests).

### 2.3 Contraintes respectées

- Aucun document utile à la traçabilité ou à la valorisation n'a été supprimé ; tous les déplacements sont réversibles via Git.
- Aucune modification de code métier (`src/`, `supabase/functions/`) n'a été effectuée.
- Aucune modification de tests (`src/**/__tests__/`).
- Aucune réécriture de doctrine technique sans preuve dans le code, les tests ou la documentation validée.
- Les documents commerciaux datés ont été archivés en `historical/` mais conservés (traçabilité de la communication produit).

---

## 3. Cartographie initiale (avant nettoyage)

Total de **34** entités documentaires identifiées (33 fichiers Markdown + 1 fichier de pollution `.DS_Store` supprimé) :

| Famille documentaire | Nombre | Localisation initiale |
|---|---|---|
| README racine | 1 | `README.md` |
| Index documentaire | 1 | `docs/README.md` |
| Documentation technique générale | 6 | `docs/DOCUMENTATION_TECHNIQUE.md`, `docs/API_REFERENCE.md`, `docs/API_SERVICES.md`, `docs/DICA_ORCHESTRATOR_GUIDE.md`, `docs/HANDOVER_DEVELOPPEUR.md`, `docs/AUDIT_DEPENDANCES.md` |
| Guides utilisateurs et exploitation | 4 | `docs/GUIDE_UTILISATEUR.md`, `docs/GUIDE_ADMINISTRATEUR.md`, `docs/GUIDE_DEPLOIEMENT.md`, `docs/MODE_EMPLOI.md` |
| Audit, qualité, sécurité | 6 | `docs/AUDIT_TECHNIQUE.md`, `docs/AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md`, `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`, `docs/CHECKLIST_SMOKE_KILLSWITCH.md`, `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`, `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` |
| Valorisation, commissaire aux apports | 4 | `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md`, `docs/RAPPORT_VALORISATION_TECHNIQUE.md`, `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md`, `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` |
| Plans correctifs et exécution | 2 | `docs/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md`, `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md` |
| Spécifications produit | 1 | `docs/PLAQUETTE_PDF_COBRANDING.md` |
| Prompts de contrôle et onboarding | 2 | `docs/PROMPT_CONTROLE_PLAQUETTE.md`, `docs/PROMPT_CONTROLE_ONBOARDING.md` |
| Communication commerciale | 2 | `docs/BROCHURE_COMMERCIALE_GAMMA.md`, `docs/DICA_FRANCE_RESUME.md` |
| Documentation cabinet d'audit | 2 | `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md`, `docs/audit/PROJECT_AUDIT_NOTES.md` |
| Documentation commissaire aux apports | 3 | `docs/commissaire_aux_apports/*` |
| CI/CD documentation | 1 | `.github/workflows/README.md` |

---

## 4. Classification

### 4.1 ACTIFS — 22 documents

Documentation alignée avec le produit actuel et conservée comme référence opérationnelle.

| Document | Type | Note |
|---|---|---|
| `README.md` (racine) | Porte d'entrée | **Réécrit** lors de la présente mission. |
| `docs/README.md` | Index documentaire | **Réécrit** ; l'ancien (v2.0.0 décembre 2025) a été archivé. |
| `docs/DOCUMENTATION_TECHNIQUE.md` | Technique | Note de fraîcheur 2026-05-31 ajoutée. |
| `docs/API_REFERENCE.md` | Technique | Note de fraîcheur 2026-05-31 ajoutée. |
| `docs/DICA_ORCHESTRATOR_GUIDE.md` | Technique | Récent (mai 2026), conservé tel quel. |
| `docs/HANDOVER_DEVELOPPEUR.md` | Technique | 2 chemins de docs archivés corrigés. |
| `docs/AUDIT_DEPENDANCES.md` | Sécurité / qualité | Conservé tel quel (mai 2026). |
| `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md` | Sécurité / qualité | Conservé tel quel. |
| `docs/AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md` | Audit | Conservé tel quel. |
| `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | Qualité | 1 chemin de doc archivé corrigé. |
| `docs/CHECKLIST_SMOKE_KILLSWITCH.md` | Ops | Conservé tel quel. |
| `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` | Suivi | 1 chemin de doc archivé corrigé. |
| `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md` | Suivi | Conservé tel quel. |
| `docs/RAPPORT_VALORISATION_TECHNIQUE.md` | Valorisation | Conservé tel quel. |
| `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` | Valorisation | 5 chemins de docs archivés corrigés. |
| `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` | Valorisation | 2 chemins de docs archivés corrigés. |
| `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` | Valorisation interne | Conservé tel quel. |
| `docs/MODE_EMPLOI.md` | Utilisateur | Conservé tel quel. |
| `docs/GUIDE_UTILISATEUR.md` | Utilisateur | Note de fraîcheur 2026-05-31 ajoutée. |
| `docs/GUIDE_ADMINISTRATEUR.md` | Admin | Note de fraîcheur 2026-05-31 ajoutée. |
| `docs/GUIDE_DEPLOIEMENT.md` | Ops | Note de fraîcheur 2026-05-31 ajoutée. |
| `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` | Audit cabinet | Conservé tel quel. |
| `docs/audit/PROJECT_AUDIT_NOTES.md` | Audit cabinet | Conservé tel quel. |
| `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` | Commissaire aux apports | 2 chemins de docs archivés corrigés. |
| `docs/commissaire_aux_apports/CONTROLE_DOCUMENTATION_PROJET.md` | Commissaire aux apports | Conservé tel quel. |
| `docs/commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md` | Commissaire aux apports | Conservé tel quel. |
| `.github/workflows/README.md` | CI/CD | Conservé tel quel (factuel et à jour). |

(Le total inclut les deux nouveaux documents créés par la mission : ce rapport et l'index documentaire réécrit.)

### 4.2 OBSOLÈTES — 4 documents (déplacés vers `docs/archive/obsolete/`)

| Document | Raison de l'obsolescence |
|---|---|
| `docs/PLAQUETTE_PDF_COBRANDING.md` | Décrit `plaquette-pdf.service.ts` et la classe `PlaquettePdfService` qui ne sont plus présents dans `src/services/`. Le système PDF actuel repose sur `magazine-deco-pdf.service.ts` et `reseller-brochure-pdf.service.ts`. |
| `docs/PROMPT_CONTROLE_PLAQUETTE.md` | Prompt de contrôle ciblant le service `PlaquettePdfService` supprimé. |
| `docs/API_SERVICES.md` | Décrit `PDFExportService` qui n'existe pas dans le code ; en-tête « Version 2.0.0 ». |
| `docs/README.md` (ancien) | Index documentaire en version 2.0.0 (décembre 2025), incomplet par rapport à la documentation produite depuis (rapports qualité, valorisation, audit cabinet, commissaire aux apports). Renommé `README_v2.0.0_2025-12.md`. |

### 4.3 HISTORIQUES À CONSERVER — 5 documents (déplacés vers `docs/archive/historical/`)

| Document | Raison de l'archivage en historique |
|---|---|
| `docs/AUDIT_TECHNIQUE.md` | Snapshot d'audit du 17 décembre 2025 (commit `47f5aa8`, 784 tests / 25 suites). Renommé `AUDIT_TECHNIQUE_2025-12.md`. Utile pour la trajectoire qualité (corrections TypeScript appliquées, durcissement sécurité). |
| `docs/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` | Plan correctif TDD daté de décembre 2025, dont toutes les cases sont marquées « OK » dans le document lui-même (plan exécuté). Conservé pour preuve d'application de la démarche TDD. |
| `docs/BROCHURE_COMMERCIALE_GAMMA.md` | Support de présentation commerciale (slides Gamma.app, décembre 2025). Document commercial, non technique. Conservé pour mémoire. |
| `docs/DICA_FRANCE_RESUME.md` | Résumé exécutif daté décembre 2025, version 2.0.0. Renommé `DICA_FRANCE_RESUME_2025-12.md`. Conservé pour la traçabilité de la communication exécutive. |
| `docs/PROMPT_CONTROLE_ONBOARDING.md` | Checklist d'onboarding ponctuelle (décembre 2025). Pas de référentiel opérationnel courant ; conservée pour exemple méthodologique. |

### 4.4 À METTRE À JOUR — 0 (cf. § 4.1)

Tous les documents qui auraient relevé de cette catégorie ont été soit déplacés (cas 4.2 / 4.3), soit annotés d'une note de fraîcheur (cas 4.1). Aucun document n'a été laissé en l'état avec une mention « à mettre à jour » non traitée.

### 4.5 DOUBLONS — 0

Aucun doublon strict identifié. Une **zone de chevauchement** existe entre `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` (synthèse interne, mai 2026) et `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` (document destiné au commissaire externe, mai 2026), mais leur usage est distinct (interne vs externe). Voir § 10 — points à confirmer.

### 4.6 À RISQUE — 0 résiduel

Tous les documents qui présentaient un risque d'induire en erreur ont été soit archivés (4.2 / 4.3), soit ont reçu une note de fraîcheur (4.1) qui en clarifie le statut.

---

## 5. Documents déplacés — table de correspondance

| Ancien chemin | Nouveau chemin | Encadré ajouté |
|---|---|---|
| `docs/API_SERVICES.md` | `docs/archive/obsolete/API_SERVICES.md` | Oui (Obsolète) |
| `docs/PLAQUETTE_PDF_COBRANDING.md` | `docs/archive/obsolete/PLAQUETTE_PDF_COBRANDING.md` | Oui (Obsolète) |
| `docs/PROMPT_CONTROLE_PLAQUETTE.md` | `docs/archive/obsolete/PROMPT_CONTROLE_PLAQUETTE.md` | Oui (Obsolète) |
| `docs/README.md` | `docs/archive/obsolete/README_v2.0.0_2025-12.md` | Oui (Obsolète, renommé) |
| `docs/AUDIT_TECHNIQUE.md` | `docs/archive/historical/AUDIT_TECHNIQUE_2025-12.md` | Oui (Historique, renommé) |
| `docs/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` | `docs/archive/historical/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` | Oui (Historique) |
| `docs/PROMPT_CONTROLE_ONBOARDING.md` | `docs/archive/historical/PROMPT_CONTROLE_ONBOARDING.md` | Oui (Historique) |
| `docs/BROCHURE_COMMERCIALE_GAMMA.md` | `docs/archive/historical/BROCHURE_COMMERCIALE_GAMMA.md` | Oui (Historique) |
| `docs/DICA_FRANCE_RESUME.md` | `docs/archive/historical/DICA_FRANCE_RESUME_2025-12.md` | Oui (Historique, renommé) |

**Total : 9 documents déplacés** (4 obsolètes + 5 historiques).

Le fichier `docs/.DS_Store` (pollution macOS, non documentaire) a été supprimé.

---

## 6. Documents mis à jour (sans déplacement)

| Document | Nature de la modification |
|---|---|
| `README.md` (racine) | Réécriture complète : version, scripts, modules actifs, modules legacy/archivés, références à la documentation d'audit cabinet et commissaire aux apports, énoncé de licence, règles de maintenance. |
| `docs/README.md` | Réécriture complète : nouvel index documentaire (actif + archive), tableaux par usage. |
| `docs/DOCUMENTATION_TECHNIQUE.md` | Encadré « Note de fraîcheur (revue 2026-05-31) » ajouté. |
| `docs/API_REFERENCE.md` | Encadré « Note de fraîcheur (revue 2026-05-31) » ajouté + renvoi explicite vers `supabase/functions/` et `DICA_ORCHESTRATOR_GUIDE.md`. |
| `docs/GUIDE_UTILISATEUR.md` | Encadré « Note de fraîcheur (revue 2026-05-31) » ajouté. |
| `docs/GUIDE_ADMINISTRATEUR.md` | Encadré « Note de fraîcheur (revue 2026-05-31) » ajouté + renvoi explicite vers `supabase/migrations/`. |
| `docs/GUIDE_DEPLOIEMENT.md` | Encadré « Note de fraîcheur (revue 2026-05-31) » ajouté + renvoi vers `.github/workflows/README.md` et `CHECKLIST_SMOKE_KILLSWITCH.md`. |
| `docs/HANDOVER_DEVELOPPEUR.md` | Deux références cassées corrigées (`API_SERVICES.md` → `archive/obsolete/`, `AUDIT_TECHNIQUE.md` → `archive/historical/` + `RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`). |
| `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` | Une référence cassée corrigée (`AUDIT_TECHNIQUE.md` → `archive/historical/`). |
| `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` | Une référence cassée corrigée (`AUDIT_TECHNIQUE.md` → `archive/historical/`). |
| `docs/MATRICE_HEURES_QUALITE_DICA_DECOR.md` | Deux références cassées corrigées (`PLAQUETTE_PDF_COBRANDING.md` et `AUDIT_TECHNIQUE.md` → `archive/`). |
| `docs/VALORISATION_TECHNIQUE_DICA_DECOR.md` | Cinq références cassées corrigées (`API_SERVICES.md`, `DICA_FRANCE_RESUME.md`, `AUDIT_TECHNIQUE.md`, `BROCHURE_COMMERCIALE_GAMMA.md`, `PLAQUETTE_PDF_COBRANDING.md`, `PLAN_CORRECTIF_PLAQUETTE_REVENDEUR.md` → `archive/`). |
| `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` | Deux références cassées corrigées (`API_SERVICES.md` → `archive/obsolete/`, `AUDIT_TECHNIQUE.md` → `archive/historical/`). |

**Total : 13 documents mis à jour** (dont 2 réécritures complètes : `README.md` racine et `docs/README.md`).

---

## 7. Documents créés

| Document | Objet |
|---|---|
| `docs/audit/documentation_cleanup_report_2026-05-31.md` | Le présent rapport. |

---

## 8. Contradictions détectées et résolution

| Contradiction | Détectée dans | Résolution |
|---|---|---|
| Service `plaquette-pdf.service.ts` / classe `PlaquettePdfService` documentés comme actifs ; **absents du code source**. | `docs/PLAQUETTE_PDF_COBRANDING.md`, `docs/PROMPT_CONTROLE_PLAQUETTE.md`. | Documents déplacés en `docs/archive/obsolete/`. Encadré d'archivage indiquant les services de remplacement (`magazine-deco-pdf.service.ts`, `reseller-brochure-pdf.service.ts`). |
| `PDFExportService` documenté ; **n'existe pas dans le code**. | `docs/API_SERVICES.md`. | Document déplacé en `docs/archive/obsolete/`. |
| Version produit « 2.0.0 » citée comme courante ; **package.json en 2.2.0**. | `docs/README.md` (ancien), `docs/DICA_FRANCE_RESUME.md`, `docs/API_SERVICES.md`. | Documents archivés (renommés avec suffixe daté `_2025-12.md`). |
| Chiffre « 784 tests / 25 suites » présenté comme courant ; **état actuel : 825 tests / 27 suites**. | `docs/AUDIT_TECHNIQUE.md`. | Document archivé en `historical/` ; encadré renvoyant vers `RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md` (rapport courant). Le chiffre 825 / 27 est maintenu dans `README.md` racine et lié aux artefacts `audit/final/`. |
| `README.md` racine annonçait « 663 tests passed » et listait `plaquette-pdf.service.test.ts (138 tests)` ; **incohérent avec l'état actuel**. | `README.md` racine. | README racine entièrement réécrit ; chiffres alignés avec l'état observé et liens vers les artefacts reproductibles. |
| `README.md` racine déclarait « DICA Decorator v2.1.0 » en pied tout en évoquant la version 2.2.0 plus haut ; **incohérent**. | `README.md` racine. | Réécrit ; mention unique de la version `2.2.0` (source : `package.json`). |
| `README.md` racine exigeait « Node.js 18+, npm 8+ » ; **`package.json#engines` exige Node ≥ 20 et npm ≥ 10**. | `README.md` racine. | Corrigé. |
| `README.md` racine annonçait « Réduction des coûts de prototypage de 80 % » sans source. | `README.md` racine. | Métrique non sourcée retirée ; le README factualise désormais le périmètre fonctionnel sans chiffre marketing. |
| Plugin Vite de tagging cité comme dépendance dans certains documents ; **retiré du runtime et des devDependencies**. | Cohérence vérifiée : pas de référence active dans la documentation post-cleanup. | Statut clarifié dans `README.md` racine § 3 et déjà documenté dans `docs/AUDIT_DEPENDANCES.md`. |

Aucune contradiction majeure résiduelle au 2026-05-31.

---

## 9. Risques documentaires résiduels

| # | Risque | Niveau | Mitigation |
|---|---|---|---|
| R1 | Les guides utilisateur / administrateur / déploiement (novembre 2025) peuvent contenir des écrans ou des flux légèrement décalés par rapport à l'UI 2026. | Faible | Note de fraîcheur 2026-05-31 ajoutée précisant que l'UI prévaut en cas de divergence. À recroiser lors d'une revue UX dédiée. |
| R2 | Le snapshot `archive/historical/AUDIT_TECHNIQUE_2025-12.md` reste consultable et porte des chiffres anciens (784 tests). | Faible | Encadré d'archivage en tête de document ; renvoi explicite vers le rapport qualité courant. |
| R3 | Les documents de valorisation (`RAPPORT_VALORISATION_TECHNIQUE.md`, `VALORISATION_TECHNIQUE_DICA_DECOR.md`, `MATRICE_HEURES_QUALITE_DICA_DECOR.md`) reposent sur des estimations en jours-homme ; aucune validation comptable externe n'a été effectuée. | Faible (déjà signalé dans les documents) | Documents internes ; non opposables hors due diligence accompagnée d'un commissaire aux apports. |
| R4 | La note `commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md` est explicitement étiquetée « à valider juridiquement » — elle ne constitue pas un avis juridique. | Moyen | Risque déjà signalé dans le document. À faire valider par un conseil avant utilisation contractuelle. |
| R5 | Le repository ne contient pas de dossier `docs/adr/` (Architecture Decision Records) au sens strict. Les décisions d'architecture sont diffusées dans plusieurs documents (DICA_ORCHESTRATOR_GUIDE, DOCUMENTATION_TECHNIQUE, PROJECT_DOCUMENTATION_STANDARD). | Faible | Non bloquant ; à considérer pour une mission ultérieure si le besoin se précise (cf. § 12 Recommandations). |
| R6 | Le sous-dossier `audit/` (artefacts CI : `npm-audit.txt`, `lint.txt`, `test.txt`, etc.) est versionné et contient des sorties horodatées de phases différentes (`phase-0`, `phase-3`, `phase-minus-1`, `final`). Aucune cartographie de cet inventaire n'existe au 2026-05-31. | Faible | Hors périmètre de la présente mission (artefacts, non documentation au sens éditorial). À documenter si les artefacts deviennent une référence d'audit externe. |

---

## 10. Documents encore à confirmer

| Point | Document concerné | Action recommandée |
|---|---|---|
| Chevauchement entre la synthèse interne et le document destiné au commissaire externe. | `docs/DOSSIER_COMMISSAIRE_AUX_APPORTS.md` (interne) vs `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` (externe). | Confirmer que les deux documents ont des audiences distinctes (interne = pilotage ; externe = livrable). Si oui, ajouter un renvoi explicite l'un vers l'autre. Si non, fusionner dans un futur tour. |
| Validité opérationnelle des écrans cités dans les guides utilisateurs (nov 2025). | `GUIDE_UTILISATEUR.md`, `GUIDE_ADMINISTRATEUR.md`, `GUIDE_DEPLOIEMENT.md`. | Revue UX dédiée à programmer (hors mission documentaire). |
| Position juridique sur la cession / licence d'exploitation. | `commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md`. | Validation par un conseil juridique avant tout usage contractuel. |
| Inventaire des artefacts d'audit sous `audit/`. | `audit/final/`, `audit/phase-*/`. | Décider si ces artefacts doivent rester versionnés ou être déplacés vers un stockage CI. Hors périmètre documentaire. |

---

## 11. Vérifications automatisées effectuées

Les commandes ci-dessous ont été exécutées pour valider l'absence de contradiction résiduelle :

| Vérification | Commande équivalente | Résultat |
|---|---|---|
| Aucune référence cassée vers les fichiers archivés (hors `docs/archive/` lui-même et `README.md` racine réécrit) | `rg "docs/AUDIT_TECHNIQUE\.md\|docs/PLAQUETTE_PDF_COBRANDING\.md\|docs/PROMPT_CONTROLE_PLAQUETTE\.md\|docs/PROMPT_CONTROLE_ONBOARDING\.md\|docs/API_SERVICES\.md\|docs/BROCHURE_COMMERCIALE_GAMMA\.md\|docs/DICA_FRANCE_RESUME\.md\|docs/PLAN_CORRECTIF_PLAQUETTE_REVENDEUR\.md" docs/` | Aucune référence non requalifiée trouvée hors `docs/archive/`. |
| Aucun document actif (hors archive) ne mentionne `PlaquettePdfService` ou `PDFExportService` comme courant | `rg "PlaquettePdfService\|PDFExportService" docs/ --glob '!docs/archive/**'` | Une seule occurrence subsiste dans `VALORISATION_TECHNIQUE_DICA_DECOR.md`, marquée « (legacy) » et liée à un bloc historique. |
| Tous les documents archivés portent un encadré `⚠️ DOCUMENT ARCHIVÉ` en tête | `rg "DOCUMENT ARCHIVÉ" docs/archive/ --count` | 9 fichiers, 9 encadrés. |
| Le `README.md` racine cite la version `2.2.0` (cohérent avec `package.json`) | `rg "version.*2\\.2\\.0" README.md` | Confirmé. |
| `package.json` cite Node ≥ 20 et npm ≥ 10 (cohérent avec `README.md`) | `rg '"node":' package.json` | Confirmé. |

---

## 12. Recommandations

Pour éviter une dégradation future de la documentation :

### 12.1 Critiques (à mettre en place rapidement)

1. **Politique d'archivage continue** : tout retrait de service ou de fonctionnalité doit déclencher une revue documentaire ; les documents qui le décrivaient sont déplacés en `docs/archive/obsolete/` avec encadré.
2. **Datage systématique** : toute nouvelle documentation doit porter une date de revue en tête (au moins année + mois) et être référencée dans `docs/README.md`.
3. **Pas de chiffres marketing non sourcés** dans la documentation technique. Les chiffres opérationnels (tests, vulnérabilités, etc.) doivent être issus de commandes reproductibles.

### 12.2 Recommandées (utiles mais non urgentes)

4. **Mise en place d'un dossier `docs/adr/`** (Architecture Decision Records, format MADR) pour formaliser les décisions d'architecture importantes au fil de l'eau (orchestrateur AI, choix Gemini, modèle multi-tenant, suppression du service plaquette monolithique, etc.).
5. **Revue UX trimestrielle** des guides utilisateur / administrateur / déploiement pour vérifier la cohérence avec l'UI courante.
6. **Cartographie des artefacts** dans `audit/` (README de description ou suppression si la donnée est mieux servie par la CI GitHub Actions).

### 12.3 Facultatives

7. **CI documentaire** : un job de CI qui vérifie qu'aucun document actif ne référence un fichier déplacé en `docs/archive/` (et inversement, qu'aucun document archivé n'est cité comme référence active).
8. **Lint Markdown** sur l'ensemble de la documentation (`markdownlint`).

---

## 13. Verdict final

**Documentation saine** au 2026-05-31.

| Critère | Statut |
|---|---|
| La documentation active reflète l'état réel du produit | Oui |
| Aucun document actif ne décrit un module supprimé comme courant | Oui |
| L'arborescence d'archive est en place et signalée | Oui |
| Tout document archivé porte un encadré explicite | Oui (9 / 9) |
| `README.md` racine et `docs/README.md` constituent une porte d'entrée fiable | Oui |
| Les documents de valorisation et d'audit sont conservés et contextualisés | Oui |
| Aucun risque résiduel ne compromet l'auditabilité | Oui (les risques résiduels listés sont bénins ou explicitement signalés) |

Le repository est **prêt pour un audit documentaire externe**, sous réserve des points à confirmer en § 10 (chevauchement DOSSIER / commissaire aux apports, validation juridique de la note de licence, revue UX des guides anciens).

---

© DICA France — base logicielle développée par KOREV AI. Rapport interne, non opposable hors mission documentaire.
