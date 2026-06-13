# API Edge Functions — DICA Decorator

> Catalogue des Edge Functions Deno actives, basé sur le code source
> `supabase/functions/`. Pour l'historique des endpoints Supabase REST (tables,
> RPC), voir [`API_REFERENCE.md`](./API_REFERENCE.md).

| Champ | Valeur |
|---|---|
| Runtime | Deno (Supabase Edge Functions) |
| Nombre de fonctions | 5 |
| Dernière revue | 2026-06-13 |

---

## Table des matières

1. [Conventions communes](#1-conventions-communes)
2. [apply-decor](#2-apply-decor)
3. [creative-chat](#3-creative-chat)
4. [generate-magazine-captions](#4-generate-magazine-captions)
5. [get-analytics](#5-get-analytics)
6. [get-users-admin](#6-get-users-admin)
7. [Modules partagés](#7-modules-partagés)

---

## 1. Conventions communes

### URL d'appel

```text
POST https://<project-ref>.supabase.co/functions/v1/<function-name>
```

### Headers requis

| Header | Valeur |
|---|---|
| `Authorization` | `Bearer <JWT utilisateur>` |
| `Content-Type` | `application/json` |
| `apikey` | Clé anon Supabase (requis par le gateway Supabase) |

### CORS

Toutes les fonctions répondent aux requêtes `OPTIONS` avec :

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

### Authentification

Pattern commun :

1. Extraction du JWT depuis `Authorization`
2. Décodage du payload (vérif expiration)
3. Vérification utilisateur via `supabaseAdmin.auth.admin.getUserById(sub)`
4. Pour les fonctions admin : vérification `user_roles.role = 'admin'`

### Appel depuis le frontend

```typescript
const { data, error } = await supabase.functions.invoke('apply-decor', {
  body: { /* payload */ },
});
```

---

## 2. apply-decor

**Fichier** : `supabase/functions/apply-decor/index.ts`

**Rôle** : Génération de rendus — application d'un ou plusieurs décors DICA sur
une photographie via Google Gemini (`gemini-3-pro-image-preview`).

### Méthode — apply-decor

`POST`

### Body (JSON) — apply-decor

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `photoUrl` | string | Oui | URL de la photo source (Storage ou absolue) |
| `textureUrl` | string | Oui* | URL texture du décor (* sauf mode mu |
| `photoId` | string | Oui | ID `project_photos` |
| `decorId` | string | Oui | ID décor principal |
| `useCase` | string | Oui | `ascenseur`, `van`, `terrasse`, `autre` |
| `renderCount` | number | Non | Nombre de rendus (défaut 1, max 2) |
| `format` | string | Non | `square`, `portrait`, `landscape`, `original |
| `showReferences` | boolean | Non | Afficher références DICA (défaut `false`) |
| `originalWidth` | number | Non | Largeur originale photo |
| `originalHeight` | number | Non | Hauteur originale photo |
| `allDecors` | array | Non | Mode multi-décor ascenseur : `[{ id, textur |

### Limites internes

| Limite | Valeur |
|---|---|
| Taille image max | 12 Mo |
| Rendus max / requête | 2 |
| Timeout fetch | 30 s |

### Réponse succès (200) — apply-decor

```json
{
  "success": true,
  "resultUrls": ["https:///render-results/"]
}
```

Les rendus sont persistés dans `render_results` et uploadés dans le bucket
`render-results`.

### Réponses erreur — apply-decor

| Code | Condition |
|---|---|
| 401 | JWT absent, invalide ou expiré |
| 403 | Quota épuisé (`check_and_increment_quota` retourne false) |
| 500 | Erreur Gemini, upload ou traitement |

Message quota : `"Quota de rendus épuisé. Contactez votre administrateur."`

### Secrets utilisés — apply-decor

- `GOOGLE_AI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (auto)

---

## 3. creative-chat

**Fichiers** : `supabase/functions/creative-chat/index.ts`, `orchestrator.ts`

**Rôle** : Assistant créatif — chat texte streamé + génération d'image créative.
Contexte catalogue structuré (RAG).

### Méthode — creative-chat

`POST`

### Body (JSON) — creative-chat

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `messages` | array | Oui | Historique `{ role: "user" ou "assistant", |
| `sourceImageUrls` | string[] | Non | URLs images de référence |
| `imageLabels` | string[] | Non | Labels associés aux images |
| `showReferences` | boolean | Non | Afficher références DICA (défaut `false`) |
| `decorContext` | string | Non | Legacy — remplacé par chargement catalog |

### Comportement

1. Charge les catalogues actifs et décors associés depuis PostgreSQL
2. Si génération d'image demandée : orchestration via `orchestrator.ts`, puis
appel Gemini Image
3. Sinon : streaming texte via `gemini-2.5-flash` (SSE)

### Réponse — mode texte (streaming)

```text
Content-Type: text/event-stream
```

Format compatible OpenAI Chat Completions :

```text
data: {"choices":[{"delta":{"content":""}}]}

data: [DONE]
```

Post-traitement : détection des références inventées hors catalogue ;
avertissement ajouté en fin de stream si violation RAG.

### Réponse — mode image (JSON)

```json
{
  "imageUrl": "https://",
  "textResponse": "",
  "decorReferences": [{ "reference": "", "label": "" }]
}
```

(Structure observée dans les branches de réponse JSON du handler.)

### Réponses erreur — creative-chat

| Code | Condition |
|---|---|
| 401 | Non authentifié |
| 429 | Quota Google AI |
| 500 | Erreur service IA |

### Modèles

| Usage | Modèle |
|---|---|
| Texte streaming | `gemini-2.5-flash` |
| Génération image | `gemini-3-pro-image-preview` |
| Orchestration | `gemini-2.5-flash` (via AI Gateway) |

### Secrets utilisés — creative-chat

- `GOOGLE_AI_API_KEY`
- `AI_GATEWAY_API_KEY` / `AI_GATEWAY_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (auto)

---

## 4. generate-magazine-captions

**Fichier** : `supabase/functions/generate-magazine-captions/index.ts`

**Rôle** : Génération des textes éditoriaux du Magazine DÉCO (headline,
légendes, article).

### Méthode — generate-magazine-captions

`POST`

### Body (JSON) — generate-magazine-captions

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `projectName` | string | Oui | Nom du projet |
| `projectType` | string | Oui | Type de cas d'usage |
| `decorLabel` | string | Non | Nom du décor |
| `decorReference` | string | Non | Code référence décor |
| `decorCategory` | string | Non | Catégorie décor |
| `imageUrl` | string | Non | URL image pour analyse contextuelle |

### Réponse succès (200) — generate-magazine-captions

```json
{
  "headline": "",
  "subheadline": "",
  "slugline": "",
  "caption": "",
  "article": ""
}
```

### Réponses erreur — generate-magazine-captions

| Code | Condition |
|---|---|
| 401 | Non authentifié |
| 400 | `projectName` ou `projectType` manquant |
| 500 | Erreur génération |

### Secrets utilisés — generate-magazine-captions

- `AI_GATEWAY_API_KEY` / `AI_GATEWAY_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (auto)

Consommé par `src/services/magazine-deco-pdf.service.ts`.

---

## 5. get-analytics

**Fichier** : `supabase/functions/get-analytics/index.ts`

**Rôle** : Agrégation de métriques produit pour le dashboard admin
(`/admin/analytics`).

### Accès — get-analytics

**Admin uniquement** — vérifie `user_roles.role = 'admin'`.

### Méthode — get-analytics

`POST`

### Body (JSON) — get-analytics

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `period` | string | Non | `7d`, `30d` (défaut), `90d`, `year` |

### Réponse succès (200) — get-analytics

```json
{
  "metrics": {
    "totalProjects": 0,
    "totalRenders": 0,
    "totalUsers": 0,
    "activeUsers": 0,
    "totalDecors": 0,
    "avgRendersPerProject": 0,
    "engagementRate": 0
  },
  "trends": {
    "renders": {
      "data": [{ "date": "", "value": 0 }],
      "direction": "up",
      "percentageChange": 0
    },
    "projects": { "data": [], "direction": "", "percentageChange": 0 },
    "users": { "data": [], "direction": "stable", "percentageChange": 0 }
  },
  "topDecors": [{ "id": "", "name": "", "code": "", "value": 0 }],
  "topUsers": [{ "id": "", "name": "", "value": 0 }],
  "usageData": [{ "name": "", "value": 0 }]
}
```

### Réponses erreur — get-analytics

| Code | Condition |
|---|---|
| 401 | Non authentifié |
| 403 | Rôle non admin |
| 500 | Erreur requête |

### Secrets utilisés — get-analytics

- `SUPABASE_SERVICE_ROLE_KEY` (auto)

---

## 6. get-users-admin

**Fichier** : `supabase/functions/get-users-admin/index.ts`

**Rôle** : Opérations d'administration utilisateurs depuis `/admin`.

### Accès — get-users-admin

**Admin uniquement**.

### Méthode — get-users-admin

`POST`

### Body (JSON) — get-users-admin

Le champ `action` détermine l'opération (défaut : `list_users`).

#### Action : `list_users` (défaut)

Pas de champs supplémentaires.

**Réponse (200)** :

```json
{
  "users": [{
    "id": "uuid",
    "email": "",
    "first_name": null,
    "last_name": null,
    "is_active": true,
    "cobranding_enabled": false,
    "created_at": "",
    "quota_limit": 50,
    "quota_used": 0,
    "project_count": 0,
    "role": "client"
  }]
}
```

#### Action : `confirm_user`

| Champ | Type | Obligatoire |
|---|---|---|
| `userId` | string | Oui |

Confirme l'email via `auth.admin.updateUserById({ email_confirm: true })`.

**Réponse** : `{ "success": true }`

#### Action : `delete_user`

| Champ | Type | Obligatoire |
|---|---|---|
| `userId` | string | Oui |

Supprime l'utilisateur via Auth Admin.

**Réponse** : `{ "success": true }`

#### Action : `toggle_active`

| Champ | Type | Obligatoire |
|---|---|---|
| `userId` | string | Oui |

Inverse `profiles.is_active`.

**Réponse** : `{ "success": true, "is_active": boolean }`

#### Action : `toggle_cobranding`

| Champ | Type | Obligatoire |
|---|---|---|
| `userId` | string | Oui |

Inverse `profiles.cobranding_enabled`.

**Réponse** : `{ "success": true, "cobranding_enabled": boolean }`

#### Action : `update_role`

| Champ | Type | Obligatoire |
|---|---|---|
| `userId` | string | Oui |
| `role` | string | Oui — `admin` ou `client` |

Met à jour `user_roles.role`. Impossible de retirer son propre rôle admin.

**Réponse** : `{ "success": true }`

### Réponses erreur — get-users-admin

| Code | Condition |
|---|---|
| 401 | Non authentifié |
| 403 | Non admin |
| 400 | Paramètres manquants ou auto-dégradation admin |
| 500 | Erreur Supabase |

---

## 7. Modules partagés

### `_shared/ssrf-guard.ts`

Garde anti-SSRF pour les fetch sortants des Edge Functions :

- Whitelist suffixes (`supabase.co`, `supabase.in`, )
- Blocage IPs privées RFC1918
- Blocage métadonnées cloud

Tests : `_shared/__tests__/ssrf-guard.test.ts`

### `_shared/logger.ts`

Logger structuré conditionnel. Helper `getErrorMessage()`.

Tests : `_shared/__tests__/logger.test.ts`

---

## Documents connexes

| Document | Contenu |
|---|---|
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Endpoints Supabase REST h |
| [`DICA_ORCHESTRATOR_GUIDE.md`](./DICA_ORCHESTRATOR_GUIDE.md) | Orchestrateur `creative-chat/orchestrator.ts` |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Flux IA et sécurité |
| [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) | Déploiement des fonctions |

---

© DICA France — base logicielle développée par KOREV AI.
