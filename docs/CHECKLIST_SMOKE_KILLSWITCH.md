# Checklist Smoke Tests & Grille Kill-Switch — DICA Decorator

**Référence** : DICA-DEC-SMOKE-2026
**Date** : 06/05/2026
**Émetteur** : KOREV AI
**Objet** : Procédure de validation manuelle obligatoire à exécuter (a) après chaque migration majeure (Phase 1) et (b) après chaque sprint de typage (Phase 2). Inclut la grille de kill-switch pour interrompre une migration en cas de dérapage.

---

## 1. Checklist smoke tests (15 points obligatoires)

À exécuter dans cet ordre, sur l'environnement **staging** (jamais directement en production).

### 1.1 Authentification & onboarding

- [ ] **S-AUTH-1** : Inscription nouveau compte → email confirmation reçu → connexion OK
- [ ] **S-AUTH-2** : Connexion compte existant (admin + utilisateur standard)
- [ ] **S-AUTH-3** : Mot de passe oublié → email reçu → réinitialisation → connexion

### 1.2 Cycle complet de visualisation

- [ ] **S-PROJ-1** : Création projet (cas d'usage : ascenseur, van, terrasse, autre) — 4 cas
- [ ] **S-PROJ-2** : Upload photo (PNG, JPEG, WebP) — 3 formats
- [ ] **S-PROJ-3** : Application décor → rendu Gemini reçu en < 90 s → image affichée
- [ ] **S-PROJ-4** : Régénération variante → image différente reçue
- [ ] **S-PROJ-5** : Slider Avant/Après fonctionnel + labels italiques visibles

### 1.3 Exports

- [ ] **S-EXP-1** : Téléchargement PNG / JPEG / WebP — qualité paramétrable
- [ ] **S-EXP-2** : Génération **Magazine DÉCO PDF** complet (multi-pages, captions IA présentes, typographie correcte)
- [ ] **S-EXP-3** : Génération **Brochure revendeur** avec couverture co-brandée (logo + raison sociale)
- [ ] **S-EXP-4** : Export **Analytics JSON / CSV / PDF** depuis Admin → ouverture sans erreur

### 1.4 Assistant créatif & partage

- [ ] **S-CREA-1** : Chat IA texte (sans image) → réponse streaming reçue
- [ ] **S-CREA-2** : Chat IA avec image source → image générée respectant les décors catalogue
- [ ] **S-SHARE-1** : Génération lien public → ouverture dans navigateur privé → expiration testée

### 1.5 Multi-tenant & admin

- [ ] **S-ORG-1** : Création organisation → invitation membre → activation
- [ ] **S-ADMIN-1** : Page Admin → gestion utilisateurs (activation, désactivation, confirmation email manuelle)
- [ ] **S-ADMIN-2** : Co-branding → upload logo → vérification dans Brochure revendeur générée
- [ ] **S-QUOTA-1** : Atteinte du quota mensuel → blocage avec message clair

### 1.6 Performance & UX

- [ ] **S-PERF-1** : Build time mesuré ≤ 110 % du baseline (`audit/phase-minus-1/build-perf.txt`)
- [ ] **S-PERF-2** : Bundle size top 10 ≤ 110 % du baseline (`audit/phase-minus-1/bundle-top10.txt`)
- [ ] **S-UX-1** : Mode nuit → bascule jour/nuit complète sans flash
- [ ] **S-UX-2** : Mode présentation plein écran → transitions fluides

### 1.7 Sécurité

- [ ] **S-SEC-1** : Tentative d'accès admin avec compte non-admin → 403/redirection
- [ ] **S-SEC-2** : Upload photo > 20 MB → rejet
- [ ] **S-SEC-3** : URL externe non whitelistée envoyée à Edge → rejet (anti-SSRF)

**Critère d'acceptation** : 100 % des points cochés. Tout échec = blocage merge.

---

## 2. Grille kill-switch (interruption de migration)

À consulter en cas d'incident pendant l'exécution d'une phase. **Toute occurrence d'un signal d'arrêt déclenche un rollback immédiat.**

### 2.1 Phase 1 — Migrations dépendances

| Migration | Signal d'arrêt | Action de rollback |
|-----------|----------------|--------------------|
| `npm audit fix` (P1-1) | > 5 tests qui échouent après fix | `git checkout -- package.json package-lock.json && npm ci` |
| `react-router-dom` 6 → 7 (P1-2) | > 3 routes cassent en smoke OU `npm run build` échoue | Rester en `react-router-dom@^6.30.x` + ajouter `overrides` ciblé : `"@remix-run/router": "^1.23.2"` (premier patch sécurisé) |
| `jspdf` 3 → 4 (P1-3) | > 10 tests PDF échouent OU rendu visuel régresse (S-EXP-2/3) | Rester en `jspdf@^3.0.x` + monitorer avis CVE pour patch v3 |
| `happy-dom` (P1-4) | > 20 tests cassent OU mode `vitest` ne démarre pas | Bascule complète vers `jsdom` (déjà installé) — modifier `vitest.config.ts` |
| `vite` 5 → 6 + `vitest` 3 → 4 (P1-5) | Build dépasse 8 s (vs baseline 3,8 s) OU > 30 tests cassent | Rester en `vite@^5.4.x` + `vitest@^3.2.x` ; appliquer `overrides` esbuild ciblé |

### 2.2 Phase 2 — Sprints typage

| Sprint | Signal d'arrêt | Action |
|--------|----------------|--------|
| Typage Edge (P2-1) | PR > 800 lignes diff OU plus de 2 j/h | Splitter par fonction (apply-decor / creative-chat / etc.) |
| Typage services (P2-2) | PR > 800 lignes diff | Splitter par service |
| Typage pages (P2-3) | Régression visuelle/UX détectée | Stop & analyse — possible types incorrects |
| Typage tests (P2-4) | > 5 tests passent à `false` après typage | Investigation immédiate — un test typé qui passe à `false` révèle souvent un vrai bug |
| CI/CD pipeline (P2-5) | Workflow rouge sur 3 builds consécutifs | Désactiver temporairement les jobs problématiques + ticket dédié |

### 2.3 Phase 3 — Résilience

| Action | Signal d'arrêt | Mitigation |
|--------|----------------|-----------|
| Tests Edge (P3-1) | Mocks Deno fragiles (timeout aléatoires) | Bascule vers tests d'intégration via Supabase staging plutôt que mocks |
| Logger conditionnel (P3-2) | Perte d'information critique en prod après bascule | Restaurer immédiatement les logs verbeux + revoir le seuil |
| Migration AI Gateway (P3-3) | Latence > 200 % du baseline OU erreurs > 5 % en staging | Rester sur la passerelle actuelle + repousser la migration |
| Observabilité (P3-4) | Décision outil non tranchée à 0,5 j/h | Activer Supabase logs natifs en interim, ne pas bloquer |

---

## 3. Procédure de mise en œuvre

### 3.1 Avant chaque migration

```bash
# 1. Branche dédiée
git checkout -b chore/phase-1-<migration-name>

# 2. Snapshot pré-migration
npm run lint > audit/phase-1/<name>-lint-pre.txt 2>&1 || true
npm run test:run > audit/phase-1/<name>-test-pre.txt 2>&1 || true
npm run build > audit/phase-1/<name>-build-pre.txt 2>&1
npm audit > audit/phase-1/<name>-audit-pre.txt 2>&1 || true
```

### 3.2 Pendant la migration

```bash
# Application du changement
npm install <package>@<version>

# Re-validation immédiate
npm run lint
npm run test:run
npm run build
```

### 3.3 Après la migration

```bash
# Snapshot post-migration
npm run lint > audit/phase-1/<name>-lint-post.txt 2>&1 || true
npm run test:run > audit/phase-1/<name>-test-post.txt 2>&1 || true
npm run build > audit/phase-1/<name>-build-post.txt 2>&1
npm audit > audit/phase-1/<name>-audit-post.txt 2>&1 || true

# Diff lint+tests pour traçabilité
diff audit/phase-1/<name>-lint-pre.txt audit/phase-1/<name>-lint-post.txt > audit/phase-1/<name>-lint-diff.txt || true
```

Puis exécuter la **checklist smoke §1** sur l'environnement staging.

### 3.4 Critère de merge

| Item | Exigence |
|------|----------|
| Tests | ≥ 808/811 passants (pas de régression vs baseline) |
| Build | ✓ ; durée ≤ 110 % baseline |
| Lint | Pas d'augmentation du compteur d'erreurs |
| `npm audit` | Compteur de vulnérabilités strictement diminué |
| Smoke checklist | 100 % cochée |

Tout écart sur l'un de ces 5 critères = **rejet du merge** et application du kill-switch correspondant.

---

## 4. Responsables

| Rôle | Responsabilité |
|------|----------------|
| Exécutant migration | Branche dédiée, snapshots, smoke checklist |
| Reviewer PR | Validation diff lint/test/build/audit + relecture code |
| Ops | Provisionnement secrets staging + rollback Edge Functions si nécessaire |
| KOREV AI (lead) | Décision finale en cas de signal d'arrêt |

---

**Cette checklist est OBLIGATOIRE pour toute migration Phase 1 et Phase 2. Aucune exception.**
