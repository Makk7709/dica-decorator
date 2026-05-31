> **Note de fraîcheur (revue 2026-05-31)**
> Document daté du 30 novembre 2025, conservé comme référentiel **actif** pour l'installation locale, la configuration Supabase et la mise en production. Les pipelines CI/CD GitHub Actions actuels sont décrits dans `.github/workflows/README.md`. La checklist de smoke / killswitch production est dans `docs/CHECKLIST_SMOKE_KILLSWITCH.md`. En cas de divergence sur les variables d'environnement ou les secrets, `.env.example` et la console Supabase prévalent.

---

# 🚀 Guide de Déploiement DICA Decorator

**Installation, Configuration et Mise en Production**

---

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Installation locale](#2-installation-locale)
3. [Configuration Supabase](#3-configuration-supabase)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Déploiement production](#5-déploiement-production)
6. [Migrations base de données](#6-migrations-base-de-données)
7. [Déploiement Edge Functions](#7-déploiement-edge-functions)
8. [Monitoring et maintenance](#8-monitoring-et-maintenance)

---

## 1. Prérequis

### Logiciels requis

| Logiciel | Version minimum | Vérification |
|----------|-----------------|--------------|
| **Node.js** | 18.x | `node --version` |
| **npm** | 8.x | `npm --version` |
| **Git** | 2.x | `git --version` |
| **Supabase CLI** | Latest | `supabase --version` |

### Comptes requis

- **Supabase** : Compte avec projet créé
- **Google AI Studio** : Clé API pour Gemini
- **Hébergement** : Vercel, Netlify ou autre

### Installation Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

---

## 2. Installation locale

### Cloner le repository

```bash
git clone <repository-url> dica-decorator
cd dica-decorator
```

### Installer les dépendances

```bash
npm install
```

### Vérifier l'installation

```bash
# Lancer les tests
npm run test:run

# Résultat attendu : 209 tests passed
```

### Lancer en développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

---

## 3. Configuration Supabase

### Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter :
   - **Project URL** : `https://xxx.supabase.co`
   - **Anon Key** : Clé publique
   - **Service Role Key** : Clé admin (secrète)

### Lier le projet local

```bash
# Login Supabase
supabase login

# Lier au projet distant
supabase link --project-ref <project-id>
```

### Appliquer les migrations

```bash
# Pousser les migrations
supabase db push

# Vérifier le statut
supabase db status
```

### Configurer le Storage

Créer les buckets via le dashboard Supabase ou SQL :

```sql
-- Buckets nécessaires
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('decor-textures', 'decor-textures', true),
  ('project-photos', 'project-photos', true),
  ('render-results', 'render-results', true);
```

### Configurer l'authentification

1. Dashboard Supabase → Authentication → Settings
2. **Site URL** : URL de votre application
3. **Redirect URLs** : Ajouter les URLs autorisées
4. Activer **Email confirmations** (optionnel)

---

## 4. Variables d'environnement

### Fichier `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optionnel : override pour dev
VITE_APP_ENV=development
```

### Secrets Edge Functions

Configurer via Supabase Dashboard ou CLI :

```bash
# Via CLI
supabase secrets set GOOGLE_AI_API_KEY=your-api-key

# Vérifier
supabase secrets list
```

### Variables requises

| Variable | Emplacement | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | `.env.local` | URL projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Clé anon publique |
| `GOOGLE_AI_API_KEY` | Supabase Secrets | Clé API Google AI |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Injecté par Supabase |

---

## 5. Déploiement production

### Option A : Vercel (recommandé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Production
vercel --prod
```

**Configuration Vercel :**
- Framework : Vite
- Build Command : `npm run build`
- Output Directory : `dist`
- Variables d'environnement : Ajouter dans le dashboard

### Option B : Netlify

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy

# Production
netlify deploy --prod
```

**Configuration Netlify :**
- Build Command : `npm run build`
- Publish Directory : `dist`

### Option C : Build manuel

```bash
# Build de production
npm run build

# Le dossier dist/ contient les fichiers statiques
# Uploadez-les sur votre serveur web
```

### Configuration serveur

Pour SPA avec React Router, configurer les redirects :

**Vercel** (`vercel.json`) :
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** (`_redirects`) :
```
/*    /index.html   200
```

**Nginx** :
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 6. Migrations base de données

### Structure des migrations

```
supabase/migrations/
├── 20251126234705_initial_schema.sql
├── 20251127111731_add_category_image.sql
└── 20251128_add_multi_tenant.sql
```

### Créer une nouvelle migration

```bash
# Générer un fichier de migration vide
supabase migration new nom_de_la_migration

# Éditer le fichier généré
# supabase/migrations/[timestamp]_nom_de_la_migration.sql
```

### Appliquer les migrations

```bash
# En développement local
supabase db reset  # Réinitialise + applique toutes les migrations

# En production (via CLI)
supabase db push

# Vérifier le statut
supabase migration list
```

### Rollback

```bash
# Revenir à une migration spécifique
supabase db reset --version <timestamp>
```

### Migration manuelle (urgence)

Via le SQL Editor Supabase Dashboard :

```sql
-- Appliquer manuellement une migration
BEGIN;
  -- Vos commandes SQL
COMMIT;
```

---

## 7. Déploiement Edge Functions

### Structure des fonctions

```
supabase/functions/
├── apply-decor/
│   └── index.ts
└── creative-chat/
    └── index.ts
```

### Déployer une fonction

```bash
# Déployer toutes les fonctions
supabase functions deploy

# Déployer une fonction spécifique
supabase functions deploy apply-decor
supabase functions deploy creative-chat
```

### Tester localement

```bash
# Démarrer les fonctions localement
supabase functions serve

# Tester via curl
curl -X POST http://localhost:54321/functions/v1/apply-decor \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"photoUrl": "...", "decorId": "..."}'
```

### Logs des fonctions

```bash
# Voir les logs en temps réel
supabase functions logs apply-decor --tail

# Via Dashboard
# Supabase Dashboard → Edge Functions → Logs
```

### Variables d'environnement

```bash
# Ajouter un secret
supabase secrets set GOOGLE_AI_API_KEY=your-key

# Lister les secrets
supabase secrets list

# Supprimer un secret
supabase secrets unset GOOGLE_AI_API_KEY
```

---

## 8. Monitoring et maintenance

### Health checks

**Frontend :**
```bash
# Vérifier le build
npm run build

# Vérifier les tests
npm run test:run

# Vérifier le lint
npm run lint
```

**Backend :**
```bash
# Statut des migrations
supabase db status

# Statut des fonctions
supabase functions list
```

### Logs Supabase

1. **API Logs** : Dashboard → Logs → API
2. **Database Logs** : Dashboard → Logs → Postgres
3. **Edge Functions** : Dashboard → Edge Functions → Logs
4. **Auth Logs** : Dashboard → Authentication → Logs

### Alertes recommandées

| Métrique | Seuil | Action |
|----------|-------|--------|
| Erreurs API | > 1% | Investiguer logs |
| Temps réponse | > 2s | Optimiser queries |
| Storage | > 80% | Nettoyer ou upgrader |
| Edge Function errors | > 0.1% | Vérifier code |

### Backup

**Automatique (Supabase Pro) :**
- Point-in-time recovery : 7 jours
- Backups quotidiens

**Manuel :**
```bash
# Export via pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Mise à jour des dépendances

```bash
# Vérifier les mises à jour
npm outdated

# Mettre à jour (avec précaution)
npm update

# Mise à jour majeure
npx npm-check-updates -u
npm install
```

### Checklist déploiement

- [ ] Tests passent (`npm run test:run`)
- [ ] Build réussit (`npm run build`)
- [ ] Variables d'environnement configurées
- [ ] Migrations appliquées
- [ ] Edge Functions déployées
- [ ] Secrets configurés
- [ ] Storage buckets créés
- [ ] CORS configuré
- [ ] Redirects SPA configurés
- [ ] SSL activé

---

## 🆘 Troubleshooting

### Erreur : "GOOGLE_AI_API_KEY not configured"

```bash
# Vérifier le secret
supabase secrets list

# Ajouter si manquant
supabase secrets set GOOGLE_AI_API_KEY=your-key

# Redéployer la fonction
supabase functions deploy apply-decor
```

### Erreur : "JWT expired"

- Vérifier que le frontend utilise la bonne clé anon
- Vérifier la synchronisation horaire du serveur

### Erreur : "RLS policy violation"

- Vérifier que l'utilisateur est authentifié
- Vérifier les policies sur la table concernée
- Tester avec le service role key pour isoler

### Erreur : "Storage quota exceeded"

- Nettoyer les fichiers inutilisés
- Upgrader le plan Supabase

### Build échoue

```bash
# Nettoyer le cache
rm -rf node_modules dist
npm install
npm run build
```

---

## 📞 Support

- **Documentation Supabase** : https://supabase.com/docs
- **Documentation Vite** : https://vitejs.dev
- **Support DICA** : tech@dica-france.com

---

© 2025 DICA France - Développé par KOREV AI

