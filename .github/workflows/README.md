# Workflows GitHub Actions — DICA Decorator

Ce dossier contient les pipelines CI/CD du projet.

## ci.yml — Pipeline de qualité (CI)

**Déclencheurs** : `push` sur `main`/`develop`, `pull_request` ciblant `main`/`develop`, et déclenchement manuel.

**Jobs** :

1. **quality** — Lint, tests + couverture, build, `npm audit`, audit licences. Tous les artefacts sont uploadés (rétention 30 j).
2. **security-scan** — `npm audit --audit-level=high` + détection naïve de secrets dans le diff. Non bloquant pour l'instant (cf. `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`).

**Critères de blocage merge** :

| Étape | Critère |
|-------|---------|
| Lint | exit code = 0 (pas d'erreur ESLint) |
| Tests | 100 % verts, aucun `Tests * failed` |
| Build | exit code = 0 |

`npm audit` et l'audit licences sont **non bloquants** (warnings) tant que les vulnérabilités résiduelles documentées (cf. `docs/MIGRATIONS_DIFFEREES_DEPENDANCES.md`) ne sont pas migrées.

## cd-edge-functions.yml — Déploiement Edge Functions Supabase (CD)

**Déclencheur** : `workflow_dispatch` uniquement (lancement manuel).

**Inputs** :

- `environment` — `staging` ou `production`
- `function` — nom de la fonction à déployer (laisser vide = toutes)

**Prérequis** : ces secrets doivent être configurés dans le repository :

- `SUPABASE_ACCESS_TOKEN` — token d'accès Supabase CLI
- `SUPABASE_PROJECT_REF` — référence du projet Supabase

**Aucun déploiement automatique du frontend** : le front est servi via un CDN statique géré séparément (cf. `docs/GUIDE_DEPLOIEMENT.md`).

## Activation

Ces workflows sont **fournis prêts à l'emploi**. Pour les activer :

1. Créer les secrets GitHub mentionnés ci-dessus (Settings → Secrets and variables → Actions).
2. Pousser sur `main` ou ouvrir une PR — le job `quality` s'exécutera automatiquement.
3. Pour un déploiement Edge, aller dans Actions → CD Edge Functions → Run workflow.

## Évolutions prévues (Phase 3)

- Ajout d'un job `e2e-staging` qui exécute la **smoke checklist** (cf. `docs/CHECKLIST_SMOKE_KILLSWITCH.md`) en mode automatisé via Playwright.
- Hook Slack/email sur succès/échec déploiement Edge.
- Métriques de tendance lint/tests/coverage (TimescaleDB ou GitHub repo metrics).
