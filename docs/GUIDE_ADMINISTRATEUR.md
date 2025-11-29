# 🔧 Guide Administrateur DICA Decorator

**Gestion et Administration de l'Application**

---

## Table des Matières

1. [Accès Administrateur](#1-accès-administrateur)
2. [Gestion des Décors](#2-gestion-des-décors)
3. [Gestion des Catégories](#3-gestion-des-catégories)
4. [Gestion des Organisations](#4-gestion-des-organisations)
5. [Gestion des Utilisateurs](#5-gestion-des-utilisateurs)
6. [Quotas et Limites](#6-quotas-et-limites)
7. [Monitoring et Rapports](#7-monitoring-et-rapports)
8. [Maintenance](#8-maintenance)

---

## 1. Accès Administrateur

### Rôles disponibles

| Rôle | Permissions | Accès Admin |
|------|-------------|-------------|
| **admin** | Gestion complète | ✅ Oui |
| **client** | Utilisation standard | ❌ Non |

### Accéder au panneau admin

1. Connectez-vous avec un compte administrateur
2. Le bouton **"Admin"** apparaît dans le header
3. Cliquez dessus pour accéder au panneau d'administration

### Attribution du rôle admin

Via la console Supabase :

```sql
-- Attribuer le rôle admin à un utilisateur
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-de-lutilisateur', 'admin');

-- Ou mettre à jour un rôle existant
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'uuid-de-lutilisateur';
```

---

## 2. Gestion des Décors

### Interface de gestion

L'onglet **"Décors"** du panneau admin permet de :
- Lister tous les décors
- Créer de nouveaux décors
- Modifier les décors existants
- Activer/Désactiver des décors
- Supprimer des décors

### Création d'un décor

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **Nom** | Texte | Nom commercial du décor | "Inox Brossé Premium" |
| **Code référence** | Texte | Code unique catalogue | "DIC-A23" |
| **Catégorie** | Sélection | metal, unis, marbre, bois, deco | "metal" |
| **Contextes d'usage** | Multi-sélection | ascenseur, van, terrasse | ["ascenseur", "van"] |
| **Image texture** | Upload | Image de la texture (JPG/PNG) | texture_inox.jpg |
| **Actif** | Boolean | Visible par les utilisateurs | true |

### Upload de textures

**Spécifications recommandées :**
- Format : JPG ou PNG
- Résolution : 1024×1024 pixels minimum
- Qualité : Haute (non compressée)
- Représentation : Vue frontale de la texture

**Emplacement stockage :** Bucket `decor-textures` sur Supabase Storage

### Activation/Désactivation

- Les décors inactifs ne sont **pas visibles** par les utilisateurs
- Utile pour :
  - Décors en cours de préparation
  - Décors retirés du catalogue
  - Tests internes

### Structure de données

```typescript
interface Decor {
  id: string;                    // UUID auto-généré
  name: string;                  // Nom du décor
  reference_code: string;        // Code unique
  category: string;              // Catégorie
  usage_contexts: string[];      // Contextes d'application
  texture_image_url: string;     // URL de la texture
  is_active: boolean;            // Statut actif
  created_at: timestamp;         // Date création
  updated_at: timestamp;         // Date mise à jour
}
```

---

## 3. Gestion des Catégories

### Catégories système

Les catégories sont définies dans le système :

| Catégorie | Slug | Description |
|-----------|------|-------------|
| Métal | `metal` | Finitions métalliques (inox, alu, etc.) |
| Unis | `unis` | Couleurs unies, surfaces lisses |
| Marbre | `marbre` | Effets pierre naturelle |
| Bois | `bois` | Essences de bois naturel |
| Déco | `deco` | Motifs décoratifs |

### Ajouter une catégorie

Via l'interface admin ou directement en base :

```sql
INSERT INTO decor_categories (name, slug, description, image_url)
VALUES (
  'Nouvelle Catégorie',
  'nouvelle-categorie',
  'Description de la catégorie',
  '/path/to/category-image.jpg'
);
```

### Impact sur l'IA

Chaque catégorie a des règles de rendu spécifiques dans l'IA :

```
Metal → Reflets directionnels, lignes de brossage
Unis → Surface lisse, pas de grain
Marbre → Veines minérales, reflets subtils
Bois → Grain du bois, chaleur naturelle
Déco → Préservation des motifs
```

---

## 4. Gestion des Organisations

### Modèle multi-tenant

L'application supporte plusieurs organisations (revendeurs) avec :
- Branding personnalisé
- Quotas dédiés
- Membres avec rôles

### Créer une organisation

Via la console Supabase ou l'API :

```sql
INSERT INTO organizations (name, slug, primary_color, subscription_tier, monthly_render_quota)
VALUES (
  'DICA Revendeur Lyon',
  'dica-lyon',
  '#E94E5D',
  'pro',
  500
);
```

### Tiers d'abonnement

| Tier | Quota mensuel | Prix indicatif |
|------|---------------|----------------|
| **starter** | 100 rendus | Gratuit |
| **pro** | 500 rendus | Standard |
| **enterprise** | 2000 rendus | Premium |

### Personnalisation branding

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `name` | Nom de l'organisation | "DICA Lyon" |
| `slug` | URL unique | "dica-lyon" |
| `logo_url` | Logo personnalisé | "/logos/dica-lyon.png" |
| `primary_color` | Couleur principale | "#E94E5D" |

### Gestion des membres

```sql
-- Ajouter un membre
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
VALUES ('org-uuid', 'user-uuid', 'member', NOW());

-- Rôles disponibles : owner, admin, member
```

### Invitations

Les invitations sont gérées via la table `organization_invitations` :
- Token unique généré automatiquement
- Expiration : 7 jours
- Email d'invitation envoyé automatiquement

---

## 5. Gestion des Utilisateurs

### Voir tous les utilisateurs

Via la console Supabase > Authentication > Users

### Informations disponibles

- Email
- Date d'inscription
- Dernière connexion
- Statut (confirmé, non confirmé)
- Métadonnées

### Actions administrateur

| Action | Comment |
|--------|---------|
| Réinitialiser mot de passe | Email automatique via Supabase |
| Désactiver un compte | Ban via console Supabase |
| Supprimer un compte | Suppression en cascade (attention RLS) |
| Changer le rôle | Modifier `user_roles` |

### Audit des actions

Toutes les actions sont tracées via les logs Supabase :
- Connexions
- Créations de projets
- Générations de rendus
- Modifications admin

---

## 6. Quotas et Limites

### Limites par défaut

| Type | Limite | Reset |
|------|--------|-------|
| **Utilisateur** | 50 rendus/jour | Minuit UTC |
| **Organisation (starter)** | 100 rendus/mois | 1er du mois |
| **Organisation (pro)** | 500 rendus/mois | 1er du mois |
| **Organisation (enterprise)** | 2000 rendus/mois | 1er du mois |

### Vérifier les quotas

```sql
-- Quotas organisation
SELECT name, subscription_tier, monthly_render_quota, renders_used_this_month
FROM organizations;

-- Usage par utilisateur ce mois
SELECT user_id, SUM(render_count) as total
FROM render_usage
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id
ORDER BY total DESC;
```

### Ajuster un quota

```sql
-- Augmenter le quota d'une organisation
UPDATE organizations
SET monthly_render_quota = 1000
WHERE slug = 'dica-lyon';

-- Réinitialiser le compteur (manuel)
UPDATE organizations
SET renders_used_this_month = 0
WHERE slug = 'dica-lyon';
```

### Alertes quotas

Le système envoie des alertes à :
- **80%** : Alerte warning
- **95%** : Alerte critique
- **100%** : Blocage des rendus

---

## 7. Monitoring et Rapports

### Dashboard Supabase

Accédez via : https://supabase.com/dashboard

Métriques disponibles :
- Requêtes API
- Stockage utilisé
- Utilisateurs actifs
- Logs d'erreurs

### Requêtes de rapport

```sql
-- Rendus par organisation ce mois
SELECT 
  o.name,
  o.subscription_tier,
  COUNT(rr.id) as renders_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN render_results rr ON om.user_id = rr.user_id
WHERE rr.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY o.id, o.name, o.subscription_tier
ORDER BY renders_count DESC;

-- Top utilisateurs
SELECT 
  u.email,
  COUNT(p.id) as projects_count,
  COUNT(rr.id) as renders_count
FROM auth.users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN project_photos pp ON p.id = pp.project_id
LEFT JOIN render_results rr ON pp.id = rr.project_photo_id
GROUP BY u.id, u.email
ORDER BY renders_count DESC
LIMIT 20;

-- Décors les plus utilisés
SELECT 
  d.name,
  d.reference_code,
  COUNT(rr.id) as usage_count
FROM decors d
LEFT JOIN render_results rr ON d.id = rr.decor_id
GROUP BY d.id, d.name, d.reference_code
ORDER BY usage_count DESC
LIMIT 10;
```

### Logs Edge Functions

Via Supabase Dashboard > Edge Functions > Logs

Filtrer par :
- `apply-decor` : Génération de rendus
- `creative-chat` : Assistant créatif

---

## 8. Maintenance

### Tâches régulières

| Fréquence | Tâche | Action |
|-----------|-------|--------|
| **Quotidienne** | Vérifier les logs d'erreurs | Dashboard Supabase |
| **Hebdomadaire** | Vérifier l'espace stockage | Nettoyer si >80% |
| **Mensuelle** | Reset automatique quotas | Automatique |
| **Trimestrielle** | Audit sécurité | Vérifier RLS policies |

### Nettoyage stockage

```sql
-- Trouver les images orphelines (optionnel)
SELECT original_image_url 
FROM project_photos pp
LEFT JOIN projects p ON pp.project_id = p.id
WHERE p.id IS NULL;
```

### Backup

Les backups sont gérés automatiquement par Supabase :
- **Point-in-time recovery** : 7 jours (plan Pro)
- **Backup quotidien** : Automatique

### Mise à jour des décors

1. Préparer les nouvelles textures
2. Tester en environnement de staging
3. Uploader via l'interface admin
4. Activer les nouveaux décors
5. Communiquer aux utilisateurs

### Gestion des erreurs IA

Si l'API Google AI renvoie des erreurs :

| Code | Cause | Solution |
|------|-------|----------|
| 429 | Quota API dépassé | Attendre ou upgrader plan |
| 500 | Erreur serveur Google | Réessayer plus tard |
| 400 | Prompt invalide | Vérifier les paramètres |

---

## 🔑 Accès sensibles

### Variables d'environnement

| Variable | Description | Où la configurer |
|----------|-------------|------------------|
| `GOOGLE_AI_API_KEY` | Clé API Google Gemini | Supabase Edge Functions Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase | Automatique |

### Rotation des clés

1. Générer une nouvelle clé sur Google AI Studio
2. Mettre à jour dans Supabase Secrets
3. Tester la génération
4. Révoquer l'ancienne clé

---

## 📞 Escalade support

| Niveau | Contact | Délai |
|--------|---------|-------|
| N1 - Utilisateur | support@dica-france.com | 24h |
| N2 - Technique | tech@dica-france.com | 4h |
| N3 - Critique | Équipe développement | 1h |

---

© 2024 DICA France - Développé par KOREV AI

