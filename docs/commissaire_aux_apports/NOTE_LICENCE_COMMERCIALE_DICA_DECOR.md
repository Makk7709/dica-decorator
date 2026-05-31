# Note interne — Licence commerciale et droits d'exploitation DICA Decorator

> **Document interne de cadrage.** Cette note n'est pas destinée à être transmise telle quelle au commissaire aux apports sans validation juridique préalable par un conseil habilité. Elle formalise une position de travail et des clauses indicatives appelées à être confirmées, adaptées ou remplacées par les actes contractuels effectivement conclus entre les parties.

---

## 1. Objectif de la note

Définir une position cible interne sur la propriété intellectuelle du logiciel `DICA Decorator`, la nature des droits d'exploitation accordés à DICA France et la qualification des composants tiers intégrés. Cette position sert de référence pour la rédaction du dossier d'apport en nature, des contrats à conclure ou à mettre à jour avec DICA France, et de toute communication externe relative à la propriété du logiciel.

La note ne se substitue pas aux actes juridiques applicables et doit être validée par un avocat avant exploitation contractuelle.

---

## 2. Risque à couvrir

| Risque | Description |
|---|---|
| Confusion socle logiciel / usage client | Risque qu'une lecture des éléments commerciaux et documentaires laisse penser que DICA France serait propriétaire du code source du fait de l'usage exclusif du produit. |
| Composants tiers revendiqués à tort | Risque de revendiquer comme propriétaire des composants relevant de licences open-source (Radix UI, shadcn/ui, jsPDF, etc.). |
| Composants client (catalogue, marques, données) intégrés au périmètre KOREV | Risque inverse : faire entrer dans la propriété du socle logiciel des éléments fournis par DICA France (catalogue, marques, contenus). |
| Outillage assisté présenté comme dépendance | Risque que des traces d'outillage (mentions Lovable dans l'historique, URL de repli) soient interprétées à tort comme une dépendance active conditionnant l'exploitation. |
| Affirmations juridiques absolues sans contrat | Risque d'écrire dans un document de transmission que la propriété est « garantie », « acquise » ou « incontestable » alors qu'aucun acte de cession formel ne figure dans le dépôt. |

---

## 3. Position cible

| Sujet | Position de travail |
|---|---|
| Propriété du socle logiciel | Le socle logiciel (code source, architecture, modules métier, fonctions backend, schémas de base de données, documentation technique, workflows IA, briques de sécurité, méthodes et savoir-faire) demeure rattaché au porteur du projet / à KOREV AI, sauf stipulation contractuelle contraire expresse. |
| Droits accordés à DICA France | Droit d'usage commercial du service, sous forme de licence d'utilisation SaaS, sans cession de propriété, sans transfert du code source, sans droit de copie, de sous-licence, de revente, de rétro-ingénierie ou de réutilisation indépendante du socle logiciel. |
| Composants tiers open-source | Non revendiqués comme propriété exclusive. Utilisation soumise au respect des licences applicables. La valeur propriétaire porte sur l'intégration, l'architecture et les développements spécifiques. |
| Éléments client (DICA France) | Catalogue de décors, marques, logos, visuels, contenus métier, données clients : relèvent du périmètre DICA France et ne sont pas inclus dans la propriété du socle logiciel KOREV AI. |
| Outils d'assistance au développement | Mentions résiduelles d'outils tiers d'assistance qualifiées comme traces d'outillage, sauf preuve d'une dépendance runtime active. |
| Statut juridique | Toutes les positions ci-dessus sont à confirmer par les contrats applicables. La présente note constitue une position de travail interne. |

---

## 4. Clause de licence commerciale recommandée

> **Clause de travail — non juridiquement définitive.**
> Cette formulation est proposée comme matériau à soumettre à un avocat pour intégration, adaptation ou substitution dans un acte contractuel adéquat.

« Le logiciel DICA Decor, incluant notamment son code source, son architecture, ses modules fonctionnels, ses services backend, ses workflows d'intelligence artificielle, ses interfaces d'administration, ses systèmes de génération documentaire, ses mécanismes de sécurité, sa documentation technique et ses composants réutilisables, demeure la propriété exclusive de KOREV AI / du porteur du projet, sauf stipulation contractuelle contraire expresse.

DICA France bénéficie d'un droit d'utilisation commercial du service, limité à ses besoins internes, à ses revendeurs et/ou à ses utilisateurs autorisés, dans les conditions définies contractuellement. Ce droit d'utilisation ne constitue ni une cession de propriété intellectuelle, ni un transfert du code source, ni une autorisation de reproduction, de revente, de sous-licence, de rétro-ingénierie ou de réutilisation autonome du socle logiciel.

