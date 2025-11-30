# 📄 Plaquette PDF DICA DÉCOR - Co-branding Revendeurs

## 🎯 Vue d'ensemble

Le système de plaquettes PDF permet de générer des documents professionnels A4 haute qualité pour les projets DICA DÉCOR, avec support optionnel du co-branding revendeurs.

## 🏗️ Architecture

```
src/
├── types/
│   └── plaquette.types.ts      # Types & interfaces
├── services/
│   ├── plaquette-pdf.service.ts    # Service de génération
│   └── __tests__/
│       └── plaquette-pdf.service.test.ts  # 93 tests TDD
└── components/
    ├── ui/
    │   └── plaquette-export-button.tsx     # Bouton d'export UI
    └── admin/
        └── reseller-branding-settings.tsx  # Config admin
```

## 📋 Modes de génération

### 1. Mode Full DICA (par défaut)
- Header : Logo DICA + tagline
- Contenu : Projet, images, décors
- Footer : DICA France + disclaimer
- Utilisé quand co-branding désactivé

### 2. Mode Co-Branded (revendeurs)
- Strip DICA discret en haut
- Bloc revendeur proéminent : logo, nom, contact
- Contenu : Projet, images, décors  
- Footer : Attribution DICA + mention revendeur

## 🔧 Configuration

### Paramètres globaux (AppSettings)

```typescript
interface AppSettings {
  resellerBrandingEnabled: boolean;  // Toggle global
  defaultImageQuality: number;       // 0-100, défaut: 90
  minImageResolution: number;        // px, défaut: 1600
  showDisclaimer: boolean;           // Défaut: true
  dateFormat: 'short' | 'long' | 'full';
  includeQRCode: boolean;
  templateVersion: string;
}
```

### Configuration revendeur (ResellerBranding)

```typescript
interface ResellerBranding {
  enabled: boolean;           // Actif pour ce revendeur
  companyName: string;        // OBLIGATOIRE
  logoUrl?: string;           // URL logo (recommandé)
  contactName?: string;       // Nom du contact
  phone?: string;             // Téléphone
  email?: string;             // Email
  website?: string;           // Site web
  addressLine1?: string;      // Adresse
  city?: string;              // Ville
  postalCode?: string;        // Code postal
  country?: string;           // Pays
  accentColorHex?: string;    // Couleur d'accent (#RRGGBB)
  tagline?: string;           // Slogan
  siret?: string;             // Numéro SIRET
}
```

## 🎨 Guide de style

### Logo revendeur
- **Format** : PNG transparent recommandé
- **Taille** : 200x200 px minimum
- **Zone d'affichage** : Rectangle adaptatif, max 100x40mm

### Couleur d'accent
- **Format** : Hexadécimal (#RRGGBB)
- **Usage** : Titres du bloc revendeur uniquement
- **Restriction** : Ne remplace jamais le rouge DICA (#E94E5D)

### Textes
- **Nom société** : Max 50 caractères recommandés
- **Tagline** : Max 80 caractères
- **Adresse** : Assemblage automatique des champs

## 💡 Utilisation

### Composant d'export

```tsx
import { PlaquetteExportButton } from '@/components/ui/plaquette-export-button';

<PlaquetteExportButton
  project={project}
  decors={decors}
  images={renders}
  originalImage={originalPhotoUrl}
  resellerBranding={userBranding}
  appSettings={{ resellerBrandingEnabled: true }}
  onExportComplete={(filename) => console.log('Export:', filename)}
/>
```

### Service direct

```typescript
import { PlaquettePdfService } from '@/services/plaquette-pdf.service';

const service = new PlaquettePdfService();

const result = await service.generatePlaquette({
  project,
  decors,
  images,
  resellerBranding,
  appSettings,
  includeComparison: true,
  originalImage,
});

if (result.success && result.blob) {
  // Télécharger le PDF
  const url = URL.createObjectURL(result.blob);
  // ...
}
```

### Configuration admin

```tsx
import { ResellerBrandingSettings } from '@/components/admin/reseller-branding-settings';

<ResellerBrandingSettings
  currentBranding={currentBranding}
  isCoBrandingEnabled={settings.resellerBrandingEnabled}
  onToggleCoBranding={(enabled) => updateSettings({ resellerBrandingEnabled: enabled })}
  onSaveBranding={async (branding) => saveBrandingToDatabase(branding)}
/>
```

## 🔄 Logique de fallback

| Condition | Résultat |
|-----------|----------|
| Co-branding désactivé globalement | Full DICA |
| Pas de config revendeur | Full DICA |
| Config revendeur incomplète (pas de nom) | Full DICA |
| Revendeur désactivé (`enabled: false`) | Full DICA |
| Config valide + co-branding activé | Co-Branded |

## 📊 Validation

Le service valide automatiquement :

1. **Données projet** : Nom requis
2. **Images** : Au moins une image requise
3. **Décors** : Au moins un décor requis
4. **Résolution** : Avertissement si < 1600px
5. **Branding revendeur** :
   - Format email valide
   - Format téléphone valide
   - Format couleur hex valide
   - URL logo accessible

## 🧪 Tests

93 tests TDD couvrent :

- ✅ Initialisation du service
- ✅ Validation du branding revendeur (11 tests)
- ✅ Détermination du layout (8 tests)
- ✅ Validation des données projet (7 tests)
- ✅ Génération contenu Full DICA (11 tests)
- ✅ Génération contenu Co-Branded (10 tests)
- ✅ Gestion des images (8 tests)
- ✅ Génération PDF (8 tests)
- ✅ Gestion des erreurs (5 tests)
- ✅ Layout comparaison (3 tests)
- ✅ Multi-page (3 tests)
- ✅ Events de progression (6 tests)
- ✅ Méthodes utilitaires (9 tests)

## ⚠️ Limites connues

1. **Taille du logo** : Les logos trop grands seront redimensionnés
2. **Textes longs** : Troncature automatique après 50 caractères
3. **Images non accessibles** : Échec silencieux avec fallback
4. **PDF volumineux** : Multi-image peut créer des fichiers > 10 MB

## 🔒 Sécurité

- URLs d'images validées avant chargement
- Pas de données sensibles dans les métadonnées PDF
- Branding revendeur stocké côté serveur uniquement

## 📝 Changelog

### v2.0.0
- Génération PDF A4 premium
- Support co-branding revendeurs
- Toggle admin global
- 93 tests TDD
- Composants UI (export button, admin settings)

---

*Développé par KOREV AI pour DICA France*

