# NOTE QUALITÉ LOGICIELLE — Réponse au rapport Sonar

**Référence** : DICA-DEC-QS-2026
**Date** : 06/06/2026
**Destinataire** : Cabinet Diag & Grow — bureau d'évaluation technique
**Émetteur** : KOREV AI — éditeur, développeur et titulaire des droits sur l'actif logiciel
**Client utilisateur** : DICA France
**Objet** : État de la qualité du code après campagne de correction, en réponse au rapport SonarLint transmis
**Avertissement** : Document factuel, fondé sur le repository, l'historique Git et des mesures reproductibles datées. Les chiffres « état actuel » sont mesurés sur la branche `main` (commit `cc401bb`, 06/06/2026).

---

## 1. Résumé en une phrase

Nous sommes passés d'un code **sans contrôle qualité automatisé et non mesuré** à un code **stabilisé (0 erreur bloquante, tests verts, build OK), mesuré et documenté, avec une dette résiduelle identifiée, plafonnée et planifiée** — la correction effective des dernières issues n'est pas terminée.

---

## 2. Méthode (point de transparence)

Le rapport initial provenait de **SonarLint (IDE)**, non reproductible en l'état (aucun serveur SonarQube branché). La campagne a d'abord rendu chaque famille d'issues **mesurable et reproductible en intégration continue**, via les règles ESLint équivalentes (`eslint-plugin-jsx-a11y` pour l'accessibilité, `eslint-plugin-sonarjs` pour la complexité cognitive), puis a corrigé. Un scan **SonarQube/SonarCloud officiel reste activable** (configuration fournie, en attente d'un jeton `SONAR_TOKEN`).

---

## 3. Avant → Après (campagne de correction)

| Indicateur | Avant campagne | Après campagne | 
|---|---:|---:|
| Erreurs ESLint bloquantes | **148** | **0** |
| Dette `any` (typage non sûr) | 148 | 0 *(sur la base corrigée)* |
| Violations d'accessibilité | 28 | 0 *(sur la base corrigée)* |
| Porte qualité automatique en CI | **Aucune** | **En place** (lint + types + tests + build) |
| Métriques accessibilité & complexité reproductibles | Non | **Oui** |
| Tests automatisés | 842 / 28 fichiers | 842 / 28 fichiers (verts) |

> Réserve importante : ces corrections ont été réalisées sur une base de code figée. La branche de production `main` a, en parallèle, évolué ~4 mois **sans porte qualité**, réintroduisant une partie de la dette (cf. §4).

---

## 4. État actuel réel de `main` (mesuré le 06/06/2026, commit `cc401bb`)

| Indicateur | Résultat |
|---|---|
| **Erreurs bloquantes** | **0** |
| **Avertissements (issues à traiter)** | **84** |
| Compilation TypeScript (`tsc`) | 0 erreur |
| Tests automatisés | **842 / 842 passants** (28 fichiers) |
| Build production | **OK** |
| Plafond anti-régression (CI) | 85 (le compte ne peut plus augmenter) |

### Composition des 84 avertissements

| Famille | Nombre | Commentaire |
|---|---:|---|
| Typage `any` | 45 | dette réintroduite par `main`, suivie |
| Complexité cognitive | 18 | majoritairement **backend** (voir ci-dessous) |
| Fonctions trop imbriquées | 8 | idem backend |
| Accessibilité | 7 | dette réintroduite par `main`, suivie |
| Technique (outillage React) | 6 | structurel, non bloquant |

### Constat majeur : les points chauds sont dans le backend, hors périmètre initial

Les complexités les plus élevées ne sont **pas** dans l'interface, mais dans les fonctions serveur (Supabase Edge Functions), jamais incluses dans le périmètre de correction :

| Fonction backend | Complexité cognitive | Seuil recommandé |
|---|---:|---:|
| `apply-decor` | **226** | 15 |
| `creative-chat` | **117** | 15 |
| `get-users-admin` / `orchestrator` | **44** | 15 |
| `generate-magazine-captions` | **41** | 15 |

C'est l'axe de remédiation prioritaire.

---

## 5. Ce qui est acquis et défendable

- **Stabilité** : 0 erreur bloquante, 842 tests verts, build fonctionnel.
- **Gouvernance** : garde-fou qualité automatique à chaque modification, empêchant l'aggravation (dette plafonnée).
- **Traçabilité** : baseline chiffrée, décisions d'architecture documentées (exclusion justifiée des composants standards), suivi de dette daté.
- **Sécurité** : protections anti-SSRF et journalisation structurée intégrées et testées.

## 6. Ce qui reste (non terminé, planifié)

1. **Rembourser la dette mesurée** : 45 `any` + 7 accessibilité + 26 complexités → cible 0, par paliers (mécanisme de plafond dégressif).
2. **Traiter les complexités backend** (Edge Functions), axe le plus lourd.
3. **Refactors d'interface différés** (3 pages) à réappliquer sur la version actuelle de `main`.
4. **Action de gouvernance** : rendre la porte qualité **bloquante** au merge (protection de branche) — sans quoi les contributions automatiques continuent de creuser la dette.

---

## 7. Conclusion pour l'évaluation

L'actif est passé d'un état **non maîtrisé** à un état **sous contrôle, mesuré et outillé**, avec une **trajectoire de remédiation crédible et chiffrée**. Il ne doit pas être présenté comme « entièrement assaini » : il subsiste **84 issues** sur `main`, dont une complexité backend significative. La valeur démontrée tient autant à la **capacité de mesure et de maîtrise mise en place** qu'au volume déjà corrigé.

---

© DICA France — base logicielle KOREV AI. Note interne factuelle, chiffres reproductibles via `npm run lint`, `npm run test:run`, `npx tsc --noEmit`, `npm run build`.
