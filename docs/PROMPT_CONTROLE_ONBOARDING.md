# 🎯 Prompt de Contrôle — Documentation & Onboarding DICA

> **Objectif** : Vérifier que l'onboarding utilisateur fonctionne sans explication orale complémentaire.

---

## ✅ Checklist de Validation

### 1. Landing Page & Première Impression

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Vidéo d'accueil visible | La vidéo DICA se joue automatiquement | ☐ |
| Bouton "Entrer" visible | Bouton avec effet halo lumineux pulsant | ☐ |
| Logo DICA présent | Logo en haut à gauche | ☐ |

### 2. Welcome Modal (Nouveaux Utilisateurs)

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Modal s'affiche automatiquement | À la première connexion uniquement | ☐ |
| 5 étapes claires | Bienvenue → Projet → Photo → Décor → Export | ☐ |
| Bénéfices IA visibles | Rapidité, gain de temps, professionnalisme | ☐ |
| Bouton "Passer" fonctionnel | Permet de sauter l'onboarding | ☐ |
| Progression visible | Barre de progression + numéro d'étape | ☐ |

### 3. Dashboard (Première Vue)

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Bouton "+ Nouveau Projet" visible | Call-to-action principal | ☐ |
| Bouton "Assistant Créatif" visible | Accès à l'IA créative | ☐ |
| Mode nuit accessible | Toggle ☀️/🌙 dans le header | ☐ |
| Navigation vers Admin (si admin) | Bouton visible pour les admins | ☐ |

### 4. Création de Projet

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Formulaire simple | 3 champs max : Titre, Type, Ref client | ☐ |
| Types de projet clairs | Ascenseur, Van, Terrasse, Autre | ☐ |
| Validation intuitive | Bouton "Créer" activé dès le titre rempli | ☐ |

### 5. Visualisation IA

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Upload photo simple | Bouton drag & drop ou clic | ☐ |
| Sélection décor intuitive | Galerie avec catégories | ☐ |
| Option "Références DICA" | Checkbox visible avant génération | ☐ |
| Indicateur de progression | Loader pendant génération | ☐ |
| Rendu visible immédiatement | Image apparaît sous la photo source | ☐ |

### 6. Actions sur Rendus

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Bouton ❤️ visible | Sur chaque rendu, en haut à droite | ☐ |
| Bouton ⋮ (menu) visible | À côté du cœur | ☐ |
| Zoom plein écran | Clic sur 🔍 fonctionne | ☐ |
| Téléchargement | Bouton dans le menu | ☐ |

### 7. Exports

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Plaquette PDF accessible | Bouton dans le header projet | ☐ |
| Magazine DÉCO accessible | Dans le menu exports | ☐ |
| Partage par lien | Bouton de partage visible | ☐ |

### 8. Page d'Aide

| Point de contrôle | Attendu | ✓ |
|-------------------|---------|---|
| Accessible depuis le header | Icône ? ou lien "Aide" | ☐ |
| 3 onglets présents | Guide, Nouveautés, FAQ | ☐ |
| Démarrage rapide visible | 4 étapes numérotées | ☐ |
| FAQ complète | 8+ questions fréquentes | ☐ |

---

## 🧪 Scénario de Test Utilisateur (3 min)

### Parcours "Premier Rendu"

1. **T+0:00** — Atterrir sur la landing page
   - [ ] Vidéo visible
   - [ ] Cliquer sur "Entrer"

2. **T+0:15** — Connexion/Inscription
   - [ ] Formulaire clair
   - [ ] Connexion réussie

3. **T+0:30** — Dashboard
   - [ ] Welcome Modal affiché (si nouveau)
   - [ ] Parcourir les 5 étapes ou "Passer"

4. **T+1:00** — Créer un projet
   - [ ] Cliquer "+ Nouveau Projet"
   - [ ] Remplir titre + type
   - [ ] Créer

5. **T+1:30** — Uploader une photo
   - [ ] Cliquer "Ajouter une photo"
   - [ ] Sélectionner une image

6. **T+2:00** — Appliquer un décor
   - [ ] Cliquer "Appliquer un décor"
   - [ ] Choisir un décor dans la galerie
   - [ ] Générer

7. **T+2:30** — Voir le résultat
   - [ ] Rendu visible sous la photo
   - [ ] Ajouter aux favoris (❤️)

8. **T+3:00** — Exporter
   - [ ] Télécharger le rendu
   - [ ] OU créer une plaquette PDF

---

## 📊 Métriques de Succès

| Métrique | Seuil Acceptable | Optimal |
|----------|------------------|---------|
| Temps premier rendu | < 5 min | < 3 min |
| Clics pour premier rendu | < 10 clics | < 7 clics |
| Questions posées à l'oral | < 3 | 0 |
| Taux d'abandon onboarding | < 30% | < 10% |

---

## 🔧 Corrections Prioritaires si Échec

### Haute Priorité (Bloquant)

1. Welcome Modal ne s'affiche pas → Vérifier `useOnboarding` hook
2. Bouton favori invisible → Vérifier styles dark mode
3. Génération échoue → Vérifier quotas et Edge Functions

### Moyenne Priorité

1. Page d'aide non accessible → Ajouter route `/help`
2. Export PDF échoue → Vérifier jsPDF
3. Mode nuit incohérent → Vérifier ThemeContext

### Basse Priorité

1. Animations manquantes → CSS transitions
2. Tooltips non affichés → Activer TooltipProvider
3. Textes tronqués → Ajuster responsive

---

## 📝 Rapport de Test

```markdown
### Date du test : ____/____/2025
### Testeur : __________________
### Version : 2.1.0

#### Résultat global : [ ] PASS  [ ] FAIL

#### Points bloquants :
1. ________________________________
2. ________________________________

#### Améliorations suggérées :
1. ________________________________
2. ________________________________

#### Validation finale : [ ] Prêt pour release
```

---

© 2025 DICA France — Développé par **KOREV AI**

