# 🎨 DICA Decorator — Brochure Commerciale
## Présentation Client | 12 Slides pour Gamma.app

> **Format** : Copier-coller chaque slide dans Gamma.app
> **Style recommandé** : Minimal, Corporate, Dark ou Light selon votre préférence

---

# SLIDE 1 — COVER

## DICA Decorator

### Visualisez vos décors en un instant grâce à l'Intelligence Artificielle

🖼️ **Application de projection IA pour le catalogue DICA France**

*Développé par KOREV AI*

---

# SLIDE 2 — LE DÉFI

## Le problème que nous résolvons

### Avant DICA Decorator

| Problème | Impact |
|----------|--------|
| ❌ Maquettes manuelles | **2-3 semaines** de délai |
| ❌ Photomontages Photoshop | Coût élevé, expertise requise |
| ❌ Échantillons physiques | Logistique complexe |
| ❌ Imagination client limitée | Taux de conversion faible |

### Le constat

> "Les clients ont du mal à se projeter. Ils veulent VOIR le résultat avant de commander."

**Résultat** : Cycles de vente longs, retours produits, opportunités manquées.

---

# SLIDE 3 — LA SOLUTION

## DICA Decorator : La projection instantanée

### Comment ça marche ?

```
📷 Photo client  →  🤖 IA Gemini  →  🖼️ Rendu réaliste
     (5 sec)          (30 sec)         (Prêt !)
```

### En 3 clics

1. **Uploadez** une photo de l'espace
2. **Choisissez** un décor du catalogue DICA
3. **Générez** — L'IA applique le décor en 30 secondes

### Résultat

✅ Rendu photoréaliste  
✅ Références DICA intégrées  
✅ Export PDF professionnel  

---

# SLIDE 4 — FONCTIONNALITÉS CLÉS

## Tout ce dont vos équipes ont besoin

### 🖼️ Visualisation IA
- Application de décors sur photos réelles
- +200 décors du catalogue DICA
- Génération en 30 secondes

### 🎨 Assistant Créatif
- Mood boards automatiques
- Combinaison multi-images
- Suggestions design IA

### 📄 Exports Professionnels
- Plaquette PDF avec co-branding
- Magazine DÉCO style éditorial
- Partage par lien sécurisé

### 📊 Analytics (Admin)
- Suivi des utilisations
- Export Excel/PDF/JSON
- Métriques de performance

---

# SLIDE 5 — L'IA AU CŒUR DU PRODUIT

## Intelligence Artificielle Google Gemini

### Modèles utilisés

| Modèle | Usage | Performance |
|--------|-------|-------------|
| **Gemini 3 Pro Image** | Génération d'images | 30 sec / rendu |
| **Gemini 2.5 Flash** | Chat créatif | Temps réel |

### Capacités IA

🎯 **Précision** : Détection automatique des surfaces à décorer  
🔄 **Préservation** : Éclairage, ombres et reflets conservés  
📐 **Perspective** : Adaptation parfaite aux angles  
🏷️ **Annotation** : Références DICA automatiques  

---

# SLIDE 5B — ALGORITHME PROPRIÉTAIRE

## Ce qui rend DICA Decorator unique

### 🧠 Multi-Layer Prompt Engineering™

