# Rapport de contrôle interne — Documentation projet pour commissaire aux apports

> **Document interne — ne pas transmettre tel quel au commissaire aux apports.**
>
> Ce rapport documente les vérifications effectuées lors de la production du document `DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md`. Il sert au contrôle qualité interne et n'est pas destiné à la transmission externe.

---

## 1. Périmètre audité

| Élément | Valeur |
|---|---|
| Dépôt | `dica-decorator` |
| Branche | `audit/tier1-2026-05-07` |
| HEAD | `274e4d040ae37e766ac1f7cc9e3ccd8a4a5ac546` |
| Date du contrôle | 21/05/2026 |
| Document principal produit | `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` |
| Note interne associée | `docs/commissaire_aux_apports/NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md` |

---

## 2. Fichiers analysés

### 2.1 Configuration et identification

- `package.json`
- `package-lock.json` (présence vérifiée, contenu non lu intégralement)
- `README.md` (racine)
- `vite.config.ts`
- `vitest.config.ts`
- `eslint.config.js`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `tailwind.config.ts`, `postcss.config.js`, `components.json`
- `.gitignore`
- `.env.example`

### 2.2 Code source

- `src/App.tsx`
- `src/main.tsx` (référencé)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts` (présence vérifiée)
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/services/auth-guard.service.ts` (extrait)
- `src/services/rate-limiter.service.ts` (extrait)
- `src/services/quota.service.ts` (extrait)
- `src/services/url-validator.service.ts` (extrait)
- `src/services/share-link.service.ts` (extrait)
- `src/services/magazine-deco-pdf.service.ts` (extrait)
- `src/services/reseller-brochure-pdf.service.ts` (extrait)
- `src/services/gemini-image.service.ts` (extrait)
- `src/services/organization.service.ts` (extrait)
- `src/services/analytics.service.ts` (extrait)
- `src/services/image-storage.service.ts` (extrait)
- `supabase/functions/apply-decor/index.ts` (extrait)
- `supabase/functions/creative-chat/index.ts` (extrait)
- `supabase/functions/creative-chat/orchestrator.ts` (extrait)
- `supabase/functions/generate-magazine-captions/index.ts` (extrait)
- `supabase/functions/_shared/ssrf-guard.ts`
- `supabase/functions/_shared/logger.ts` (présence vérifiée)
- `supabase/migrations/20251126234705_…sql` (échantillon)
- Inventaire `supabase/migrations/` (23 fichiers)

### 2.3 CI/CD et audit

- `.github/workflows/ci.yml`
- `.github/workflows/cd-edge-functions.yml`
- `audit/final/test.txt`
- `audit/final/lint.txt`
- `audit/final/build.txt`
- `audit/final/npm-audit.txt`
- `audit/phase-0/coverage.txt`
- `audit/phase-minus-1/licenses-prod-summary.txt`

### 2.4 Documentation existante (lecture ciblée)

- `docs/AUDIT_DEPENDANCES.md` (§ 1 à § 4)
- Autres documents `docs/` : inventaire par nom et taille uniquement.

---

## 3. Vérification licence

| Vérification | Résultat |
|---|---|
| `LICENSE` à la racine | Absent. |
| `LICENCE` à la racine | Absent. |
| Autres fichiers de licence à la racine (`COPYING`, `COPYRIGHT`) | Absents. |
| Licence déclarée dans `package.json` | `"license": "UNLICENSED"`. |
| Présence d'une ligne MIT / Apache / GPL globale dans le code | Aucune mention de licence virale dans le code applicatif relue. |
| Audit du graphe de production (`license-checker`) | Distribution : 237 MIT, 27 ISC, 3 Apache-2.0, 3 BSD-3-Clause, 3 BlueOak-1.0.0, 1 UNLICENSED (le projet lui-même), 1 `(MPL-2.0 OR Apache-2.0)`, 1 `(MIT AND Zlib)`, 1 `MIT*`, 1 `0BSD`, 1 `MIT AND ISC`. |
| Présence d'une licence GPL / AGPL / LGPL dans le graphe de production | Aucune. |