KOREV AI conserve le droit de réutiliser, adapter, maintenir, faire évoluer et commercialiser les composants génériques, modules techniques, méthodes, architectures, briques d'intelligence artificielle, briques de sécurité, workflows, interfaces et savoir-faire issus ou utilisés dans le cadre du projet, sous réserve de ne pas réutiliser sans autorisation les marques, contenus, catalogues, données confidentielles ou éléments propres à DICA France. »

---

## 5. Droits réservés à KOREV AI

Sauf clause contraire écrite, les éléments suivants demeurent rattachés au périmètre KOREV AI :

- code source applicatif et schémas de base de données ;
- architecture applicative et choix d'architecture ;
- composants génériques et services backend ;
- fonctions Edge (`apply-decor`, `creative-chat`, `generate-magazine-captions`, `get-analytics`, `get-users-admin`) ;
- logique d'orchestration IA, prompts systèmes et workflows IA (`supabase/functions/creative-chat/orchestrator.ts` et services associés) ;
- modules de sécurité (anti-SSRF frontend et Edge, garde d'authentification serveur, validateurs d'URL, rate limiter, quota) ;
- modules de génération PDF (brochure revendeur, magazine éditorial) ;
- système de partage sécurisé (liens, expiration, journalisation d'accès) ;
- système d'administration et tableaux de bord analytics ;
- modèles de données et politiques de sécurité par lignes ;
- documentation technique ;
- scripts de build, d'intégration continue et de déploiement ;
- savoir-faire, méthodes et choix d'architecture ;
- composants réutilisables dans d'autres produits KOREV AI.

---

## 6. Droits concédés à DICA France

Sous réserve des accords contractuels applicables, DICA France bénéficie :

- d'un droit d'usage commercial du service en mode SaaS, encadré par les conditions contractuelles ;
- d'un accès aux fonctionnalités du logiciel pour son périmètre opérationnel (utilisateurs internes, revendeurs et utilisateurs autorisés sous son autorité) ;
- de la mise à disposition des livrables produits par le logiciel dans le cadre de son usage normal (rendus, brochures, exports) ;
- d'une éventuelle exclusivité sectorielle ou catalogue, à confirmer contractuellement, sans empêcher la réutilisation par KOREV AI du socle technique générique dans d'autres contextes.

Ce droit d'usage ne comprend pas :

- la propriété du code source ;
- le droit de copier, modifier, redistribuer, sous-licencier, revendre ou exploiter de manière autonome le socle logiciel ;
- le droit d'effectuer une rétro-ingénierie du logiciel ;
- le droit d'utiliser les composants techniques en dehors du périmètre du service contractuellement défini.

---

## 7. Éléments DICA exclus de la propriété KOREV AI

Les éléments suivants relèvent du périmètre DICA France et ne sont pas inclus dans la propriété du socle logiciel KOREV AI :

- catalogue de décors et références produits DICA ;
- marques, dénominations commerciales et logos DICA ;
- visuels commerciaux, photographies de produits et supports marketing fournis par DICA ;
- contenus éditoriaux et descriptifs métier propres à DICA ;
- données clients de DICA France et données personnelles de ses utilisateurs finaux ;
- photographies téléversées et rendus produits dans le cadre de l'usage opérationnel par les utilisateurs DICA, selon les conditions contractuelles applicables ;
- supports commerciaux et documents fournis par DICA France pour intégration dans les exports cobrandés.

Ces éléments font l'objet, le cas échéant, d'autorisations d'utilisation distinctes (licence de marque, autorisation d'usage du catalogue, conditions d'usage des données) qui ne se confondent pas avec la propriété du socle logiciel.

---

## 8. Dépendances tierces et open-source

Les dépendances tierces intégrées au projet (cf. § 7 du document principal) ne sont pas revendiquées comme propriété exclusive de KOREV AI. Leur usage est subordonné au respect des licences applicables. La valeur propriétaire revendiquée porte exclusivement sur :

- l'intégration applicative et l'architecture mise en œuvre ;
- les développements spécifiques métier ;
- les modules d'orchestration et de logique IA ;
- les modules de sécurité et de contrôle d'accès ;
- la documentation technique et le savoir-faire d'intégration.

Aucune licence à effet viral (GPL, AGPL, LGPL) n'a été identifiée dans le graphe de production (cf. `audit/phase-minus-1/licenses-prod-summary.txt`). La conformité d'usage et la communication des licences applicables doivent rester à confirmer dans le cadre d'une vérification juridique externe.

---

## 9. Mentions Lovable et outils assistés

Qualification factuelle dans le périmètre du dépôt à la date de la note :

| Catégorie | Constat |
|---|---|
| Dépendance runtime active dans `package.json` | Aucune. |
| Dépendance dev dans `package.json` | Aucune. |
| Dépendance retirée et documentée | `lovable-tagger` (plugin Vite dev-only). |
| URL de repli dans le code Edge | `https://ai.gateway.lovable.dev/v1/chat/completions` présente comme valeur de fallback dans `supabase/functions/creative-chat/orchestrator.ts` et `supabase/functions/generate-magazine-captions/index.ts`. Substituable par la variable d'environnement `AI_GATEWAY_URL`. |
| Variable d'environnement de rétrocompatibilité | `LOVABLE_API_KEY` lue uniquement en fallback de `AI_GATEWAY_API_KEY`. |
| Mentions dans la documentation `docs/` | Présentes dans des documents d'audit et de plan de migration. |
| Historique Git | Commit `Lovable update` présent dans l'historique. |

**Position de travail.** Ces occurrences sont qualifiées comme éléments d'outillage ou d'assistance au développement, sans constituer une cession de propriété ni une limitation d'exploitation du logiciel. La substitution opérationnelle des deux résidus (URL de repli, variable d'env de rétrocompatibilité) se fait par configuration des secrets d'environnement et ne nécessite pas de modification de code.

