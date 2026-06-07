# Audit des dépendances — DICA Decorator

**Référence** : DICA-DEC-AUD-DEP-2026
**Date** : 06/05/2026
**Périmètre** : `package.json` (frontend) + `supabase/functions/*` (Edge Functions Deno)
**Objet** : Justifier la composition du graphe de dépendances dans le cadre de l'évaluation technique de l'actif logiciel KOREV AI / DICA France.

---

## 1. Synthèse

| Catégorie | Nombre | Décision |
|-----------|--------|----------|
| Dépendances runtime frontend | 30 (post-nettoyage) | Conservées — toutes activement utilisées |
| Dépendances dev frontend | 25 | Conservées — chaîne de build / test / lint |
| Dépendance retirée | 1 (plugin Vite de tagging) | Supprimée — outillage éditeur de générateur externe, dev-only, sans impact runtime |
| Dépendances suspectes (`@lovable.dev/cloud-auth-js`) | 0 | **Aucune trace dans `package.json` ni dans le lockfile** (vérifié) |
| Edge Functions — runtime tiers | Deno std + `npm:@supabase/supabase-js` | Conservés — runtime Supabase officiel |

**Verdict** : aucune dépendance technique à un générateur no-code/low-code n'est requise pour le fonctionnement de l'application après nettoyage.

---

## 2. Dépendance retirée — plugin Vite de tagging

### 2.1 Contexte

| Élément | Valeur |
|---------|--------|
| Présence avant nettoyage | `package.json` (dépendance runtime déclarée) + `vite.config.ts` (plugin dev-only) |
| Type effectif | Plugin Vite chargé **uniquement en mode `development`** (`mode === 'development'`) |
| Rôle | Annotation des composants React avec leur source pour faciliter la sélection visuelle dans l'éditeur visuel d'origine. Aucun apport fonctionnel à l'application elle-même. |
| Impact production | Aucun — non bundlé en production |
| Impact tests | Aucun — non utilisé par Vitest |

### 2.2 Décision

**Suppression directe** :

1. Retrait de la déclaration du plugin de tagging dans `package.json`.
2. Retrait de l'import du plugin de tagging et de l'appel conditionnel `mode === 'development' && componentTagger()` dans `vite.config.ts`.
3. Régénération du `package-lock.json` (`npm install`).
4. Vérification : `npm run build` réussit (3.86s, 0 erreur).

### 2.3 Risque post-suppression

Aucun risque fonctionnel. La perte concerne uniquement la productivité éventuelle dans l'éditeur visuel d'origine, qui n'est pas l'environnement de développement cible de l'actif livré (l'actif est destiné à être maintenu en IDE classique — VSCode, JetBrains).

---

## 3. Dépendance prétendument suspecte — `@lovable.dev/cloud-auth-js`

### 3.1 Vérification

```bash
$ rg -i "cloud-auth-js" --glob '!node_modules'
# (aucun résultat)
```

Recherche également dans `package.json`, `package-lock.json`, `bun.lockb` (binaire) et code source : **aucune trace**.

### 3.2 Conclusion

Cette dépendance n'est **pas présente** dans le projet. L'authentification est intégralement assurée par `@supabase/supabase-js` (Supabase Auth, JWT) — voir `src/integrations/supabase/client.ts` et toutes les Edge Functions.

---

## 4. Passerelle AI — abstraction de la dépendance externe

### 4.1 Contexte

Le projet utilise une passerelle HTTP **compatible OpenAI Chat Completions** pour invoquer le modèle texte d'orchestration (`google/gemini-2.5-flash`) et le modèle d'analyse d'image éditoriale (`google/gemini-2.5-pro`) :

| Edge Function | Endpoint résolu | Variable d'environnement |
|---------------|-----------------|--------------------------|
| `creative-chat` (orchestrateur) | `AI_GATEWAY_URL` ou fallback historique | `AI_GATEWAY_API_KEY` (fallback : `LOVABLE_API_KEY`) |
| `generate-magazine-captions` | `AI_GATEWAY_URL` ou fallback historique | `AI_GATEWAY_API_KEY` (fallback : `LOVABLE_API_KEY`) |
| `creative-chat` (image) | `https://generativelanguage.googleapis.com/v1beta/models` (direct Google AI) | `GOOGLE_AI_API_KEY` |

### 4.2 Justification du maintien

La passerelle AI Gateway sert exclusivement de **proxy HTTP standard OpenAI Chat Completions** vers le modèle Gemini Flash/Pro. Le code applicatif ne dépend que d'un contrat d'API public (chat completions + tool calls), pas d'un SDK propriétaire.

### 4.3 Stratégie de remplacement / portabilité

Le code est volontairement abstrait derrière `fetch()` standard, sans SDK propriétaire. Le remplacement par un autre fournisseur compatible est trivial — il suffit de changer la valeur des variables d'environnement :