**Conclusion de contrôle** : licence propriétaire déclarée au niveau du paquet, aucun fichier de licence racine. Le document principal formule ce constat en `"à confirmer par les actes contractuels"` plutôt qu'en assertion juridique.

---

## 4. Vérification Lovable — qualification des occurrences

Recherche `grep -i lovable` sur l'arborescence (hors `node_modules`).

| Catégorie | Occurrences | Qualification retenue |
|---|---|---|
| Dépendance runtime active dans `package.json` | 0 | Aucune. |
| Dépendance dev dans `package.json` | 0 | Aucune. |
| Dépendance retirée et documentée | 1 (`lovable-tagger`) | Retrait documenté dans `docs/AUDIT_DEPENDANCES.md` § 2. |
| Endpoint URL de repli dans le code Edge | 2 fichiers : `supabase/functions/creative-chat/orchestrator.ts` ligne 26, `supabase/functions/generate-magazine-captions/index.ts` ligne 15 | URL `https://ai.gateway.lovable.dev/v1/chat/completions` présente uniquement comme valeur de fallback ; substituable par la variable d'environnement `AI_GATEWAY_URL`. |
| Variable d'environnement de rétrocompatibilité | 2 fichiers : `supabase/functions/creative-chat/index.ts` ligne 197, `supabase/functions/generate-magazine-captions/index.ts` ligne 103 | `LOVABLE_API_KEY` lue uniquement en fallback de `AI_GATEWAY_API_KEY`. |
| Mention dans la documentation | 7 documents `docs/` (`AUDIT_DEPENDANCES.md`, `PLAN_CORRECTION_RISQUES_DECOTE.md`, `HANDOVER_DEVELOPPEUR.md`, `RAPPORT_EXECUTION_PLAN_CORRECTION.md`, `DOSSIER_COMMISSAIRE_AUX_APPORTS.md`, `DICA_ORCHESTRATOR_GUIDE.md`, `AUDIT_TIER1_BUREAU_DIAGNOSTIQUE.md`) | Documentation explicative du périmètre et du plan de substitution. |
| Historique Git (commits) | Présence d'un commit `83ebdd2 Lovable update` (et de plusieurs commits anciens « Changes » du même tooling). | Trace d'outillage historique. |
| `lovable.app` | 0 occurrence trouvée. | Aucune. |