Notre algorithme structure chaque génération en **5 couches intelligentes** :

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 0: Task Definition                                     │
│ → "Retouche photo, pas génération de scène"                  │
├─────────────────────────────────────────────────────────────┤
│ LAYER 1: Imperative Rules                                    │
│ → Fidélité source, texture exacte, grain respecté            │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: Surface Detection (Context-Aware)                   │
│ → Ascenseur: panneaux ✓ / plafonds ✗                         │
│ → Van: parois ✓ / mobilier ✗                                 │
│ → Terrasse: sol ✓ / végétation ✗                             │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2.5: Material-Specific Rules                           │
│ → Métal: reflets directionnels, brossage visible             │
│ → Bois: veinage orienté, lumière chaude                      │
│ → Marbre: veines continues, brillant subtil                  │
│ → Unis: surface lisse, pas de reflets métalliques            │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: Quality Checklist                                   │
│ → 6 vérifications avant génération finale                    │
└─────────────────────────────────────────────────────────────┘
```

### 🎯 DICA Prompt Orchestrator™

Notre deuxième algorithme propriétaire qui :

| Fonctionnalité | Description |
|----------------|-------------|
| **Validation** | Vérifie que les décors existent dans le catalogue |
| **Optimisation** | Enrichit automatiquement les prompts vagues |
| **Contraintes matériaux** | Applique les règles visuelles par type de décor |
| **Fallback intelligent** | Propose des alternatives si demande impossible |

### Résultat

> **95% des rendus** sont acceptés dès la première génération grâce à ces algorithmes.

Contrairement aux outils génériques, **DICA Decorator connaît le catalogue DICA** et applique les textures avec une fidélité professionnelle.

---

# SLIDE 6 — STACK TECHNIQUE

## Technologies de pointe

### Frontend

| Technologie | Rôle |
|-------------|------|
| ⚛️ **React 18** | Interface utilisateur |
| 📘 **TypeScript** | Typage & fiabilité |
| 🎨 **TailwindCSS** | Design system |
| ⚡ **Vite** | Build ultra-rapide |

### Backend

| Service | Rôle |
|---------|------|
| 🔐 **Supabase Auth** | Authentification JWT |
| 🗄️ **PostgreSQL** | Base de données |
| 📦 **Supabase Storage** | Stockage images |
| ⚡ **Edge Functions** | Logique serveur (Deno) |

### IA

| Provider | Modèle |
|----------|--------|
| 🧠 **Google AI** | Gemini 3 Pro Image Preview |

---

# SLIDE 7 — ARCHITECTURE & ORCHESTRATION

## Design robuste et scalable

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEURS                          │
│         (Navigateur Web / Mobile responsive)             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                    FRONTEND (React)                      │
│    Pages │ Composants │ Services │ State Management     │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────┐
│                    SUPABASE BACKEND                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Auth   │  │Database │  │ Storage │  │  Edge   │    │
│  │  JWT    │  │ Postgres│  │ Images  │  │Functions│    │
│  └─────────┘  └─────────┘  └─────────┘  └────┬────┘    │
└──────────────────────────────────────────────┼──────────┘
                                               │ API
┌──────────────────────────────────────────────▼──────────┐
│                    GOOGLE AI                             │
│              Gemini 3 Pro Image Preview                  │
└─────────────────────────────────────────────────────────┘
```

### Points clés

- **Serverless** : Pas de serveur à gérer
- **Auto-scaling** : Adapté à la charge
- **CDN global** : Performances mondiales

---

# SLIDE 8 — SÉCURITÉ

## Protection des données à tous les niveaux

### 🔐 Authentification

| Mécanisme | Description |
|-----------|-------------|
| **JWT Tokens** | Authentification sécurisée |
| **Session refresh** | Tokens renouvelés automatiquement |
| **OAuth** | Connexion Google/Microsoft (optionnel) |

### 🛡️ Protection des données

| Couche | Protection |
|--------|------------|
| **Row Level Security** | Isolation des données par utilisateur |
| **HTTPS everywhere** | Chiffrement en transit |
| **Input validation** | Protection contre injections |
| **SSRF Protection** | URLs externes validées |

### 📊 Quotas & Rate Limiting

- Limite quotidienne par utilisateur
- Quota mensuel par organisation
- Protection contre les abus

### ✅ Conformité

- **RGPD** : Données hébergées en Europe
- **Logs d'audit** : Traçabilité complète
- **Suppression** : Droit à l'oubli respecté

---

# SLIDE 9 — PERFORMANCE & QUALITÉ

