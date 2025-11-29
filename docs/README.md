# 📚 Documentation DICA Decorator

## Application de Visualisation de Décors par Intelligence Artificielle

**Client :** DICA France  
**Version :** 1.0.0  
**Date :** Novembre 2024

---

## 📖 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Guide Utilisateur](./GUIDE_UTILISATEUR.md)
3. [Guide Administrateur](./GUIDE_ADMINISTRATEUR.md)
4. [Documentation Technique](./DOCUMENTATION_TECHNIQUE.md)
5. [Guide de Déploiement](./GUIDE_DEPLOIEMENT.md)
6. [API Reference](./API_REFERENCE.md)

---

## Vue d'ensemble

### Qu'est-ce que DICA Decorator ?

**DICA Decorator** est une application web professionnelle de visualisation de décors par intelligence artificielle, développée pour DICA France et ses revendeurs. Elle permet de :

- **Visualiser** instantanément l'application de décors DICA sur des photos réelles
- **Créer** des rendus photoréalistes grâce à l'IA Google Gemini
- **Générer** des mood boards et plaquettes commerciales créatives
- **Gérer** des projets clients avec historique complet

### Cas d'usage supportés

| Contexte | Description | Surfaces ciblées |
|----------|-------------|------------------|
| 🛗 **Ascenseur** | Cabines d'ascenseur | Panneaux muraux, portes |
| 🚐 **Van** | Aménagement véhicules | Parois latérales, cloisons |
| 🏡 **Terrasse** | Espaces extérieurs | Sols, bardages |
| 🪑 **Autre** | Mobilier, surfaces | Tables, comptoirs, meubles |

### Catégories de décors

- **Métal** - Inox brossé, aluminium, finitions métalliques
- **Unis** - Couleurs unies, surfaces lisses
- **Marbre** - Effets pierre naturelle, veinage minéral
- **Bois** - Essences naturelles, grain bois
- **Déco** - Motifs décoratifs, textures graphiques

---

## 🚀 Démarrage Rapide

### Prérequis

- Navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Connexion internet stable
- Compte utilisateur DICA Decorator

### Accès à l'application

1. Accéder à l'URL de l'application
2. Se connecter avec vos identifiants
3. Créer un nouveau projet ou ouvrir un projet existant

### Premier rendu en 3 étapes

1. **Créer un projet** → Définir le contexte (ascenseur, van, terrasse, autre)
2. **Uploader une photo** → Image de la surface à décorer
3. **Appliquer un décor** → Sélectionner et générer le rendu IA

---

## 🏢 Architecture de l'application

```
┌─────────────────────────────────────────────────────────────┐
│                      DICA Decorator                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Dashboard  │    │   Projet    │    │  Créatif    │     │
│  │             │    │   Détail    │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      Services TDD                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │  Storage   │ │ Rate Limit │ │   Auth     │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │   SSRF     │ │   Quota    │ │   Org      │              │
│  └────────────┘ └────────────┘ └────────────┘              │
├─────────────────────────────────────────────────────────────┤
│                      Supabase                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │    Auth    │ │  Database  │ │  Storage   │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│  ┌────────────┐                                            │
│  │Edge Funcs  │ ← Google Gemini AI                         │
│  └────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Sécurité

L'application implémente plusieurs couches de sécurité :

- **Authentification** via Supabase Auth (JWT)
- **Autorisation** par rôles (admin/client)
- **Row Level Security** (RLS) sur toutes les tables
- **Protection anti-SSRF** pour les URLs externes
- **Rate Limiting** quotidien et mensuel
- **Validation serveur** de tous les inputs

---

## 📊 Modèle Multi-tenant

L'application supporte un modèle multi-organisations pour les revendeurs :

- **Organisations** avec branding personnalisé
- **Membres** avec rôles (propriétaire, admin, membre)
- **Quotas mensuels** par tier (starter: 100, pro: 500, enterprise: 2000)
- **Invitations** par email avec expiration

---

## 📞 Support

Pour toute question ou assistance :

- **Email :** support@dica-france.com
- **Documentation :** Ce dossier `/docs`
- **Issues :** Contacter l'équipe de développement

---

© 2024 DICA France - Développé par **KOREV AI**