**Conclusion de contrôle** : aucune dépendance runtime ou dev active. Les résidus (URL de repli + variable d'environnement de rétrocompatibilité) sont substituables sans modification de code en pointant `AI_GATEWAY_URL` et `AI_GATEWAY_API_KEY` vers le fournisseur cible recommandé par `.env.example` (Google AI direct). Le document principal traite ces occurrences en § 7.4 de manière factuelle et non anxiogène, conformément à la consigne.

---

## 5. Vérification scaffolding UI

| Vérification | Résultat |
|---|---|
| Présence de `components.json` (configuration shadcn/ui) | Oui. |
| Présence de `src/components/ui/` | Oui, ≈ 58 fichiers en `ls -1`. |
| Identification de composants spécifiques au produit dans `src/components/ui/` | Oui : `before-after-slider.tsx`, `magazine-deco-export-button.tsx`, `presentation-viewer.tsx`, `reseller-brochure-export-button.tsx`, `safe-image.tsx`, `share-link-dialog.tsx`, `premium-layout.tsx`, `app-footer.tsx`, `theme-toggle.tsx`. |
| Présence de paquets `@radix-ui/*` dans `package.json` | 26 paquets. |

**Conclusion de contrôle** : le scaffold UI est distingué dans le document principal du code propriétaire spécifique (§ 5.1 vs § 5.2). Aucun composant scaffoldé n'est revendiqué comme création propriétaire au sens créatif.

---

## 6. Vérification chiffres qualité

| Indicateur | Valeur retenue dans le document | Source archivée |
|---|---|---|
| Tests | 27 fichiers, 825 cas verts | `audit/final/test.txt` (lignes finales) |
| Build | Succès en environ 3 s | `audit/final/build.txt` (dernière ligne) |
| Lint | 148 erreurs et 13 warnings | `audit/final/lint.txt` (dernière ligne) |
| Couverture statements | 30,42 % | `audit/phase-0/coverage.txt` |
| Couverture branches | 77,58 % | `audit/phase-0/coverage.txt` |
| Couverture functions | 67,98 % | `audit/phase-0/coverage.txt` |
| Couverture lines | 30,42 % | `audit/phase-0/coverage.txt` |
| `npm audit` | 3 vulnérabilités (1 critique jspdf, 2 modérées esbuild/vite) | `audit/final/npm-audit.txt` |
| LoC `src/` (TS/TSX) | ≈ 43 282 lignes | `find src -name '*.ts' -o -name '*.tsx' \| xargs wc -l` |
| LoC `supabase/functions/` (TS Deno) | ≈ 4 027 lignes | `find supabase -name '*.ts' \| xargs wc -l` |
| Migrations SQL | 23 fichiers | `ls supabase/migrations/` |

**Conclusion de contrôle** : tous les chiffres présents dans le document principal sont rattachés à un artefact archivé du dépôt. Aucun chiffre extrapolé ou inventé.

---

## 7. Vérification secrets

| Vérification | Résultat |
|---|---|
| `.gitignore` exclut `.env`, `.env.local`, `.env.*.local` | Oui. |
| `.env.example` présent et ne contient pas de secrets réels | Oui. |
| Étape de détection de motifs sensibles dans la CI | Oui (`.github/workflows/ci.yml`, étape `Detect secrets in diff`). |
| Recherche manuelle de motifs `api_key=`, `password=`, `token=` avec valeur | Aucun secret réel détecté dans le périmètre lu. |

Le document principal mentionne ces éléments en tant que dispositif technique, sans afficher de secret.

---

## 8. Éléments volontairement exclus du document principal

Les éléments suivants ont été identifiés pendant l'audit mais n'ont pas été inclus dans le document principal, soit parce qu'ils relèvent du contrôle interne, soit parce qu'ils risqueraient d'amplifier inutilement un point sans valeur ajoutée pour le commissaire.

| Élément | Raison de l'exclusion |
|---|---|
| Détail nominatif des 148 erreurs ESLint | Information de contrôle interne, pas un signal pour la valorisation. Le chiffre global est conservé. |
| Liste exhaustive des advisories `npm audit` (10 sur jspdf) | Synthèse au niveau de la sévérité conservée. Le plan de migration différé est cité par référence (`docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`). |
| Commentaires opérationnels sur le statut runtime de la passerelle AI Gateway | Information interne sur le plan de substitution. |
| Identité Git détaillée des contributeurs et historique des commits | Hors périmètre demandé. |
| Commandes shell détaillées et procédures de reproductibilité | Maintenues dans `docs/audit/PROJECT_AUDIT_NOTES.md` (audit cabinet précédent), non reprises dans le document principal commissaire. |
| Position défensive sur la décote ou la valorisation | Hors périmètre — relève des documents internes ou d'une expertise externe. |
| Recommandations stratégiques au porteur | Hors périmètre — le document principal ne s'adresse pas au porteur. |
| Mentions du précédent template de prompt (PRISM-Oracle / Evidence / Agent Zero) | Hors sujet pour ce dépôt. |

---

## 9. Points à confirmer hors dépôt

Les éléments suivants ne sont pas vérifiables dans le périmètre du dépôt et doivent être confirmés par des actes ou des éléments externes.

| Point | Nature de la confirmation attendue |
|---|---|
| Chaîne de propriété et de cession de droits entre KOREV AI, le porteur et DICA France | Actes contractuels (contrat de prestation, cession, licence, accord de confidentialité). |
| Modalités précises de la licence commerciale accordée à DICA France | Contrat de licence d'utilisation SaaS, contrat-cadre commercial. |
| Statut runtime effectif de la passerelle AI Gateway en production | Configuration des secrets Supabase en production (`supabase secrets list`). |
| Couverture de tests effective de la couche `src/services/` mesurée isolément | Production d'un rapport Vitest filtré. |
| Volumes d'usage et indicateurs commerciaux | Sources externes (tableau de bord, factures, rapports d'exploitation). |
| Conformité juridique (RGPD, AI Act, DPIA, registre de traitement) | Analyse juridique externe et documentation séparée. |
| Conditions de service (SLA) des fournisseurs tiers | Contrats Supabase et Google AI. |
| Plan de continuité (RPO/RTO, fréquence des backups) | Documentation d'exploitation séparée. |

