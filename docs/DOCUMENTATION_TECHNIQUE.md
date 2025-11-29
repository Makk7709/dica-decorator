# 💻 Documentation Technique DICA Decorator

**Architecture, Technologies et Implémentation**

---

## Table des Matières

1. [Stack Technologique](#1-stack-technologique)
2. [Architecture Applicative](#2-architecture-applicative)
3. [Schéma de Base de Données](#3-schéma-de-base-de-données)
4. [Services Métier (TDD)](#4-services-métier-tdd)
5. [Edge Functions](#5-edge-functions)
6. [Sécurité](#6-sécurité)
7. [Tests](#7-tests)
8. [Performance](#8-performance)

---

## 1. Stack Technologique

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **React** | 18.x | Framework UI |
| **TypeScript** | 5.x | Typage statique |
| **Vite** | 5.x | Build tool |
| **TailwindCSS** | 3.x | Styling |
| **shadcn/ui** | Latest | Composants UI |
| **React Router** | 6.x | Routing |
| **TanStack Query** | 5.x | État serveur |
| **React Hook Form** | 7.x | Formulaires |
| **Zod** | 3.x | Validation |

### Backend (Supabase)

| Service | Usage |
|---------|-------|
| **PostgreSQL** | Base de données |
| **Auth** | Authentification JWT |
| **Storage** | Stockage fichiers |
| **Edge Functions** | Logique serveur (Deno) |
| **Realtime** | WebSocket (optionnel) |

### IA

| Service | Modèle | Usage |
|---------|--------|-------|
| **Google AI** | Gemini 3 Pro Image Preview | Génération d'images |
| **Google AI** | Gemini 2.5 Flash | Chat créatif (texte) |

---

## 2. Architecture Applicative

### Structure des dossiers

```
dica-decorator/
├── docs/                       # Documentation
├── public/
│   └── images/                 # Assets statiques
├── src/
│   ├── components/
│   │   ├── ui/                 # Composants shadcn
│   │   └── ProtectedRoute.tsx  # HOC authentification
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Contexte auth global
│   │   └── ThemeContext.tsx    # Contexte thème (mode nuit)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Client Supabase
│   │       └── types.ts        # Types générés
│   ├── lib/
│   │   └── supabase.ts         # Services auth
│   ├── pages/
│   │   ├── Index.tsx           # Landing page
│   │   ├── Auth.tsx            # Authentification
│   │   ├── Dashboard.tsx       # Tableau de bord
│   │   ├── NewProject.tsx      # Création projet
│   │   ├── ProjectDetail.tsx   # Détail projet
│   │   ├── Creative.tsx        # Assistant IA
│   │   └── Admin.tsx           # Administration
│   ├── services/               # Services TDD
│   │   ├── __tests__/          # Tests unitaires
│   │   ├── image-storage.service.ts
│   │   ├── rate-limiter.service.ts
│   │   ├── url-validator.service.ts
│   │   ├── auth-guard.service.ts
│   │   ├── organization.service.ts
│   │   ├── quota.service.ts
│   │   └── index.ts
│   ├── test/                   # Configuration tests
│   │   ├── setup.ts
│   │   ├── test-utils.tsx
│   │   └── mocks/
│   ├── App.tsx                 # Point d'entrée React
│   ├── main.tsx                # Bootstrap
│   └── index.css               # Styles globaux
├── supabase/
│   ├── functions/
│   │   ├── apply-decor/        # Génération rendus
│   │   └── creative-chat/      # Chat IA
│   └── migrations/             # Migrations SQL
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│  │  React  │────▶│ Services│────▶│Supabase │              │
│  │  Pages  │◀────│   TDD   │◀────│ Client  │              │
│  └─────────┘     └─────────┘     └─────────┘              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│  │  Auth   │     │   DB    │     │ Storage │              │
│  │  (JWT)  │     │ (Postgres)    │ (S3)    │              │
│  └─────────┘     └─────────┘     └─────────┘              │
│        │               │               │                    │
│        └───────────────┼───────────────┘                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Edge Functions (Deno)                   │   │
│  │  ┌───────────────┐    ┌───────────────┐             │   │
│  │  │  apply-decor  │    │ creative-chat │             │   │
│  │  └───────┬───────┘    └───────┬───────┘             │   │
│  └──────────┼────────────────────┼─────────────────────┘   │
└─────────────┼────────────────────┼─────────────────────────┘
              │                    │
              ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google AI (Gemini)                        │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │ Image Generation    │    │ Text Generation     │        │
│  │ (Gemini 2.5 Pro)    │    │ (Gemini 2.5 Flash)  │        │
│  └─────────────────────┘    └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Schéma de Base de Données

### Diagramme ERD

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │     │   user_roles    │     │    profiles     │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │◀───▶│ user_id (FK)    │     │ id (FK→users)   │
│ email           │     │ role            │◀───▶│ first_name      │
│ ...             │     │ created_at      │     │ last_name       │
└────────┬────────┘     └─────────────────┘     │ is_active       │
         │                                       │ created_at      │
         │ 1:1                                   └─────────────────┘
         ▼
┌─────────────────┐
│   user_quotas   │  (Nouveau)
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ quota_limit     │
│ quota_used      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    projects     │     │  project_photos │
│─────────────────│     │─────────────────│
│ id (PK)         │◀───▶│ project_id (FK) │
│ user_id (FK)    │     │ original_url    │
│ title           │     │ created_at      │
│ use_case        │     └────────┬────────┘
│ client_ref      │              │
└─────────────────┘              │ 1:N
                                 ▼
┌─────────────────┐     ┌─────────────────┐
│     decors      │     │ render_results  │
│─────────────────│     │─────────────────│
│ id (PK)         │◀───▶│ decor_id (FK)   │
│ name            │     │ photo_id (FK)   │
│ reference_code  │     │ result_url      │
│ category        │     │ created_at      │
│ texture_url     │     └─────────────────┘
│ is_active       │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  organizations  │     │ org_members     │
│─────────────────│     │─────────────────│
│ id (PK)         │◀───▶│ org_id (FK)     │
│ name            │     │ user_id (FK)    │
│ slug            │     │ role            │
│ tier            │     │ joined_at       │
│ quota           │     └─────────────────┘
│ used_this_month │
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐
│  render_usage   │
│─────────────────│
│ org_id (FK)     │
│ user_id (FK)    │
│ render_count    │
│ month           │
└─────────────────┘
```

### Tables principales

#### `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  use_case usage_context NOT NULL,
  client_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `profiles` (Nouveau)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `user_quotas` (Nouveau)
```sql
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_limit INTEGER NOT NULL DEFAULT 50,
  quota_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `decors`
```sql
CREATE TABLE decors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  usage_contexts TEXT[] DEFAULT '{}',
  texture_image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `render_results`
```sql
CREATE TABLE render_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_photo_id UUID NOT NULL REFERENCES project_photos(id),
  decor_id UUID REFERENCES decors(id),
  result_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Enums

```sql
-- Rôles application
CREATE TYPE app_role AS ENUM ('admin', 'client');

-- Contextes d'usage
CREATE TYPE usage_context AS ENUM ('ascenseur', 'van', 'terrasse', 'autre');

-- Tiers abonnement
CREATE TYPE subscription_tier AS ENUM ('starter', 'pro', 'enterprise');

-- Rôles organisation
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');
```

---

## 4. Services Métier (TDD)

### Vue d'ensemble

Tous les services sont développés en TDD strict avec 209 tests unitaires.

```
src/services/
├── image-storage.service.ts    (29 tests)
├── rate-limiter.service.ts     (30 tests)
├── url-validator.service.ts    (71 tests)
├── auth-guard.service.ts       (31 tests)
├── organization.service.ts     (27 tests)
└── quota.service.ts            (21 tests)
```

### ImageStorageService

**Responsabilité :** Migration base64 → Supabase Storage

```typescript
interface ImageStorageService {
  // Upload base64 vers Storage
  uploadBase64Image(options: ImageUploadOptions): Promise<ImageUploadResult>;
  
  // Parse data URL
  parseBase64DataUrl(dataUrl: string): ParsedDataUrl;
  
  // Conversion base64 → Blob
  base64ToBlob(base64: string, mimeType: string): Blob;
  
  // Génération chemin unique
  generateStoragePath(userId: string, photoId: string, ext: string): string;
  
  // Validation format
  validateImageFormat(mimeType: string): void;
  
  // Suppression
  deleteImage(path: string, bucket: string): Promise<DeleteResult>;
  
  // Migration existant
  migrateBase64ToStorage(renderResult, userId): Promise<MigrationResult>;
}
```

### RateLimiterService

**Responsabilité :** Limites quotidiennes et mensuelles

```typescript
interface RateLimiterService {
  // Vérifier limite utilisateur (50/jour)
  checkUserDailyLimit(userId: string): Promise<RateLimitCheckResult>;
  
  // Vérifier limite organisation (mensuelle)
  checkOrganizationMonthlyLimit(orgId: string): Promise<RateLimitCheckResult>;
  
  // Vérification combinée
  checkRateLimits(userId: string, orgId?: string): Promise<CombinedResult>;
  
  // Enregistrer usage
  recordUsage(userId: string, orgId: string, count: number): Promise<void>;
  
  // Appliquer limites (throw si dépassé)
  enforceRateLimits(userId: string, orgId?: string): Promise<void>;
}
```

### UrlValidatorService

**Responsabilité :** Protection anti-SSRF

```typescript
interface UrlValidatorService {
  // Validation complète
  validateUrl(url: string): UrlValidationResult;
  
  // Détection IP privée
  isPrivateIp(ip: string): boolean;
  
  // Match domaine wildcard
  matchesWildcardDomain(hostname: string, pattern: string): boolean;
  
  // Normalisation IP (decimal, hex, octal)
  normalizeIp(input: string): string;
  
  // Décodage URL safe
  decodeUrlSafe(input: string): string;
}
```

**Protections :**
- Localhost / Loopback (127.x.x.x)
- IPs privées (10.x, 172.16-31.x, 192.168.x)
- Metadata cloud (169.254.169.254)
- Protocoles dangereux (file://, gopher://)
- Encodage bypass (URL encoding, decimal IP)

### AuthGuardService

**Responsabilité :** Validation serveur rôles et permissions

```typescript
interface AuthGuardService {
  // Valider session JWT
  validateSession(token: string): Promise<UserContext>;
  
  // Obtenir rôle (avec cache)
  getUserRole(userId: string): Promise<string>;
  
  // Exiger rôle spécifique
  requireRole(userId: string, role: string): Promise<void>;
  
  // Vérifier propriété projet
  checkProjectOwnership(userId, projectId, options): Promise<boolean>;
  
  // Exiger accès projet
  requireProjectAccess(userId: string, projectId: string): Promise<void>;
  
  // Vérifier membership organisation
  checkOrganizationMembership(userId, orgId): Promise<OrganizationMembership>;
  
  // Nettoyer cache
  clearCache(userId?: string): void;
}
```

### OrganizationService

**Responsabilité :** Gestion multi-tenant

```typescript
interface OrganizationService {
  // CRUD organisations
  createOrganization(input, creatorId): Promise<Organization>;
  getOrganization(id: string): Promise<Organization>;
  getOrganizationBySlug(slug: string): Promise<Organization>;
  updateOrganization(id, updates, options): Promise<Organization>;
  
  // Gestion membres
  inviteMember(orgId, email, role): Promise<Invitation>;
  acceptInvitation(invitationId, userId): Promise<Member>;
  getMembers(orgId, options): Promise<Member[]>;
  removeMember(orgId, userId): Promise<void>;
  
  // Abonnement
  updateSubscription(orgId, tier): Promise<Organization>;
  
  // Utilisateur
  getUserOrganizations(userId): Promise<OrgWithRole[]>;
  
  // Utilitaire
  generateSlug(name: string): string;
}
```

### QuotaService

**Responsabilité :** Gestion quotas revendeurs

```typescript
interface QuotaService {
  // Statut quota
  getQuotaStatus(orgId: string): Promise<QuotaStatus>;
  
  // Vérification
  checkQuota(orgId: string, count?: number): Promise<boolean>;
  
  // Application (throw si dépassé)
  enforceQuota(orgId: string, count?: number): Promise<void>;
  
  // Incrémenter usage
  incrementUsage(orgId, userId, count): Promise<void>;
  
  // Rapport détaillé
  getUsageReport(orgId: string): Promise<UsageReport>;
  
  // Mise à jour tier
  upgradeQuota(orgId: string, tier: SubscriptionTier): Promise<Organization>;
  
  // Utilitaire
  getNextResetDate(): Date;
}
```

---

## 5. Edge Functions

### apply-decor

**Endpoint :** `POST /functions/v1/apply-decor`

**Payload :**
```typescript
{
  photoUrl: string;        // URL photo originale
  textureUrl: string;      // URL texture décor
  photoId: string;         // ID photo en base
  decorId: string;         // ID décor
  useCase: string;         // ascenseur|van|terrasse|autre
  renderCount: number;     // 1-2 (limité pour ressources)
  format: string;          // square|portrait|landscape
  showReferences: boolean; // Afficher références DICA sur l'image
}
```

**Limites de ressources :**

| Paramètre | Limite | Raison |
|-----------|--------|--------|
| renderCount | Max 2 | Éviter WORKER_LIMIT error |
| Image size | Max 2 MB | Optimisation mémoire |
| Timeout | 30s | Éviter timeouts |

**Réponse :**
```typescript
{
  success: boolean;
  resultUrls: string[];  // Data URLs base64
}
```

**Logique de prompt :**

Le prompt est structuré en 3 couches :

1. **Layer 1 - Intention globale** : Mode PROJECT strict (retouche photo, pas génération)
2. **Layer 2 - Règles contextuelles** : Surfaces autorisées/interdites selon use_case
3. **Layer 3 - Directive qualité** : Préservation perspective, ombres, géométrie

```
MODE: PROJECT
├── Préserver : cadrage, géométrie, éclairage
├── Modifier : surfaces autorisées uniquement
└── Résultat : photoréaliste, crédible artisan

CONTEXTE: [ascenseur|van|terrasse|autre]
├── Surfaces autorisées : [liste]
└── Surfaces interdites : [liste]

MATÉRIAU: [metal|unis|marbre|bois|deco]
└── Propriétés visuelles à respecter
```

### creative-chat

**Endpoint :** `POST /functions/v1/creative-chat`

**Payload :**
```typescript
{
  messages: Message[];       // Historique conversation
  decorContext: string;      // Catalogue décors formaté
  sourceImageUrls?: string[];// URLs images sources (max 5)
  imageLabels?: string[];    // Étiquettes pour chaque image
  showReferences: boolean;   // Afficher références DICA
}
```

**Fonctionnalités :**
- **Multi-images** : Combinez jusqu'à 5 images (décors, espaces, personnes)
- **Annotations** : Références DICA automatiques sur les images
- **Streaming** : Réponses texte en temps réel
- **Génération** : Images haute qualité via Gemini 3 Pro

**Réponse (streaming) :**
```
data: {"choices":[{"delta":{"content":"..."}}]}
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

**Réponse (image) :**
```typescript
{
  type: "image";
  text: string;     // Message accompagnement
  imageUrl: string; // Data URL base64
}
```

### get-users-admin (Nouveau)

**Endpoint :** `GET /functions/v1/get-users-admin`

**Description :** Récupère la liste complète des utilisateurs avec leurs données (admin only).

**Sécurité :**
- Requiert authentification avec token JWT
- Vérifie le rôle `admin` dans `user_roles`
- Utilise `SUPABASE_SERVICE_ROLE_KEY` pour accéder à `auth.users`

**Réponse :**
```typescript
{
  users: Array<{
    id: string;           // UUID utilisateur
    email: string;        // Email
    first_name: string;   // Prénom (profiles)
    last_name: string;    // Nom (profiles)
    is_active: boolean;   // Statut actif (profiles)
    created_at: string;   // Date inscription
    quota_limit: number;  // Limite rendus (user_quotas)
    quota_used: number;   // Rendus utilisés (user_quotas)
    project_count: number;// Nombre de projets
  }>
}
```

**Codes d'erreur :**

| Code | Message | Cause |
|------|---------|-------|
| 401 | "Unauthorized" | Token manquant ou invalide |
| 403 | "Forbidden: Admin access required" | Utilisateur non admin |
| 500 | "Error" | Erreur serveur |

---

## 6. Sécurité

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec policies optimisées :

```sql
-- Exemple : projects
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their projects"
  ON projects FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their projects"
  ON projects FOR DELETE
  USING (user_id = (SELECT auth.uid()));
```

**Optimisation :** Utilisation de `(SELECT auth.uid())` au lieu de `auth.uid()` pour éviter la réévaluation par ligne.

### Protection SSRF

Le `UrlValidatorService` bloque :

| Vecteur | Protection |
|---------|------------|
| Localhost | `127.x.x.x`, `localhost` |
| IPs privées | RFC 1918 ranges |
| Cloud metadata | `169.254.169.254` |
| Protocoles | `file://`, `gopher://`, etc. |
| Encodage | URL encoding, decimal IP, octal |
| DNS rebinding | Validation hostname strict |

### Validation entrées

- **Zod** pour validation frontend
- **Services TDD** pour validation backend
- **Sanitization** des données utilisateur

### Authentification

- JWT via Supabase Auth
- Refresh tokens automatiques
- Session localStorage
- Expiration configurable

---

## 7. Tests

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

### Commandes

```bash
# Lancer tous les tests
npm run test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage

# Un fichier spécifique
npm run test:run -- src/services/__tests__/quota.service.test.ts
```

### Mocks

```typescript
// Exemple mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {...}, error: null }),
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: {...} } }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: '...' } }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '...' } }),
    }),
  },
};
```

---

## 8. Performance

### Optimisations frontend

- **React Query** : Cache intelligent, déduplication requêtes
- **Lazy loading** : Composants chargés à la demande
- **Image optimization** : Formats modernes, compression

### Optimisations backend

- **Indexes** : Sur toutes les clés étrangères
- **RLS optimisé** : `(SELECT auth.uid())` pattern
- **Edge caching** : Réponses CDN

### Indexes recommandés

```sql
-- Déjà créés dans les migrations
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_render_usage_org_id ON render_usage(organization_id);
CREATE INDEX idx_render_usage_user_id ON render_usage(user_id);
CREATE INDEX idx_render_usage_month ON render_usage(month);
```

### Monitoring

- **Supabase Dashboard** : Métriques en temps réel
- **Edge Functions Logs** : Traces détaillées
- **Coverage Reports** : Qualité code

---

© 2024 DICA France - Développé par KOREV AI

