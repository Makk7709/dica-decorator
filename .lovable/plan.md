
# 🎨 Refonte Visuelle DICA — Direction "Premium & Épuré"

## Principe directeur
Moderniser l'esthétique sans toucher à la logique métier, aux services, ni aux appels API. On ne modifie que le CSS, les tokens de design, et les composants visuels.

---

## Phase 1 — Design System (fondations)
- **Nouvelle palette de couleurs** : tons sombres raffinés (charcoal, slate), accent rouge DICA, surfaces subtiles
- **Typographie** : passer à une font premium (ex: "Plus Jakarta Sans" ou "Outfit") pour les titres, garder une sans-serif clean pour le body
- **Tokens CSS** : refonte des variables `index.css` (backgrounds, surfaces, borders, shadows élégantes)
- **Dark mode repensé** : vrai mode sombre premium, pas juste une inversion

## Phase 2 — Dashboard (priorité #1)
- **Header/Nav** : navigation épurée avec logo bien intégré, profil minimaliste, fond translucide avec backdrop-blur
- **Cards projets** : redesign avec ombres douces, hover subtil avec scale, bordures fines, espacement généreux
- **Statistiques** : widgets avec glassmorphism léger, icônes raffinées
- **Animations** : entrées en fade-in/slide-up avec framer-motion, transitions fluides
- **Espacement** : plus de "breathing room", grille aérée

## Phase 3 — Composants communs
- **Boutons** : variantes premium (gradient subtil, shadow au hover)
- **Dialogs/Modals** : fond blur, animations d'entrée/sortie
- **Inputs/Forms** : style épuré avec focus rings élégants
- **Toasts/Notifications** : redesign cohérent avec le nouveau style

## Phase 4 — Pages secondaires (si validé)
- Page projet/détail
- Page favoris
- Page aide

---

## ⚠️ Ce qui NE change PAS
- Aucune modification des services (API, Supabase, edge functions)
- Aucune modification de la logique de routing
- Aucune modification des hooks métier
- Aucune modification de la structure de données

## 📐 Approche technique
- Modification de `index.css` et `tailwind.config.ts` pour les tokens
- Modification des composants UI (cards, buttons, etc.) via leurs variantes
- Ajout de `framer-motion` pour les animations
- Chaque phase testable indépendamment