**Recommandation interne.** Maintenir la position observable : `.env.example` recommande `AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`. Vérifier que les secrets de production pointent effectivement vers cette URL et que `AI_GATEWAY_API_KEY` est défini (rendant `LOVABLE_API_KEY` inutilisée en pratique). Cette vérification est documentée dans `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` (action P3, R-OPS-1).

---

## 10. Points à faire valider par l'avocate

| Point | Validation attendue |
|---|---|
| Formulation de la clause de licence commerciale (§ 4) | Rédaction juridique définitive intégrant les définitions, le périmètre, la durée, les conditions de résiliation et les modalités financières. |
| Périmètre exact des droits réservés à KOREV AI (§ 5) | Confirmation que cette liste est juridiquement défendable et opposable, et qu'elle ne crée pas de conflit avec d'éventuels engagements antérieurs. |
| Périmètre exact des droits concédés à DICA France (§ 6) | Cohérence avec les contrats existants, accord sur l'usage en cobranding, sur la sous-traitance éventuelle vers des revendeurs, sur les conditions d'exclusivité. |
| Périmètre des éléments DICA exclus (§ 7) | Inventaire et qualification des marques, du catalogue et des données ; clauses spécifiques sur la propriété des rendus générés. |
| Statut des données personnelles traitées | Définition du responsable de traitement, du sous-traitant éventuel au sens RGPD, des engagements de sécurité, de la durée de conservation et de la portabilité. |
| Compatibilité avec les licences open-source du graphe (§ 8) | Vérification que la distribution UNLICENSED du projet et les conditions d'usage propriétaire restent compatibles avec les licences MIT / ISC / Apache-2.0 / BSD / MPL identifiées. |
| Qualification juridique des mentions Lovable (§ 9) | Position juridique sur la portée d'une trace d'outillage (commit, URL de repli, variable de rétrocompatibilité) dans la chaîne de propriété. |
| Sécurisation de la propriété antérieure à la constitution de la société | Existence et formalisation d'un acte d'apport en nature ou de cession des droits du porteur vers KOREV AI à la constitution. |
| Reconnaissance des contributions tierces éventuelles | Identification de toute contribution rémunérée ou bénévole de tiers (freelances, stagiaires) et vérification de la cession des droits associés. |
| Clauses de confidentialité et non-concurrence | Vérification de la cohérence des engagements antérieurs du porteur. |

---

## 11. Annexes internes de référence

- `docs/AUDIT_DEPENDANCES.md` — audit du graphe de dépendances et qualification des éléments tiers.
- `docs/PLAN_CORRECTION_RISQUES_DECOTE.md` — plan de substitution du fallback AI Gateway (action R-OPS-1).
- `docs/RAPPORT_EXECUTION_PLAN_CORRECTION.md` — suivi d'exécution.
- `audit/phase-minus-1/licenses-prod-summary.txt` — résumé `license-checker` du graphe de production.
- `docs/commissaire_aux_apports/DOCUMENTATION_PROJET_COMMISSAIRE_AUX_APPORTS.md` — document de transmission externe associé.
- `docs/commissaire_aux_apports/CONTROLE_DOCUMENTATION_PROJET.md` — rapport de contrôle interne.

---

*Note interne — usage interne uniquement. Ne pas transmettre sans validation juridique préalable.*
