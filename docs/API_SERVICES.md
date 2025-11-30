# 📚 API Services - Documentation Technique

> Documentation complète des services DICA Decorator  
> Version 2.0.0 | Développé par KOREV AI pour DICA France

---

## Table des Matières

1. [ImageComparisonService](#1-imagecomparisonservice)
2. [PDFExportService](#2-pdfexportservice)
3. [ShareLinkService](#3-sharelinkservice)
4. [AnalyticsService](#4-analyticsservice)
5. [PresentationService](#5-presentationservice)

---

## 1. ImageComparisonService

Service de comparaison avant/après avec slider interactif.

### Import

```typescript
import { 
  ImageComparisonService, 
  ComparisonConfig, 
  ImagePair 
} from '@/services';
```

### Utilisation de base

```typescript
const service = new ImageComparisonService();

// Configuration
service.configure({
  orientation: 'horizontal',
  initialPosition: 50,
  showLabels: true,
  sliderColor: '#E94E5D',
});

// Validation d'une paire d'images
const pair: ImagePair = {
  before: 'https://example.com/original.jpg',
  after: 'https://example.com/render.jpg',
  metadata: { decorCode: '3020BN' }
};

const validation = service.validateImagePair(pair);
// { valid: true, errors: [] }

// Calcul des clip paths
const clipPaths = service.calculateClipPaths(50, 'horizontal');
// { before: 'inset(0 50% 0 0)', after: 'inset(0 0 0 50%)' }
```

### Méthodes principales

| Méthode | Description | Retour |
|---------|-------------|--------|
| `configure(options)` | Configurer le slider | `void` |
| `validateImagePair(pair)` | Valider une paire d'images | `ValidationResult` |
| `calculatePosition(%, size, orientation)` | Calculer la position | `SliderPosition` |
| `calculateClipPaths(%, orientation)` | Obtenir les clip-paths CSS | `ClipPaths` |
| `setPosition(position)` | Définir la position | `void` |
| `animateTo(target, options)` | Animer vers une position | `Promise<void>` |
| `getAriaAttributes()` | Attributs d'accessibilité | `AriaAttributes` |

### Presets disponibles

```typescript
service.applyPreset('dica-default');  // Style DICA standard
service.applyPreset('dica-dark');     // Mode sombre
service.applyPreset('minimal');       // Sans labels
```

---

## 2. PDFExportService

Service d'export PDF pour plaquettes commerciales et devis.

### Import

```typescript
import { 
  PDFExportService, 
  PlaquetteData, 
  DevisData 
} from '@/services';
```

### Générer une plaquette

```typescript
const service = new PDFExportService();
service.applyPreset('dica-commercial');

const data: PlaquetteData = {
  projectTitle: 'Aménagement Ascenseur',
  clientName: 'Société ABC',
  clientRef: 'CMD-2024-001',
  date: new Date(),
  renders: [
    {
      imageUrl: 'https://...',
      decorName: 'Inox Brossé Premium',
      decorCode: '3020BN',
      description: 'Finition métallique élégante'
    }
  ],
  contactInfo: {
    name: 'Commercial DICA',
    email: 'contact@dica.fr',
    phone: '+33 1 23 45 67 89'
  },
  includeComparison: true
};

// Validation
const validation = service.validatePlaquetteData(data);

// Génération
const content = service.generatePlaquetteContent(data);
const blob = await service.generatePDFBlob(content);
const filename = service.generateFilename({
  template: 'plaquette',
  projectTitle: data.projectTitle,
  date: data.date
});

// Téléchargement
await service.downloadPDF(blob, filename);
```

### Générer un devis

```typescript
const devisData: DevisData = {
  reference: 'DEV-2024-001',
  date: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  client: {
    name: 'Client ABC',
    address: '123 Rue Example, 75001 Paris',
    contact: 'M. Dupont',
    email: 'contact@client.fr'
  },
  items: [
    { description: 'Panneau Inox 3020BN', quantity: 10, unitPrice: 150, unit: 'panneau' },
    { description: 'Panneau Marbre MB-001', quantity: 5, unitPrice: 200, unit: 'panneau' }
  ],
  conditions: 'Livraison sous 15 jours ouvrés'
};

// Calcul des totaux
const totals = service.calculateDevisTotals(devisData.items);
// { subtotal: 2500, tax: 500, total: 3000 }

// Génération
const content = service.generateDevisContent(devisData);
```

### Méthodes utilitaires

```typescript
// Formatage de date
service.formatDate(new Date(), 'long'); // "15 janvier 2024"

// Formatage monétaire
service.formatCurrency(1234.56); // "1 234,56 €"

// Conversion mm vers points
service.mmToPoints(210); // 595.28 (largeur A4)
```

---

## 3. ShareLinkService

Service de partage de projets par lien sécurisé.

### Import

```typescript
import { 
  ShareLinkService, 
  ShareLinkData, 
  ExpirationPreset 
} from '@/services';
```

### Créer un lien de partage

```typescript
const service = new ShareLinkService();

const link = service.createShareLink({
  projectId: 'project-uuid-123',
  createdBy: 'user-uuid-456',
  expirationPreset: '7d',  // '24h' | '7d' | '30d' | '90d' | 'never'
  password: 'secretpassword',  // Optionnel
  permissions: {
    canView: true,
    canDownload: true,
    canComment: false,
    canShare: false
  },
  metadata: {
    clientName: 'Client ABC'
  }
});

// Résultat:
// {
//   token: 'abc123xyz789',
//   url: 'https://dica.app/p/abc123xyz789',
//   expiresAt: Date,
//   isPasswordProtected: true,
//   ...
// }
```

### Valider un lien

```typescript
// Sans mot de passe
const validation = service.validateLink(link);
// { valid: false, requiresPassword: true, errors: [] }

// Avec mot de passe
const validation = service.validateLink(link, 'secretpassword');
// { valid: true, requiresPassword: true, errors: [] }

// Lien expiré
// { valid: false, errors: ['link_expired'] }
```

### Gestion des liens

```typescript
// Révoquer un lien
service.revokeLink(link, 'user-id', 'Raison');

// Prolonger l'expiration
service.extendExpiration(link, 7); // +7 jours

// Modifier les permissions
service.updatePermissions(link, { canDownload: false });

// Changer le mot de passe
service.changePassword(link, 'newpassword');

// Supprimer le mot de passe
service.removePassword(link);
```

### Tracking des accès

```typescript
// Logger un accès
service.logAccess(link.token, {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  referrer: 'https://google.com'
});

// Statistiques
const stats = service.getStats(link.token);
// {
//   totalViews: 42,
//   uniqueVisitors: 15,
//   daysUntilExpiry: 5,
//   isActive: true
// }

// Historique des accès
const history = service.getAccessHistory(link.token, 10);
```

### Opérations batch

```typescript
// Créer plusieurs liens
const links = service.createBatchLinks({
  projectId: 'p1',
  createdBy: 'u1',
  count: 5,
  expirationDays: 30
});

// Révoquer tous les liens d'un projet
const count = service.revokeAllForProject('p1', 'u1');

// Lister les liens d'un projet
const projectLinks = service.getLinksForProject('p1', { activeOnly: true });
```

---

## 4. AnalyticsService

Service d'analytics et statistiques pour le dashboard admin.

### Import

```typescript
import { 
  AnalyticsService, 
  GlobalMetrics, 
  TrendData,
  PeriodPreset 
} from '@/services';
```

### Métriques globales

```typescript
const service = new AnalyticsService();

const metrics = service.getGlobalMetrics();
// {
//   totalProjects: 150,
//   totalRenders: 2500,
//   totalUsers: 45,
//   activeUsers: 32,
//   totalDecors: 89,
//   avgRendersPerProject: 16.6,
//   engagementRate: 71.1
// }
```

### Tendances

```typescript
const trend = service.getTrend('renders', '30d');
// {
//   data: [{ date: '01/01', value: 45 }, ...],
//   direction: 'up',
//   percentageChange: 23.5
// }

// Types de métriques: 'renders' | 'projects' | 'users' | 'decors'
```

### Top items

```typescript
const topDecors = service.getTopItems('decors', 5);
// [
//   { id: '1', name: 'Inox Brossé', value: 245, code: '3020BN' },
//   { id: '2', name: 'Marbre Blanc', value: 189, code: 'MB-001' },
//   ...
// ]

const topUsers = service.getTopItems('users', 10);
```

### Charts

```typescript
const chartData = service.getChartData('line', 'renders', '30d');
// {
//   type: 'line',
//   labels: ['01/01', '02/01', ...],
//   datasets: [{
//     label: 'renders',
//     data: [45, 52, 48, ...],
//     backgroundColor: '#E94E5D'
//   }]
// }

// Types: 'line' | 'bar' | 'pie' | 'area'
```

### Rapports

```typescript
const report = service.generateReport('30d');

// Export JSON
const json = service.formatReportForExport(report, 'json');

// Export CSV
const csv = service.formatReportForExport(report, 'csv');
```

### Comparaison de périodes

```typescript
const comparison = service.comparePerids('30d', 'previous30d');
// {
//   renders: { current: 500, previous: 400, change: 25, direction: 'up' },
//   projects: { current: 50, previous: 45, change: 11.1, direction: 'up' },
//   users: { current: 30, previous: 32, change: -6.25, direction: 'down' }
// }
```

### Cache

```typescript
// Le cache est activé par défaut (5 min)
service.configure({ cacheDuration: 300, enableCaching: true });

// Invalider le cache
service.invalidateCache();
```

---

## 5. PresentationService

Service de mode présentation fullscreen avec slideshow.

### Import

```typescript
import { 
  PresentationService, 
  Slide, 
  PresentationState 
} from '@/services';
```

### Configuration

```typescript
const service = new PresentationService();

service.configure({
  transitionDuration: 500,
  transitionType: 'fade',  // 'fade' | 'slide' | 'zoom' | 'flip' | 'none'
  enableKeyboard: true,
  enableSwipe: true,
  showControls: true,
  showProgress: true,
  loopSlides: true,
  backgroundColor: '#000000'
});

// Presets
service.applyPreset('dica-commercial');
service.applyPreset('minimal');
```

### Gestion des slides

```typescript
// Types de slides: 'image' | 'comparison' | 'video' | 'text' | 'title'

// Ajouter des slides
service.addSlide({
  id: 'slide-1',
  type: 'title',
  content: 'Présentation DICA',
  title: 'Introduction',
  subtitle: 'Expert en stratifiés HPL'
});

service.addSlide({
  id: 'slide-2',
  type: 'image',
  content: 'https://example.com/render.jpg',
  title: 'Rendu Inox Brossé',
  decorName: 'Inox Brossé Premium',
  decorCode: '3020BN'
});

service.addSlide({
  id: 'slide-3',
  type: 'comparison',
  content: 'render.jpg',
  metadata: {
    beforeImage: 'original.jpg',
    afterImage: 'render.jpg'
  }
});

// Ajouter plusieurs slides
service.addSlides([slide1, slide2, slide3]);

// Supprimer
service.removeSlide('slide-1');

// Réordonner
service.reorderSlide('slide-3', 0);

// Vider
service.clearSlides();
```

### Navigation

```typescript
// Navigation basique
service.next();
service.previous();
service.goTo(5);
service.goToFirst();
service.goToLast();

// État
const index = service.getCurrentIndex();
const slide = service.getCurrentSlide();
const hasNext = service.hasNext();
const hasPrevious = service.hasPrevious();
```

### État et événements

```typescript
// État courant
const state = service.getState();
// {
//   currentIndex: 2,
//   totalSlides: 10,
//   isPlaying: true,
//   isFullscreen: false,
//   isPaused: false,
//   progress: 20
// }

// Abonnement aux changements
const unsubscribe = service.onStateChange((state) => {
  console.log('New state:', state);
});

// Événement de changement de slide
service.onSlideChange((slide, index, direction) => {
  console.log(`Slide ${index}: ${slide.title} (${direction})`);
});

// Événement de sortie
service.onExit(() => {
  console.log('Presentation closed');
});
```

### Autoplay

```typescript
// Démarrer l'autoplay
service.startAutoplay({ interval: 5000 });

// Contrôles
service.pauseAutoplay();
service.resumeAutoplay();
service.stopAutoplay();
service.toggleAutoplay();
```

### Fullscreen

```typescript
// Entrer en fullscreen
await service.enterFullscreen(element);

// Sortir
await service.exitFullscreen();

// Toggle
service.toggleFullscreen(element);
```

### Clavier

```typescript
// Raccourcis par défaut:
// - ArrowRight/ArrowDown: Slide suivant
// - ArrowLeft/ArrowUp: Slide précédent
// - Space: Play/Pause
// - Escape: Quitter
// - Home: Premier slide
// - End: Dernier slide

// Handler (utilisé automatiquement si enableKeyboard: true)
service.handleKeyDown(event);
```

### Transitions CSS

```typescript
const css = service.getTransitionCSS();
// "opacity 500ms ease-in-out"

const classes = service.getTransitionClasses('next');
// { enter: 'transition-fade-enter-next', exit: 'transition-fade-exit-next' }
```

---

## Composants UI Associés

### BeforeAfterSlider

```tsx
import { BeforeAfterSlider } from '@/components/ui/before-after-slider';

<BeforeAfterSlider
  beforeImage="/original.jpg"
  afterImage="/render.jpg"
  beforeLabel="Photo originale"
  afterLabel="Avec décor DICA"
  initialPosition={50}
  orientation="horizontal"
  showLabels={true}
  sliderColor="#E94E5D"
  aspectRatio="4/3"
  metadata={{ decorName: 'Inox', decorCode: '3020BN' }}
  onPositionChange={(pos) => console.log(pos)}
/>
```

### PDFExportButton

```tsx
import { PDFExportButton } from '@/components/ui/pdf-export-button';

<PDFExportButton
  projectTitle="Mon Projet"
  projectId="uuid"
  renders={renders}
  clientName="Client ABC"
  variant="outline"
/>
```

### ShareLinkDialog

```tsx
import { ShareLinkDialog } from '@/components/ui/share-link-dialog';

<ShareLinkDialog
  projectId="uuid"
  projectTitle="Mon Projet"
  userId="user-uuid"
  existingLinks={links}
  onLinkCreated={(link) => console.log(link)}
  onLinkRevoked={(id) => console.log(id)}
/>
```

### PresentationViewer

```tsx
import { PresentationViewer } from '@/components/ui/presentation-viewer';

<PresentationViewer
  slides={slides}
  autoStart={false}
  autoplayInterval={5000}
  transition="fade"
  loop={true}
  showControls={true}
  showProgress={true}
  showThumbnails={false}
  onClose={() => navigate(-1)}
  onSlideChange={(index, slide) => console.log(index)}
/>
```

---

## Tests

Tous les services sont testés avec Vitest (TDD strict):

| Service | Tests |
|---------|-------|
| ImageComparisonService | 67 |
| PDFExportService | 58 |
| ShareLinkService | 58 |
| AnalyticsService | 49 |
| PresentationService | 67 |
| **Total** | **299** |

```bash
# Lancer les tests
npm run test:run

# Couverture
npm run test:coverage
```

---

© 2025 KOREV AI pour DICA France