| Cible | URL | Compatibilité |
|-------|-----|---------------|
| Google AI Studio (direct) | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Native depuis 2024 |
| Vertex AI (GCP) | `https://{REGION}-aiplatform.googleapis.com/v1/...` (mode OpenAI) | Native |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | Native |
| Passerelle interne | URL custom | Selon implémentation |

**Effort de migration estimé** : 0,5 j/h (changement de variables d'environnement + revérification des `tool_calls`). Aucun changement de code applicatif n'est requis.

### 4.4 Variable historique `LOVABLE_API_KEY`

Conservée **uniquement comme fallback de rétrocompatibilité** pour ne pas casser une éventuelle infrastructure d'exploitation déjà provisionnée. Il est recommandé, dans tout nouveau déploiement, d'utiliser `AI_GATEWAY_API_KEY` et `AI_GATEWAY_URL`.

---

## 5. Inventaire conservé — Frontend (`package.json`)

### 5.1 Runtime (30)

| Package | Version | Rôle | Justification |
|---------|---------|------|---------------|
| `react`, `react-dom` | ^18.3.1 | Framework UI | Cœur de l'application |
| `react-router-dom` | ^6.30.1 | Routing SPA | 13 routes |
| `@tanstack/react-query` | ^5.83.0 | Cache serveur, état distant | Toutes les requêtes Supabase |
| `@supabase/supabase-js` | ^2.86.0 | Client Auth + DB + Storage | Backend |
| `@radix-ui/*` | (24 packages) | Primitives UI accessibles | Couche shadcn/ui |
| `class-variance-authority`, `clsx`, `tailwind-merge` | divers | Composition Tailwind | Patterns shadcn/ui |
| `lucide-react` | ^0.462.0 | Icônes | Toutes les icônes UI |
| `@hookform/resolvers`, `react-hook-form`, `zod` | divers | Formulaires + validation | Auth, projets, admin |
| `jspdf` | ^3.0.4 | Export PDF côté client | Magazine DÉCO + Brochure revendeur |
| `recharts` | ^2.15.4 | Graphiques | Dashboard analytics |
| `date-fns` | ^3.6.0 | Manipulation dates | Analytics, partages |
| `sonner` | ^1.7.4 | Toasts | Feedback utilisateur |
| `cmdk`, `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`, `react-resizable-panels`, `vaul`, `tailwindcss-animate` | divers | Composants UI shadcn | Interactions standards |

### 5.2 Dev (25)

Chaîne standard Vite + Vitest + ESLint + TypeScript + Tailwind. Aucune dépendance externe à un générateur no-code/low-code.

---

## 6. Inventaire conservé — Edge Functions (Deno)

| Import | Origine | Rôle |
|--------|---------|------|
| `https://deno.land/std@0.168.0/http/server.ts` | Deno Standard Library | Serveur HTTP |
| `npm:@supabase/supabase-js@2` | Registry npm via Deno | Client Supabase Admin (service role key) |

Aucune dépendance tierce supplémentaire. Tout le reste est implémenté en TypeScript natif.

---

## 7. Vulnérabilités

| Source | Constat | Action recommandée |
|--------|---------|--------------------|
| `npm audit` | 19 vulnérabilités (2 critical, 9 high, 8 moderate) — toutes pré-existantes, héritées des dépendances transitives Vite/Vitest/jspdf | `npm audit fix --force` à programmer dans une fenêtre dédiée, avec re-test complet (changement potentiel de versions majeures de Vite/Vitest) |
| Engine | `type-fest@5.2.0` requiert Node ≥20 alors que CI tourne sur Node 18 | Mettre à jour la pipeline CI vers Node LTS (20 ou 22) |

Ces points constituent de la **dette technique standard**, sans rapport avec ce nettoyage d'outillage. Ils sont documentés dans `docs/RAPPORT_QUALITE_LOGICIELLE_DICA_DECOR.md`.

---

## 8. Conclusion

L'actif **DICA Decorator** ne dépend, après nettoyage, **d'aucune brique propriétaire d'un générateur no-code/low-code** :

- ✅ Frontend : stack standard React/TypeScript/Vite/Tailwind/shadcn/ui ;
- ✅ Backend : Supabase (Postgres + Auth + Storage + Edge Functions Deno) ;
- ✅ IA : Google Gemini en accès direct (`generativelanguage.googleapis.com`) pour la génération d'image, et passerelle HTTP standard OpenAI Chat Completions pour l'orchestration texte (substituable en 0,5 j/h sans changement de code).

L'actif est **portable, transférable et reconstructible** par tout intégrateur senior maîtrisant la stack React + Supabase, sans dépendance à un éditeur visuel ou à un fournisseur unique.
