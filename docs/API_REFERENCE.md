# 📡 API Reference DICA Decorator

**Documentation des Endpoints et Interfaces**

---

## Table des Matières

1. [Authentification](#1-authentification)
2. [Projets](#2-projets)
3. [Photos](#3-photos)
4. [Décors](#4-décors)
5. [Rendus](#5-rendus)
6. [Edge Functions](#6-edge-functions)
7. [Organisations](#7-organisations)
8. [Types TypeScript](#8-types-typescript)

---

## Vue d'ensemble

### Base URL

```
Production : https://[project-ref].supabase.co
```

### Authentification

Toutes les requêtes nécessitent un header `Authorization` :

```http
Authorization: Bearer <access_token>
```

Le token est obtenu via Supabase Auth lors de la connexion.

### Headers communs

```http
Content-Type: application/json
apikey: <supabase_anon_key>
Authorization: Bearer <access_token>
```

---

## 1. Authentification

### Inscription

```typescript
// Client Supabase
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

**Réponse :**
```typescript
{
  user: {
    id: 'uuid',
    email: 'user@example.com',
    created_at: '2024-01-15T10:00:00Z',
    // ...
  },
  session: {
    access_token: 'eyJ...',
    refresh_token: '...',
    expires_in: 3600,
    // ...
  }
}
```

### Connexion

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### Déconnexion

```typescript
const { error } = await supabase.auth.signOut();
```

### Récupérer la session

```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Écouter les changements d'auth

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | ...
});
```

---

## 2. Projets

### Lister les projets

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Réponse :**
```typescript
[
  {
    id: 'uuid',
    user_id: 'uuid',
    title: 'Ascenseur Haussmann',
    use_case: 'ascenseur',
    client_reference: 'CMD-2024-001',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
]
```

### Créer un projet

```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    user_id: userId,
    title: 'Mon Projet',
    use_case: 'ascenseur',  // 'ascenseur' | 'van' | 'terrasse' | 'autre'
    client_reference: 'REF-001'  // optionnel
  })
  .select()
  .single();
```

### Récupérer un projet

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('user_id', userId)
  .single();
```

### Supprimer un projet

```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);
```

---

## 3. Photos

### Uploader une photo

```typescript
// 1. Upload vers Storage
const fileName = `${userId}/${Date.now()}.${extension}`;
const { error: uploadError } = await supabase.storage
  .from('project-photos')
  .upload(fileName, file);

// 2. Obtenir l'URL publique
const { data: { publicUrl } } = supabase.storage
  .from('project-photos')
  .getPublicUrl(fileName);

// 3. Enregistrer en base
const { data, error } = await supabase
  .from('project_photos')
  .insert({
    project_id: projectId,
    original_image_url: publicUrl
  })
  .select()
  .single();
```

### Lister les photos d'un projet

```typescript
const { data, error } = await supabase
  .from('project_photos')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

**Réponse :**
```typescript
[
  {
    id: 'uuid',
    project_id: 'uuid',
    original_image_url: 'https://...supabase.co/storage/v1/object/public/...',
    created_at: '2024-01-15T10:00:00Z'
  }
]
```

### Supprimer une photo

```typescript
// Supprimer d'abord les rendus associés
await supabase
  .from('render_results')
  .delete()
  .eq('project_photo_id', photoId);

// Puis la photo
const { error } = await supabase
  .from('project_photos')
  .delete()
  .eq('id', photoId);
```

---

## 4. Décors

### Lister les décors actifs

```typescript
const { data, error } = await supabase
  .from('decors')
  .select('*')
  .eq('is_active', true)
  .order('name');
```

**Réponse :**
```typescript
[
  {
    id: 'uuid',
    name: 'Inox Brossé Premium',
    reference_code: 'DIC-A23',
    category: 'metal',
    usage_contexts: ['ascenseur', 'van'],
    texture_image_url: '/textures/inox-brosse.jpg',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
]
```

### Lister par catégorie

```typescript
const { data, error } = await supabase
  .from('decors')
  .select('*')
  .eq('is_active', true)
  .eq('category', 'metal')
  .order('name');
```

### Créer un décor (admin)

```typescript
const { data, error } = await supabase
  .from('decors')
  .insert({
    name: 'Nouveau Décor',
    reference_code: 'DIC-NEW',
    category: 'metal',
    usage_contexts: ['ascenseur', 'van', 'terrasse'],
    texture_image_url: '/textures/nouveau.jpg',
    is_active: true
  })
  .select()
  .single();
```

### Mettre à jour un décor (admin)

```typescript
const { data, error } = await supabase
  .from('decors')
  .update({
    name: 'Nom Mis à Jour',
    is_active: false
  })
  .eq('id', decorId)
  .select()
  .single();
```

---

## 5. Rendus

### Lister les rendus d'une photo

```typescript
const { data, error } = await supabase
  .from('render_results')
  .select('*')
  .eq('project_photo_id', photoId)
  .order('created_at', { ascending: false });
```

**Réponse :**
```typescript
[
  {
    id: 'uuid',
    project_photo_id: 'uuid',
    decor_id: 'uuid',
    result_image_url: 'data:image/png;base64,...',
    created_at: '2024-01-15T10:00:00Z'
  }
]
```

### Supprimer un rendu

```typescript
const { error } = await supabase
  .from('render_results')
  .delete()
  .eq('id', renderId);
```

### Favoris rendus

```typescript
// Ajouter aux favoris
const { error } = await supabase
  .from('render_favorites')
  .insert({
    user_id: userId,
    render_result_id: renderId
  });

// Retirer des favoris
const { error } = await supabase
  .from('render_favorites')
  .delete()
  .eq('user_id', userId)
  .eq('render_result_id', renderId);

// Lister les favoris
const { data } = await supabase
  .from('render_favorites')
  .select('render_result_id')
  .eq('user_id', userId);
```

---

## 6. Edge Functions

### apply-decor

**Endpoint :** `POST /functions/v1/apply-decor`

**Description :** Génère un ou plusieurs rendus en appliquant un décor DICA sur une photo.

**Request :**
```typescript
interface ApplyDecorRequest {
  photoUrl: string;      // URL de la photo originale
  textureUrl: string;    // URL de la texture du décor
  photoId: string;       // UUID de la photo en base
  decorId: string;       // UUID du décor
  useCase: 'ascenseur' | 'van' | 'terrasse' | 'autre';
  renderCount?: number;  // 1-4, défaut: 1
  format?: 'square' | 'portrait' | 'landscape';  // défaut: 'square'
}
```

**Response (success) :**
```typescript
{
  success: true,
  resultUrls: string[]  // Array de data URLs base64
}
```

**Response (error) :**
```typescript
{
  error: string  // Message d'erreur
}
```

**Exemple d'appel :**
```typescript
const { data, error } = await supabase.functions.invoke('apply-decor', {
  body: {
    photoUrl: 'https://...supabase.co/storage/.../photo.jpg',
    textureUrl: '/textures/inox-brosse.jpg',
    photoId: 'uuid-photo',
    decorId: 'uuid-decor',
    useCase: 'ascenseur',
    renderCount: 2,
    format: 'square'
  }
});
```

**Codes d'erreur :**

| Code | Message | Cause |
|------|---------|-------|
| 400 | "Paramètres manquants" | Champs requis absents |
| 404 | "Décor introuvable" | decorId invalide |
| 429 | "Quota d'API dépassé" | Limite Google AI |
| 500 | "Erreur de génération" | Erreur Gemini |

---

### creative-chat

**Endpoint :** `POST /functions/v1/creative-chat`

**Description :** Chat IA créatif avec génération optionnelle d'images.

**Request :**
```typescript
interface CreativeChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    imageUrl?: string;
  }>;
  decorContext: string;       // Catalogue formaté des décors
  sourceImageUrl?: string;    // Image source optionnelle
}
```

**Response (texte) - Streaming SSE :**
```
data: {"choices":[{"delta":{"content":"Voici"}}]}
data: {"choices":[{"delta":{"content":" ma"}}]}
data: {"choices":[{"delta":{"content":" réponse"}}]}
data: [DONE]
```

**Response (image) - JSON :**
```typescript
{
  type: 'image',
  text: string,      // Message d'accompagnement
  imageUrl: string   // Data URL base64 de l'image générée
}
```

**Exemple d'appel :**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/creative-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Crée un mood board marbre' }],
    decorContext: buildDecorContext(),
    sourceImageUrl: undefined
  })
});

// Streaming
const reader = response.body.getReader();
// ...
```

---

## 7. Organisations

### Lister les organisations de l'utilisateur

```typescript
const { data, error } = await supabase
  .from('organization_members')
  .select(`
    role,
    organization:organizations(*)
  `)
  .eq('user_id', userId);
```

### Créer une organisation

```typescript
const { data, error } = await supabase
  .from('organizations')
  .insert({
    name: 'Mon Organisation',
    slug: 'mon-organisation',
    primary_color: '#E94E5D',
    subscription_tier: 'starter',
    monthly_render_quota: 100
  })
  .select()
  .single();

// Ajouter le créateur comme owner
await supabase
  .from('organization_members')
  .insert({
    organization_id: data.id,
    user_id: userId,
    role: 'owner'
  });
```

### Inviter un membre

```typescript
const token = crypto.randomUUID();
const { data, error } = await supabase
  .from('organization_invitations')
  .insert({
    organization_id: orgId,
    email: 'invite@example.com',
    role: 'member',
    token: token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();
```

### Accepter une invitation

```typescript
// 1. Trouver l'invitation
const { data: invitation } = await supabase
  .from('organization_invitations')
  .select('*')
  .eq('token', token)
  .single();

// 2. Créer le membership
await supabase
  .from('organization_members')
  .insert({
    organization_id: invitation.organization_id,
    user_id: userId,
    role: invitation.role
  });

// 3. Supprimer l'invitation
await supabase
  .from('organization_invitations')
  .delete()
  .eq('id', invitation.id);
```

---

## 8. Types TypeScript

### Types principaux

```typescript
// Énumérations
type AppRole = 'admin' | 'client';
type UsageContext = 'ascenseur' | 'van' | 'terrasse' | 'autre';
type SubscriptionTier = 'starter' | 'pro' | 'enterprise';
type OrganizationRole = 'owner' | 'admin' | 'member';

// Entités
interface Project {
  id: string;
  user_id: string;
  title: string;
  use_case: UsageContext;
  client_reference: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectPhoto {
  id: string;
  project_id: string;
  original_image_url: string;
  created_at: string;
}

interface Decor {
  id: string;
  name: string;
  reference_code: string;
  category: string;
  usage_contexts: string[];
  texture_image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RenderResult {
  id: string;
  project_photo_id: string;
  decor_id: string | null;
  result_image_url: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  subscription_tier: SubscriptionTier;
  monthly_render_quota: number;
  renders_used_this_month: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
  created_at: string;
}
```

### Types des services

```typescript
// Rate Limiter
interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

// URL Validator
interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

// Auth Guard
interface UserContext {
  userId: string;
  email: string;
  role: AppRole;
  organizationId?: string;
}

// Organization
interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logoUrl?: string;
  primaryColor?: string;
}

// Quota
interface QuotaStatus {
  organizationId: string;
  tier: SubscriptionTier;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetDate: Date;
}

interface UsageReport {
  organizationId: string;
  period: { start: Date; end: Date };
  totalRenders: number;
  rendersByUser: Array<{
    userId: string;
    email: string;
    count: number;
  }>;
  rendersByDay: Array<{
    date: string;
    count: number;
  }>;
}
```

---

## Codes d'erreur HTTP

| Code | Signification | Action recommandée |
|------|---------------|-------------------|
| 200 | Succès | - |
| 201 | Créé | - |
| 400 | Requête invalide | Vérifier les paramètres |
| 401 | Non authentifié | Se reconnecter |
| 403 | Accès interdit | Vérifier les permissions |
| 404 | Non trouvé | Vérifier l'ID |
| 409 | Conflit | Donnée dupliquée |
| 429 | Trop de requêtes | Attendre / quota |
| 500 | Erreur serveur | Contacter support |

---

## Rate Limits

| Ressource | Limite | Reset |
|-----------|--------|-------|
| API Supabase | 500 req/min | Par minute |
| Edge Functions | 1000 req/min | Par minute |
| Rendus utilisateur | 50/jour | Minuit UTC |
| Rendus organisation | Selon tier | 1er du mois |

---

© 2024 DICA France - Développé par KOREV AI