---

## 10. Conformité du document principal aux règles de rédaction du prompt

| Règle | Vérification |
|---|---|
| Pas de « problème de licence » | Conforme — formulation `"à confirmer"` utilisée. |
| Pas de « vulnérabilité critique » dans le résumé exécutif | Conforme — la mention de criticité est placée en § 8 (qualité), pas en synthèse. |
| Pas de « Lovable app » | Conforme — aucune occurrence. |
| Pas de « généré par IA » comme qualification globale | Conforme. |
| Pas de mention « assistant » comme auditeur | Conforme. |
| Pas de « sous-valorisé » ou « survalorisé » | Conforme. |
| Pas d'adresse au fondateur ni de conseils stratégiques | Conforme. |
| Pas d'URLs externes superflues | Conforme — seuls les noms de domaines techniquement nécessaires sont mentionnés. |
| Pas de justification narrative de la valorisation | Conforme — pas de chiffrage monétaire. |
| Pas d'emojis | Conforme. |
| Formulations préférées (`"constaté dans le dépôt"`, `"à confirmer hors dépôt"`, `"dépendance tierce"`, `"scaffold UI"`, `"module spécifique"`, `"code propriétaire identifié"`, `"limite méthodologique"`) | Utilisées. |
| Distinction socle KOREV / usage DICA | Présente en § 6. |
| Lovable traité de manière factuelle et non anxiogène | Présent en § 7.4. |
| Aucune affirmation juridique non démontrée | Conforme. |

---

## 11. Loop de contrôle final

| Question | Réponse |
|---|---|
| Le document principal parle-t-il au commissaire aux apports ? | Oui (ton cabinet, neutre, pas d'adresse au porteur). |
| Aucun commentaire interne n'est présent dans le document principal ? | Vérifié. Les éléments internes sont dans le présent rapport et dans `NOTE_LICENCE_COMMERCIALE_DICA_DECOR.md`. |
| Aucune formule ne dessert la valorisation ? | Vérifié. |
| Les mentions Lovable sont factuelles et non anxiogènes ? | Vérifié (§ 7.4 du document principal, qualification par catégorie). |
| Les sujets de licence sont formulés en « à confirmer » ? | Vérifié (§ 1, § 6.8, § 7.1, § 11 du document principal). |
| Les dépendances tierces sont clairement distinguées du code propriétaire ? | Vérifié (§ 5.1 vs § 5.2 du document principal). |
| Aucune promesse juridique ou de conformité non démontrée ? | Vérifié (§ 9 et § 11 du document principal formulent les limites). |
| Les chiffres sont sourcés depuis le dépôt ? | Vérifié (§ 8 du document principal renvoie aux fichiers `audit/*`). |
| Le ton est sobre, cabinet, transmissible ? | Vérifié. |
| La note interne reste séparée du document principal ? | Vérifié (fichiers distincts). |

---

*Rapport de contrôle interne — usage interne uniquement.*
