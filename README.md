# 🎨 DICA Decorator

<div align="center">

![DICA France](public/images/dica-logo.svg)

**Application de Visualisation de Décors par Intelligence Artificielle**

[![Tests](https://img.shields.io/badge/tests-663%20passed-brightgreen)](#tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](#technologies)
[![React](https://img.shields.io/badge/React-18.x-61dafb)](#technologies)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e)](#technologies)
[![Google AI](https://img.shields.io/badge/Google%20AI-Gemini-4285f4)](#technologies)

[Documentation](./docs/README.md) • [Guide Utilisateur](./docs/GUIDE_UTILISATEUR.md) • [API Reference](./docs/API_REFERENCE.md)

</div>

---

## 📋 À propos

**DICA Decorator** est une application web professionnelle développée par **KOREV AI** pour **DICA France** permettant de visualiser instantanément les décors du catalogue sur des photos réelles grâce à l'intelligence artificielle Google Gemini.

### ✨ Bénéfices clés

| Bénéfice | Impact |
|----------|--------|
| ⚡ **Rapidité** | Visualisation en secondes au lieu de semaines de maquettes |
| 🎯 **Fiabilité** | Rendus cohérents et professionnels à chaque fois |
| 🤖 **Automatisation** | Zéro manipulation manuelle, l'IA fait tout |
| 💰 **Économies** | Réduction des coûts de prototypage de 80% |

---

## 🚀 Fonctionnalités

### Core Features

| Fonctionnalité | Description |
|----------------|-------------|
| 🖼️ **Visualisation IA** | Application de décors sur photos en quelques secondes |
| 🎨 **Assistant Créatif** | Génération de mood boards et plaquettes commerciales |
| 📁 **Gestion de Projets** | Organisation par clients avec historique complet |
| ❤️ **Système de Favoris** | Marquez et retrouvez vos meilleurs rendus |
| 🏷️ **Références DICA** | Annotations automatiques des codes décors |

### Exports & Partage

| Fonctionnalité | Description |
|----------------|-------------|
| 📄 **Plaquette PDF Premium** | Export avec co-branding et commentaires IA |
| 📊 **Magazine DÉCO** | Export éditorial style AD Magazine |
| 📈 **Analytics Excel/PDF/JSON** | Rapports statistiques multi-formats |
| 🔗 **Partage par Lien** | Partage sécurisé avec expiration |
| ⚖️ **Comparaison Avant/Après** | Slider interactif |

### Administration

| Fonctionnalité | Description |
|----------------|-------------|
| 👥 **Multi-Organisations** | Support revendeurs avec quotas |
| 📊 **Dashboard Analytics** | Métriques et tendances en temps réel |
| 🎬 **Mode Présentation** | Fullscreen pour démos commerciales |
| 🌙 **Mode Nuit** | Interface adaptable jour/nuit |

### Cas d'usage supportés

| Contexte | Description |
|----------|-------------|
| 🛗 Ascenseur | Cabines d'ascenseur |
| 🚐 Van | Aménagement véhicules |
| 🏡 Terrasse | Espaces extérieurs |
| 🪑 Autre | Mobilier, surfaces |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │  Services   │              │
│  │  (Router)   │  │ (shadcn/ui) │  │   (TDD)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST
┌────────────────────────────┴────────────────────────────────────┐
│                      SUPABASE (Backend)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │  Database   │  │   Storage   │              │
│  │   (JWT)     │  │ (PostgreSQL)│  │  (Images)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │            Edge Functions (Deno)              │               │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │               │
│  │  │apply-decor│  │creative  │  │analytics │    │               │
│  │  │          │  │  -chat   │  │          │    │               │
│  │  └──────────┘  └──────────┘  └──────────┘    │               │
│  └──────────────────────────────────────────────┘               │
└────────────────────────────┬────────────────────────────────────┘
                             │ API
┌────────────────────────────┴────────────────────────────────────┐
│                    GOOGLE AI (Gemini)                            │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ Gemini 3 Pro Image  │  │ Gemini 2.5 Flash    │               │
│  │ (Génération images) │  │ (Chat créatif)      │               │
│  └─────────────────────┘  └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm 8+
- Compte Supabase
- Clé API Google AI

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd dica-decorator

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés

# Lancer en développement
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

### Scripts disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Preview du build
npm run test         # Tests en mode watch
npm run test:run     # Tests une seule fois
npm run test:coverage # Tests avec couverture
npm run lint         # Linter ESLint
```

---

## 🛠️ Technologies

### Frontend

| Technologie | Usage |
|-------------|-------|
| **React 18** | Framework UI |
| **TypeScript** | Typage statique |
| **Vite** | Build tool |
| **TailwindCSS** | Styling |
| **shadcn/ui** | Composants UI |
| **React Router** | Routing |
| **TanStack Query** | État serveur |
| **jsPDF** | Génération PDF |

### Backend

| Service | Usage |
|---------|-------|
| **Supabase** | Auth, Database, Storage |
| **PostgreSQL** | Base de données |
| **Edge Functions** | Logique serveur (Deno) |
| **Row Level Security** | Sécurité données |

### Intelligence Artificielle

| Service | Modèle | Usage |
|---------|--------|-------|
| **Google AI** | Gemini 3 Pro Image Preview | Génération images |
| **Google AI** | Gemini 2.5 Flash | Chat créatif (texte) |

---

## 📁 Structure du projet

```
dica-decorator/
├── docs/                    # 📚 Documentation complète
│   ├── README.md
│   ├── GUIDE_UTILISATEUR.md
│   ├── GUIDE_ADMINISTRATEUR.md
│   ├── DOCUMENTATION_TECHNIQUE.md
│   ├── GUIDE_DEPLOIEMENT.md
│   ├── API_REFERENCE.md
│   └── DICA_FRANCE_RESUME.md
├── public/
│   └── images/              # Assets statiques
├── src/
│   ├── components/          # Composants React
│   │   ├── ui/              # Composants shadcn/ui
│   │   ├── analytics/       # Composants analytics
│   │   └── onboarding/      # Composants onboarding
│   ├── contexts/            # Contextes React
│   ├── integrations/        # Intégrations (Supabase)
│   ├── lib/                 # Utilitaires
│   ├── pages/               # Pages de l'application
│   ├── services/            # Services métier (TDD)
│   │   └── __tests__/       # Tests unitaires
│   └── test/                # Configuration tests
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Migrations SQL
└── package.json
```

---

## 🧪 Tests

L'application est développée avec une approche **TDD stricte**.

```bash
# Lancer les tests
npm run test:run

# Résultat attendu
✓ src/services/__tests__/gemini-image.service.test.ts (46 tests)
✓ src/services/__tests__/analytics.service.test.ts (49 tests)
✓ src/services/__tests__/analytics-export.service.test.ts (29 tests)
✓ src/services/__tests__/share-link.service.test.ts (58 tests)
✓ src/services/__tests__/url-validator.service.test.ts (71 tests)
✓ src/services/__tests__/image-comparison.service.test.ts (67 tests)
✓ src/services/__tests__/presentation.service.test.ts (67 tests)
✓ src/services/__tests__/plaquette-pdf.service.test.ts (138 tests)
✓ src/services/__tests__/organization.service.test.ts (27 tests)
✓ src/services/__tests__/image-storage.service.test.ts (29 tests)
✓ src/services/__tests__/auth-guard.service.test.ts (31 tests)
✓ src/services/__tests__/rate-limiter.service.test.ts (30 tests)
✓ src/services/__tests__/quota.service.test.ts (21 tests)

Test Files  13 passed (13)
     Tests  663 passed (663)
```

### Services testés

| Service | Tests | Couverture |
|---------|-------|------------|
| PlaquettePdfService | 138 | Export PDF Premium + Co-branding |
| UrlValidatorService | 71 | Protection anti-SSRF |
| PresentationService | 67 | Mode présentation plein écran |
| ImageComparisonService | 67 | Comparaison Avant/Après |
| ShareLinkService | 58 | Partage de projets sécurisé |
| AnalyticsService | 49 | Dashboard analytics admin |
| GeminiImageService | 46 | Intégration Gemini 3 Pro |
| AuthGuardService | 31 | Validation rôles & permissions |
| RateLimiterService | 30 | Limites quotidiennes/mensuelles |
| AnalyticsExportService | 29 | Export JSON/Excel/PDF |
| ImageStorageService | 29 | Migration base64 → Storage |
| OrganizationService | 27 | Multi-tenant |
| QuotaService | 21 | Gestion quotas revendeurs |

---

## 🔒 Sécurité

- ✅ **Authentification JWT** via Supabase Auth
- ✅ **Row Level Security** sur toutes les tables
- ✅ **Protection SSRF** pour URLs externes
- ✅ **Rate Limiting** quotidien et mensuel
- ✅ **Validation serveur** de tous les inputs
- ✅ **Tests de sécurité** (71 tests UrlValidator)

---

## 📚 Documentation

Une documentation complète est disponible dans le dossier `/docs` :

| Document | Description |
|----------|-------------|
| [README](./docs/README.md) | Vue d'ensemble |
| [Guide Utilisateur](./docs/GUIDE_UTILISATEUR.md) | Pour les utilisateurs finaux |
| [Guide Administrateur](./docs/GUIDE_ADMINISTRATEUR.md) | Pour les admins |
| [Documentation Technique](./docs/DOCUMENTATION_TECHNIQUE.md) | Architecture & code |
| [Guide de Déploiement](./docs/GUIDE_DEPLOIEMENT.md) | Installation & prod |
| [API Reference](./docs/API_REFERENCE.md) | Endpoints & types |
| [Résumé DICA](./docs/DICA_FRANCE_RESUME.md) | Résumé exécutif |

---

## 🚢 Déploiement

### Lovable (Production)

L'application est déployée via **Lovable** qui gère :
- Supabase (Backend)
- Edge Functions
- Storage

### Build manuel

```bash
npm run build
# Les fichiers sont dans dist/
```

Voir le [Guide de Déploiement](./docs/GUIDE_DEPLOIEMENT.md) pour plus de détails.

---

## 📊 Changelog récent

### Version 2.1.0 (Décembre 2025)

- ✨ **Export Analytics multi-formats** : JSON, Excel (CSV), PDF
- ❤️ **Bouton favoris visible** sur chaque rendu (plus dans le menu)
- 🎨 **Icônes corrigées** pour dark mode
- 📊 **Dashboard Analytics** amélioré avec graphiques
- 📄 **Magazine DÉCO** style AD Magazine

---

## 📄 Licence

Application propriétaire développée pour **DICA France**.

---

## 📞 Support

- **Documentation** : [/docs](./docs/README.md)
- **Support technique** : tech@dica-france.com

---

<div align="center">

**DICA Decorator v2.1.0**

*Transformez votre catalogue en expérience visuelle*

© 2025 DICA France - Développé par **KOREV AI**

</div>
