# 👤 Guide Utilisateur DICA Decorator

**Application de Visualisation de Décors par Intelligence Artificielle**

---

## Table des Matières

1. [Connexion à l'application](#1-connexion-à-lapplication)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Création d'un projet](#3-création-dun-projet)
4. [Gestion des photos](#4-gestion-des-photos)
5. [Application des décors](#5-application-des-décors)
6. [Gestion des rendus](#6-gestion-des-rendus)
7. [Assistant Créatif IA](#7-assistant-créatif-ia)
8. [Favoris et téléchargements](#8-favoris-et-téléchargements)
9. [Bonnes pratiques](#9-bonnes-pratiques)

---

## 1. Connexion à l'application

### Première connexion

1. Accédez à l'URL de l'application DICA Decorator
2. Cliquez sur **"Créer un compte"** si vous n'avez pas encore de compte
3. Renseignez votre email professionnel et créez un mot de passe sécurisé
4. Validez votre email si demandé
5. Connectez-vous avec vos identifiants

### Connexion régulière

1. Entrez votre email et mot de passe
2. Cliquez sur **"Se connecter"**
3. Vous êtes redirigé vers le tableau de bord

### Déconnexion

- Cliquez sur le bouton **"Déconnexion"** en haut à droite du tableau de bord

---

## 2. Tableau de bord

Le tableau de bord est votre espace central. Il affiche :

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo DICA]        [Créatif ✨]  [Admin*]  [Déconnexion]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Mes Projets                         [+ Nouveau Projet]     │
│  Visualisez vos décors DICA sur vos photos                 │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Projet A    │  │ Projet B    │  │ Projet C    │         │
│  │ ascenseur   │  │ van         │  │ terrasse    │         │
│  │ 15/01/2024  │  │ 20/01/2024  │  │ 22/01/2024  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
* Visible uniquement pour les administrateurs
```

### Actions disponibles

| Action | Description |
|--------|-------------|
| **Nouveau Projet** | Créer un nouveau projet de visualisation |
| **Libérez votre imagination** | Accéder à l'assistant créatif IA |
| **Cliquer sur un projet** | Ouvrir le détail du projet |
| **Admin** | Accéder à la gestion des décors (admins uniquement) |

---

## 3. Création d'un projet

### Étapes de création

1. Cliquez sur **"+ Nouveau Projet"**
2. Remplissez le formulaire :

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Titre** | Nom descriptif du projet | "Ascenseur Immeuble Haussmann" |
| **Cas d'usage** | Contexte d'application | ascenseur, van, terrasse, autre |
| **Référence client** | Votre référence interne (optionnel) | "CMD-2024-001" |

3. Cliquez sur **"Créer le projet"**

### Choix du cas d'usage

Le cas d'usage détermine quelles surfaces l'IA va modifier :

| Cas d'usage | Surfaces autorisées | Surfaces préservées |
|-------------|---------------------|---------------------|
| **Ascenseur** | Panneaux muraux, portes | Plafond, sol, boutons, miroirs |
| **Van** | Parois, cloisons | Meubles, électroménager, poignées |
| **Terrasse** | Sol, bardages | Végétation, mobilier, textiles |
| **Autre** | Surface principale en focus | Murs de fond, accessoires |

---

## 4. Gestion des photos

### Upload d'une photo

1. Dans le détail du projet, cliquez sur **"Ajouter une photo"**
2. Sélectionnez une image depuis votre ordinateur
3. Formats acceptés : JPG, PNG, WEBP
4. Taille recommandée : 1024x1024 à 2048x2048 pixels
5. La photo apparaît dans la galerie du projet

### Recommandations photos

✅ **Bonnes pratiques :**
- Éclairage uniforme et naturel
- Surfaces bien visibles et non obstruées
- Angle de prise de vue frontal ou légèrement en perspective
- Résolution suffisante (min. 800x800 px)

❌ **À éviter :**
- Photos floues ou surexposées
- Surfaces partiellement cachées
- Angles extrêmes
- Images trop compressées

### Suppression d'une photo

1. Cliquez sur l'icône **poubelle** 🗑️ sur la carte de la photo
2. Confirmez la suppression
3. ⚠️ Tous les rendus associés seront également supprimés

---

## 5. Application des décors

### Procédure de génération

1. Cliquez sur **"Appliquer un décor"** sur une photo
2. La fenêtre de sélection s'ouvre

### Paramètres de génération

| Paramètre | Options | Recommandation |
|-----------|---------|----------------|
| **Nombre de rendus** | 1 à 4 | 2-3 pour varier les résultats |
| **Format** | Carré (1024×1024), Portrait, Paysage | Selon votre photo |

### Sélection du décor

1. Naviguez par catégorie : **Métal**, **Unis**, **Marbre**, **Bois**, **Déco**
2. Cliquez sur le décor souhaité (bordure bleue = sélectionné)
3. Visualisez la texture avant de générer

### Lancement de la génération

1. Cliquez sur **"Générer le rendu"** (ou "Générer X rendus")
2. Patientez pendant la génération (30-60 secondes par rendu)
3. Les rendus apparaissent automatiquement sous la photo

### Codes de référence décors

Chaque décor possède un code unique (ex: `DIC-A23`) qui permet :
- L'identification rapide en catalogue
- La commande auprès de DICA France
- Le suivi dans vos projets

---

## 6. Gestion des rendus

### Actions sur les rendus

| Action | Icône | Description |
|--------|-------|-------------|
| **Favori** | ❤️ | Marquer le rendu comme favori |
| **Télécharger** | ⬇️ | Sauvegarder l'image sur votre ordinateur |
| **Régénérer** | 🔄 | Créer une nouvelle variante avec le même décor |
| **Supprimer** | 🗑️ | Supprimer définitivement le rendu |

### Système de favoris

- Les favoris sont sauvegardés dans votre compte
- Accessible depuis n'importe quel projet
- Pratique pour comparer différentes options

### Téléchargement

- Format : PNG haute qualité
- Résolution : selon le format choisi
- Nom fichier : `dica-render-[timestamp].png`

---

## 7. Assistant Créatif IA

### Accès

Cliquez sur **"Libérez votre imagination"** depuis le tableau de bord.

### Fonctionnalités

L'assistant créatif permet de :
- 🎨 **Créer des mood boards** avec vos décors préférés
- 📄 **Générer des plaquettes** de présentation commerciale
- 💡 **Obtenir des conseils** de design et d'agencement
- 🖼️ **Visualiser des ambiances** personnalisées

### Comment l'utiliser

1. **Tapez votre demande** dans le champ de texte
2. **Ajoutez une photo source** (optionnel) avec le bouton 📷
3. **Envoyez** votre message
4. **Attendez** la réponse de l'IA (texte ou image)

### Exemples de prompts

```
"Crée-moi un mood board avec les décors marbre pour une salle de bain moderne"

"Je veux une plaquette de présentation de nos panneaux métalliques"

"Imagine une cabine d'ascenseur luxueuse avec nos décors bois"

"Quels décors recommandes-tu pour un van aménagé style scandinave ?"
```

### Sauvegarder une création

1. Cliquez sur **"❤️ Sauvegarder en favori"** sous la réponse
2. Donnez un titre descriptif
3. Retrouvez-la dans l'onglet **"Mes favoris"**

### Télécharger une image générée

- Cliquez sur **"Télécharger"** sous l'image
- Ou **"Enregistrer dans un projet"** pour l'ajouter à un projet existant

---

## 8. Favoris et téléchargements

### Favoris rendus

- Accessibles dans chaque projet (filtre favoris)
- Synchronisés sur tous vos appareils
- Exportables en lot (fonctionnalité à venir)

### Favoris créatifs

- Onglet **"Mes favoris"** dans l'assistant créatif
- Historique de vos meilleures créations
- Supprimables individuellement

### Organisation recommandée

```
📁 Projet Client A
   └── 📷 Photo ascenseur 1
       ├── ⭐ Rendu Inox Brossé (favori)
       └── Rendu Marbre Carrare
   └── 📷 Photo ascenseur 2
       └── ⭐ Rendu Chêne Naturel (favori)

📁 Projet Client B
   └── ...
```

---

## 9. Bonnes pratiques

### Optimiser vos rendus

1. **Qualité photo source**
   - Utilisez la meilleure résolution possible
   - Évitez les photos compressées par messagerie

2. **Choix du cas d'usage**
   - Sélectionnez toujours le bon contexte
   - Impacte directement la qualité du résultat

3. **Générations multiples**
   - Générez 2-3 rendus pour avoir des variantes
   - L'IA produit des résultats légèrement différents à chaque fois

4. **Régénération**
   - Si un rendu ne convient pas, utilisez "Régénérer"
   - Évite de re-sélectionner le décor

### Productivité

| Conseil | Impact |
|---------|--------|
| Préparer les photos à l'avance | ⏱️ Gain de temps |
| Nommer clairement les projets | 📁 Organisation |
| Utiliser les favoris | 🎯 Comparaison facile |
| Noter les codes décors | 📝 Commandes rapides |

### Limites et quotas

- **Limite quotidienne** : 50 rendus par utilisateur
- **Quota mensuel** : selon votre forfait organisation
- Le compteur se réinitialise à minuit (UTC)

---

## ❓ FAQ

### Pourquoi mon rendu ne ressemble pas à ce que j'attendais ?

L'IA fait de son mieux pour interpréter la photo, mais certains facteurs peuvent affecter le résultat :
- Photo source de mauvaise qualité
- Surfaces mal définies ou obstruées
- Cas d'usage mal sélectionné

**Solution :** Régénérez avec une meilleure photo ou ajustez le cas d'usage.

### Combien de temps prend une génération ?

- 1 rendu : 30-60 secondes
- 4 rendus : 2-4 minutes

Le temps peut varier selon la charge du service.

### Puis-je utiliser mes rendus commercialement ?

Oui, les rendus générés sont destinés à un usage professionnel dans le cadre de votre activité avec DICA France.

### Comment améliorer la qualité des rendus ?

1. Photos haute résolution (1500px minimum)
2. Éclairage uniforme
3. Surfaces bien visibles
4. Bon choix de cas d'usage

---

## 📞 Besoin d'aide ?

- **Email support :** support@dica-france.com
- **Documentation complète :** Dossier `/docs`
- **Signaler un bug :** Contacter votre administrateur DICA

---

© 2024 DICA France - Développé par KOREV AI

