# 🔍 PROMPT DE CONTRÔLE - Plaquette PDF DICA DÉCOR

## Objectif
Vérifier que le système de génération de plaquettes PDF fonctionne correctement dans tous les scénarios.

---

## 🧪 Scénarios de test

### Scénario 1 : Plaquette Full DICA (sans revendeur)

```typescript
const options = {
  project: {
    id: 'test-1',
    name: 'Ascenseur - Résidence Les Tilleuls',
    type: 'ascenseur',
    clientName: 'Groupe Immobilier XYZ',
    createdAt: new Date(),
  },
  decors: [{
    id: 'd1',
    name: 'Chêne Naturel',
    referenceCode: 'CHN-2150',
    collection: 'Bois Premium',
    finish: 'Mat',
  }],
  images: [{
    id: 'img1',
    url: 'https://exemple.com/render.jpg',
    decorId: 'd1',
    decorName: 'Chêne Naturel',
    decorCode: 'CHN-2150',
    isHighResolution: true,
    createdAt: new Date(),
  }],
  resellerBranding: null,
  appSettings: {
    resellerBrandingEnabled: false,
    defaultImageQuality: 90,
    minImageResolution: 1600,
    showDisclaimer: true,
    dateFormat: 'long',
    includeQRCode: false,
    templateVersion: '1.0.0',
  },
};
```

**Vérifications attendues :**
- [ ] Header contient "DICA France" et "Projection de décors stratifiés"
- [ ] Logo positionné à gauche
- [ ] Titre projet affiché clairement
- [ ] Image rendu centrée, haute qualité
- [ ] Informations décor (nom, réf, collection, finition) visibles
- [ ] Footer avec "www.dica-france.com"
- [ ] Disclaimer "Visuel non contractuel" présent
- [ ] Numéro de page affiché
- [ ] Aucun bloc revendeur

---

### Scénario 2 : Plaquette Co-Branded (revendeur complet)

```typescript
const options = {
  project: { /* comme scénario 1 */ },
  decors: [{ /* comme scénario 1 */ }],
  images: [{ /* comme scénario 1 */ }],
  resellerBranding: {
    enabled: true,
    companyName: 'Décors Pro Paris',
    logoUrl: 'https://exemple.com/logo.png',
    contactName: 'Jean Dupont',
    phone: '+33 1 23 45 67 89',
    email: 'contact@decorspro.fr',
    website: 'www.decorspro.fr',
    addressLine1: '123 Avenue des Décors',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    accentColorHex: '#2563EB',
    tagline: 'Votre partenaire décoration',
  },
  appSettings: {
    ...DEFAULT_APP_SETTINGS,
    resellerBrandingEnabled: true,
  },
};
```

**Vérifications attendues :**
- [ ] Strip "App DICA DÉCOR" visible en haut
- [ ] Bloc revendeur proéminent sous le strip
- [ ] Nom revendeur en couleur d'accent (#2563EB)
- [ ] Logo revendeur affiché (si fourni)
- [ ] Contact (téléphone, email, site) affiché
- [ ] Tagline visible
- [ ] Footer avec attribution : "Plaquette générée par l'app DICA DÉCOR pour le compte de : Décors Pro Paris"
- [ ] DICA France toujours visible en footer
- [ ] Disclaimer toujours présent

---

### Scénario 3 : Revendeur partiel (sans logo)

```typescript
const resellerBranding = {
  enabled: true,
  companyName: 'Test Company',
  // Pas de logoUrl
  email: 'test@example.com',
};
```

**Vérifications attendues :**
- [ ] Nom de la société affiché à la place du logo
- [ ] Layout co-branded appliqué
- [ ] Pas d'erreur de génération
- [ ] Validation indique "isComplete: false" mais "isValid: true"

---

### Scénario 4 : Co-branding désactivé globalement

```typescript
const appSettings = {
  resellerBrandingEnabled: false, // ← Désactivé
  // ...
};

const resellerBranding = {
  enabled: true,
  companyName: 'Décors Pro Paris',
  // Config complète
};
```

**Vérifications attendues :**
- [ ] Plaquette générée en mode Full DICA
- [ ] Aucun bloc revendeur affiché
- [ ] Header standard DICA
- [ ] Les données revendeur sont ignorées

---

### Scénario 5 : Revendeur désactivé individuellement

```typescript
const resellerBranding = {
  enabled: false, // ← Désactivé pour ce revendeur
  companyName: 'Décors Pro Paris',
  // ...
};
```

**Vérifications attendues :**
- [ ] Fallback vers Full DICA
- [ ] Validation contient warning "branding_disabled"

---

### Scénario 6 : Données invalides

```typescript
const resellerBranding = {
  enabled: true,
  companyName: '', // ← Vide = invalide
  email: 'not-an-email', // ← Format invalide
  accentColorHex: 'bleu', // ← Couleur invalide
};
```

**Vérifications attendues :**
- [ ] Validation "isValid: false"
- [ ] missingFields contient "companyName"
- [ ] warnings contient "invalid_email_format"
- [ ] warnings contient "invalid_accent_color"
- [ ] Fallback vers Full DICA

---

## 📊 Checklist de qualité visuelle

### Layout général
- [ ] Marges cohérentes (15-20mm)
- [ ] Pas de texte coupé
- [ ] Espacement harmonieux
- [ ] Hiérarchie typographique claire

### Images
- [ ] Ratio préservé
- [ ] Pas de pixelisation visible
- [ ] Centrage correct
- [ ] Ombre légère (si applicable)

### Typographie
- [ ] Titres en gras lisibles
- [ ] Corps de texte >= 10pt
- [ ] Couleurs contrastées (WCAG AA minimum)

### Co-branding
- [ ] Logo revendeur non déformé
- [ ] Couleur d'accent utilisée subtilement
- [ ] DICA toujours visible
- [ ] Distinction claire revendeur vs DICA

---

## 🔧 Ajustements potentiels (Sprint UI PDF suivant)

1. **Marges dynamiques** : Adapter selon contenu
2. **Multi-colonnes** : Pour infos décor
3. **QR Code** : Lien vers projet en ligne
4. **Filigrane** : "DICA DÉCOR" discret
5. **Mode sombre** : Version PDF fond sombre
6. **Multi-langue** : EN, DE, ES
7. **Templates** : Minimaliste, Commercial, Technique
8. **Gestion logos bizarres** : Détection ratio extrême
9. **Compression intelligente** : Réduire poids si > 5 MB
10. **Preview in-app** : Afficher avant téléchargement

---

## ✅ Validation finale

Après exécution de tous les scénarios :

| Critère | Status |
|---------|--------|
| Full DICA génère correctement | ⬜ |
| Co-branded génère correctement | ⬜ |
| Fallback fonctionne | ⬜ |
| Validation détecte les erreurs | ⬜ |
| Images haute résolution | ⬜ |
| DICA toujours visible | ⬜ |
| Ouverture Chrome/Acrobat/Preview OK | ⬜ |
| Impression A4 correcte | ⬜ |

---

*Prompt de contrôle généré par KOREV AI pour DICA France*

