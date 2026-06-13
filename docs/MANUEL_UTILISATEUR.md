# Manuel utilisateur — DICA Decorator

> Guide opérationnel basé sur les écrans et actions réels de l'application
> (routes `src/App.tsx`, pages `src/pages/`). Pour un guide détaillé avec bonnes
> pratiques photo, voir aussi [`GUIDE_UTILISATEUR.md`](./GUIDE_UTILISATEUR.md).
> Pour l'administration, voir
> [`GUIDE_ADMINISTRATEUR.md`](./GUIDE_ADMINISTRATEUR.md).

| Champ | Valeur |
|---|---|
| Application | DICA Decorator v2.2.0 |
| Public | Utilisateurs DICA France et revendeurs |
| Dernière revue | 2026-06-13 |

---

## Table des matières

1. [Accès et authentification](#1-accès-et-authentification)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Créer et gérer un projet](#3-créer-et-gérer-un-projet)
4. [Détail projet : photos et rendus](#4-détail-projet--photos-et-rendus)
5. [Assistant créatif](#5-assistant-créatif)
6. [Favoris et créations IA](#6-favoris-et-créations-ia)
7. [Cobranding revendeur](#7-cobranding-revendeur)
8. [Exports et partage](#8-exports-et-partage)
9. [Mode présentation](#9-mode-présentation)
10. [Aide et mentions légales](#10-aide-et-mentions-légales)
11. [Administration (profil admin)](#11-administration-profil-admin)
12. [Limites et quotas](#12-limites-et-quotas)

---

## 1. Accès et authentification

### Page d'accueil (`/`)

1. Une vidéo de fond se lit automatiquement.
2. Cliquez sur le bouton **Entrer** pour accéder à l'authentification (ou au
tableau de bord si déjà connecté).

### Connexion et inscription (`/auth`)

L'écran propose deux onglets :

| Onglet | Actions disponibles |
|---|---|
| **Connexion** | Email, mot de passe (affichage/masquage), bouton **S |
| **Inscription** | Email, mot de passe, confirmation, bouton **Créer  |

**Règles mot de passe** (validation à l'inscription et à la réinitialisation) :

- Minimum 8 caractères
- Au moins une majuscule, une minuscule, un chiffre et un caractère spécial

**Mot de passe oublié** : saisissez votre email sur l'onglet Connexion, puis
utilisez le lien de réinitialisation. Un email est envoyé ; le retour se fait
sur `/auth` pour définir un nouveau mot de passe.

**Thème** : bascule clair/sombre disponible via l'icône en haut de l'écran.

---

## 2. Tableau de bord

Route : `/dashboard` (authentification requise).

### En-tête

| Élément | Action |
|---|---|
| **Assistant Créatif** | Accès à `/creative` |
| **Mes créations IA** | Accès à `/ai-creations` |
| **Favoris** | Accès à `/favorites` |
| **Mon cobranding** | Accès à `/mon-cobranding` (si cobranding activé sur  |
| **Admin** | Accès à `/admin` (visible uniquement si rôle `admin`) |
| **Aide** | Accès à `/help` |
| **Déconnexion** | Retour à `/auth` |

### Zone projets

- Bouton **+ Nouveau Projet** → `/project/new`
- Liste des projets existants : titre, type de cas d'usage, date de création
- Clic sur un projet → `/project/:id`
- **Renommer** : icône crayon sur la carte projet ; saisie du nouveau titre,
validation ✓ ou annulation ✗
- **Supprimer** : icône corbeille ; dialogue de confirmation avec statistiques
(photos, rendus) avant suppression définitive

### Onboarding

À la première connexion, une modale de bienvenue (`WelcomeModal`) peut
s'afficher, accompagnée d'une checklist d'onboarding.

---

## 3. Créer et gérer un projet

Route : `/project/new`

### Formulaire « Nouveau Projet »

| Champ | Description |
|---|---|
| **Titre** | Nom du projet (obligatoire) |
| **Type de projet** | Liste : Ascenseur, Van, Terrasse, Autre |
| **Référence client** | Texte libre (optionnel) |

Boutons :

- **Retour** (en-tête) → tableau de bord
- **Créer le projet** → redirection vers `/project/:id` après création

---

## 4. Détail projet : photos et rendus

Route : `/project/:id`

### En-tête (visualisation)

- **Retour** → tableau de bord
- Titre et type de projet
- Bascule thème clair/sombre

### Photos

- Bouton **Ajouter une photo** : sélection d'un fichier image depuis l'appareil
- Les photos sont compressées côté client avant upload
(`src/lib/image-compression.ts`)
- Chaque photo apparaît dans une galerie ; sélection d'une photo pour travailler
dessus

### Sélection de décor

- Bouton ouvrant le **Sélecteur de décors** (`DecorSelectorDialog`)
- Navigation par catalogues selon le type de projet (ascenseur : parois et sol
possibles)
- Recherche et filtres par catégorie

### Génération de rendu

Après sélection photo + décor(s) :

| Paramètre | Options |
|---|---|
| Nombre de rendus | 1 ou 2 (max côté serveur) |
| Format | Original, Carré, Portrait, Paysage |
| Afficher références DICA | Case à cocher (références visibles sur le rendu) |

Bouton **Générer** (icône Sparkles) : lance l'Edge Function `apply-decor`. Un
indicateur de chargement s'affiche pendant la génération.

### Actions sur un rendu

Pour chaque rendu généré :

| Action | Description |
|---|---|
| Comparaison Avant/Après | Slider interactif (`BeforeAfterSlider`) |
| Favori | Ajout/retrait des favoris (cœur) |
| Zoom | Affichage plein écran |
| Export image | Menu PNG / JPEG / WebP |
| Partage | Dialogue de lien sécurisé à expiration |
| Brochure revendeur | Export PDF cobrandé (si cobranding activé) |
| Magazine DÉCO | Export PDF éditorial |
| Importer vers Assistant Créatif | Envoi du rendu vers `/creative` |
| Supprimer | Suppression du rendu |

Menu **⋮** (MoreVertical) regroupe certaines actions selon le contexte.

---

## 5. Assistant créatif

Route : `/creative`

### Interface

- Fil de conversation avec message d'accueil de l'assistant
- Zone de saisie de texte + bouton **Envoyer**
- Possibilité d'**ajouter des images** de référence (upload)
- Onglets : conversation, favoris de l'assistant, import depuis projets

### Fonctionnalités

- **Chat texte** : réponses streamées (Gemini), avec contexte du catalogue DICA
- **Génération d'image** : l'assistant peut produire une image créative à partir
de la demande
- **Favoris** : sauvegarde d'un échange (titre personnalisé)
- **Export** : menu d'export image sur les réponses contenant une image
- **Import vers projet** : dialogue de sélection d'un projet existant pour y
associer la création

L'assistant cite les références DICA existantes dans le catalogue et signale les
références non reconnues.

---

## 6. Favoris et créations IA

### Favoris (`/favorites`)

Galerie unifiée des rendus favoris (projets) et créations favorites (assistant).
Actions : visualisation, export, suppression du favori.

### Mes créations IA (`/ai-creations`)

Liste des créations importées depuis l'assistant créatif vers les projets.
Permet de retrouver les visuels produits en dehors du fil de chat.

---

## 7. Cobranding revendeur

Route : `/mon-cobranding` (accessible si `cobranding_enabled` est activé sur le
profil par un administrateur).

Formulaire de personnalisation pour les exports PDF cobrandés :

- Nom de l'entreprise revendeur
- Coordonnées (contact, email, téléphone, adresse)

Ces informations alimentent la **brochure revendeur PDF**
(`reseller-brochure-pdf.service.ts`).

---

## 8. Exports et partage

### Export image

Menu déroulant (PNG, JPEG, WebP) disponible sur les rendus et créations. Qualité
et dimensions gérées par `image-export.service.ts`.

### Partage par lien

Dialogue **Partager** (`ShareLinkDialog`) :

- Choix de la durée de validité : 24 h, 7 j, 30 j, 90 j, ou sans expiration
- Génération d'un lien tokenisé
- Consultation des accès enregistrés

### Exports PDF

| Type | Déclencheur | Contenu |
|---|---|---|
| Brochure revendeur | Bouton sur rendu (cobran… | Plaquette cobrandée… |
| Magazine DÉCO | Bouton sur rendu | Magazine éditorial avec légendes IA |

---

## 9. Mode présentation

Route : `/presentation/:projectId`

Affichage plein écran des rendus d'un projet pour présentation client.
Navigation entre les visuels. Accessible depuis le détail projet.

---

## 10. Aide et mentions légales

| Route | Contenu |
|---|---|
| `/help` | Page d'aide intégrée (authentification requise) |
| `/mentions-legales` | Mentions légales (accès public) |

---

## 11. Administration (profil admin)

Routes : `/admin`, `/admin/analytics` — réservées au rôle `admin`.

Pour le détail des opérations (gestion décors, catalogues, utilisateurs, quotas,
organisations), consulter
[`GUIDE_ADMINISTRATEUR.md`](./GUIDE_ADMINISTRATEUR.md).

### Panneau Admin (`/admin`) — onglets observés

| Onglet | Fonctions |
|---|---|
| Décors | CRUD décors, upload texture, association catalogues |
| Catégories | Gestion des catégories de décors |
| Catalogues | Gestion des catalogues par type de projet |
| Upload bulk | Import massif de décors (`BulkDecorUpload`) |
| Utilisateurs | Liste, confirmation email, activation/désactivation, rô |
| Branding | Paramètres cobranding revendeur (`ResellerBrandingSettings`) |

Bouton **Analytics** → `/admin/analytics` (graphiques, métriques, exports
JSON/Excel/PDF).

---

## 12. Limites et quotas

- **Quota de rendus** : contrôlé côté serveur avant chaque génération. Message
affiché si quota épuisé : *« Quota de rendus épuisé. Contactez votre
administrateur. »*
- **Rendus par requête** : maximum 2
- **Taille photo** : maximum 12 Mo côté Edge Function
- **Rate limit journalier** : reset à minuit UTC (utilisateur)
- **Quotas organisation** : reset le 1er du mois UTC ; seuils d'alerte à 80 % et
95 %

En cas de dépassement, contactez votre administrateur DICA ou
`tech@dica-france.com`.

---

© DICA France — base logicielle développée par KOREV AI.