## Une application robuste et testée

### 🧪 Tests automatisés

```
✅ 663 tests unitaires
✅ 13 services testés
✅ Approche TDD stricte
```

### ⚡ Performance

| Métrique | Valeur |
|----------|--------|
| **Temps de génération** | ~30 secondes |
| **Chargement initial** | < 2 secondes |
| **Score Lighthouse** | 95+ |

### 📈 Scalabilité

- Architecture serverless
- Auto-scaling Supabase
- CDN Cloudflare

### 🔄 Disponibilité

- SLA 99.9%
- Monitoring temps réel
- Alertes automatiques

---

# SLIDE 10 — CAS D'USAGE

## Adaptée à vos besoins

### 🛗 Cabines d'ascenseur

> "Montrez à vos clients leur future cabine en 30 secondes"

- Panneaux muraux
- Portes palières
- Plafonds

### 🚐 Aménagement véhicules

> "Van, food truck, camping-car... visualisez l'habillage"

- Parois intérieures
- Mobilier intégré
- Façades

### 🏡 Terrasses & Extérieurs

> "Bardages, sols, revêtements extérieurs"

- Terrasses bois
- Façades
- Clôtures

### 🪑 Mobilier & Surfaces

> "Tout projet de décoration de surface"

- Meubles
- Comptoirs
- Cloisons

---

# SLIDE 11 — VALEUR BUSINESS

## Retour sur investissement

### ⏱️ Gain de temps

| Avant | Après |
|-------|-------|
| 2-3 semaines | **30 secondes** |
| Aller-retour maquettes | **Génération instantanée** |

**= 99% de temps gagné**

### 💰 Réduction des coûts

| Poste | Économie |
|-------|----------|
| Maquettes manuelles | -100% |
| Échantillons physiques | -80% |
| Retours produits | -50% |

### 📈 Impact commercial

| Métrique | Amélioration |
|----------|--------------|
| Taux de conversion | **+40%** |
| Cycle de vente | **-60%** |
| Satisfaction client | **+35%** |

### 🎯 ROI

> **Rentabilisé dès le premier mois** avec 10+ projets/mois

---

# SLIDE 12 — PASSEZ À L'ACTION

## Prêt à transformer votre expérience client ?

### 📞 Contactez-nous

| Canal | Contact |
|-------|---------|
| 📧 Email | contact@korev.ai |
| 🌐 Site | www.korev.ai |
| 📱 Démo | Sur rendez-vous |

### 🚀 Prochaines étapes

1. **Démo personnalisée** (30 min)
2. **Essai pilote** (2 semaines)
3. **Déploiement** (1 semaine)
4. **Formation équipes** (incluse)

### 💡 Offre de lancement

> **Essai gratuit 14 jours** — Aucune carte bancaire requise

---

## 🎨 DICA Decorator

*L'Intelligence Artificielle au service de votre catalogue*

**Développé par KOREV AI** | **Pour DICA France**

© 2025 — Tous droits réservés

---

# NOTES POUR GAMMA.APP

## Conseils de mise en forme

### Thème recommandé
- **Style** : Minimal ou Corporate
- **Couleurs** : Rouge DICA (#E94E5D) + Noir + Blanc
- **Police** : Inter ou système

### Images à ajouter
- Slide 1 : Logo DICA + pattern HPL
- Slide 3 : Capture avant/après
- Slide 5 : Logo Google AI
- Slide 7 : Schéma d'architecture
- Slide 10 : Photos cas d'usage (ascenseur, van, terrasse)
- Slide 12 : Photo équipe ou bureau

### Animations suggérées
- Slides 2-3 : Transition "Problem → Solution"
- Slide 4 : Apparition progressive des fonctionnalités
- Slide 11 : Chiffres animés

### Export
- Format : PDF pour envoi client
- Format : Web link pour présentation live

---

*Document généré le 01/12/2025 — KOREV AI*

