/**
 * @fileoverview Tests de caractérisation pour la page ProjectDetail.
 *
 * Filet anti-régression du LOT 4 (vague 2). Ces tests décrivent le
 * comportement OBSERVABLE ACTUEL de la page AVANT refacto de complexité :
 * chargement, états vide/chargement/erreur, rendu des sections (photos,
 * créations IA, rendus), upload (+ association des labels a11y du LOT 3),
 * favoris, suppression et navigation.
 *
 * Le backend Supabase de test étant indisponible (projet en pause), le client
 * Supabase et les services sont MOCKÉS (pas d'E2E). Les sélecteurs privilégient
 * les rôles/textes accessibles afin de rester valides après extraction de
 * sous-composants/hooks.
 *
 * @author KOREV AI pour DICA France
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@/test/test-utils';

// ============================================================================
// Holders hoistés (référencés dans les factories vi.mock)
// ============================================================================

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { id: 'test-user-id', email: 'test@dica.com' } as { id: string; email: string } | null,
  responses: {} as Record<string, { data: unknown; error: unknown } | Promise<unknown>>,
  invoke: vi.fn(),
  uploadResult: { data: { path: 'p' }, error: null } as { data: unknown; error: unknown },
}));

// Constructeur de "query builder" Supabase : thenable + chaînable.
// Quel que soit l'endroit où la chaîne se termine (.single(), .order(), .eq(),
// .insert()...), l'attente (await) résout la réponse configurée pour la table.
const makeBuilder = (result: unknown) => {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'eq', 'in', 'order',
    'single', 'maybeSingle', 'not', 'gte', 'lte', 'range', 'limit',
  ];
  for (const m of methods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
};

// ============================================================================
// Mocks de modules
// ============================================================================

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) =>
      makeBuilder(mocks.responses[table] ?? { data: null, error: null }),
    ),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve(mocks.uploadResult)),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test/uploaded.jpg' } })),
        download: vi.fn(),
      })),
    },
    functions: { invoke: mocks.invoke },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    session: null,
    isLoading: false,
    userRole: 'client',
    isPasswordRecovery: false,
    setIsPasswordRecovery: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/image-compression', () => ({
  compressImage: vi.fn(() => Promise.resolve(new Blob(['compressed'], { type: 'image/jpeg' }))),
  formatFileSize: vi.fn(() => '1 KB'),
}));

// Sous-composants lourds : stubs minimalistes (focus sur la logique de la page)
vi.mock('@/components/ui/premium-layout', () => ({
  PremiumLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContentContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SectionTitle: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">theme</button>,
}));

vi.mock('@/components/ui/safe-image', () => ({
  SafeImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/components/ui/share-link-dialog', () => ({
  ShareLinkDialog: () => <button type="button">partager</button>,
}));

vi.mock('@/components/ui/reseller-brochure-export-button', () => ({
  ResellerBrochureExportButton: () => <button type="button">brochure</button>,
}));

vi.mock('@/components/ui/magazine-deco-export-button', () => ({
  MagazineDecoExportButton: () => <button type="button">magazine</button>,
}));

vi.mock('@/components/ui/before-after-slider', () => ({
  BeforeAfterSlider: () => <div>slider</div>,
}));

vi.mock('@/components/decor-selector', () => ({
  DecorSelectorDialog: ({ open }: { open: boolean }) => (open ? <div>dialogue-decor</div> : null),
}));

vi.mock('@/components/ui/image-export-dropdown', () => ({
  ImageExportDropdown: ({ filename }: { filename?: string }) => (
    <button type="button">export-{filename}</button>
  ),
  ImageExportMenuItems: () => <div>export-items</div>,
}));

// Import APRÈS les mocks
import ProjectDetail from '../ProjectDetail';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compression';

// ============================================================================
// Données de test
// ============================================================================

const PROJECT = {
  id: 'test-project-id',
  title: 'Projet Test',
  use_case: 'ascenseur',
  client_reference: 'REF-001',
};

const PHOTO = {
  id: 'photo-1',
  original_image_url: 'https://test/photo-1.jpg',
  created_at: '2024-01-01T10:00:00Z',
};

const DECOR = {
  id: 'decor-1',
  name: 'Inox Brossé',
  reference_code: 'DIC-A23',
  texture_image_url: 'https://test/decor-1.jpg',
  usage_contexts: ['ascenseur'],
  category: 'metal',
  is_active: true,
};

const RENDER_DECOR = {
  id: 'render-1',
  result_image_url: 'https://test/render-1.jpg',
  decor_id: 'decor-1',
  created_at: '2024-01-02T10:00:00Z',
  project_photo_id: 'photo-1',
};

const RENDER_CREATIVE = {
  id: 'creative-1',
  result_image_url: 'https://test/creative-1.jpg',
  decor_id: null,
  created_at: '2024-01-03T10:00:00Z',
  project_photo_id: 'photo-1',
};

const PROFILE = {
  cobranding_enabled: false,
  company_name: null,
  contact_name: null,
  email: null,
  phone: null,
  addressline1: null,
  addressline2: null,
  city: null,
  postal_code: null,
  website: null,
  tagline: null,
};

const setHappyPathResponses = () => {
  mocks.responses = {
    profiles: { data: PROFILE, error: null },
    render_favorites: { data: [], error: null },
    projects: { data: PROJECT, error: null },
    project_photos: { data: [PHOTO], error: null },
    render_results: { data: [RENDER_DECOR, RENDER_CREATIVE], error: null },
    decors: { data: [DECOR], error: null },
  };
};

// ============================================================================
// Suite de tests
// ============================================================================

describe('ProjectDetail (caractérisation avant refacto LOT 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'test-user-id', email: 'test@dica.com' };
    mocks.uploadResult = { data: { path: 'p' }, error: null };
    setHappyPathResponses();
  });

  describe('Chargement & en-tête', () => {
    it('affiche le titre du projet et le libellé du cas d\'usage une fois chargé', async () => {
      render(<ProjectDetail />);

      expect(await screen.findByRole('heading', { name: 'Projet Test' })).toBeInTheDocument();
      expect(screen.getByText('Ascenseur')).toBeInTheDocument();
    });

    it('affiche la section "Photos du projet" et son sous-titre', async () => {
      render(<ProjectDetail />);

      expect(await screen.findByText('Photos du projet')).toBeInTheDocument();
      expect(
        screen.getByText('Uploadez vos photos et appliquez les décors DICA en un clic.'),
      ).toBeInTheDocument();
    });

    it('déclenche les chargements Supabase attendus au montage', async () => {
      render(<ProjectDetail />);

      await screen.findByText('Photos du projet');

      const tables = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(tables).toContain('projects');
      expect(tables).toContain('project_photos');
      expect(tables).toContain('decors');
      expect(tables).toContain('render_favorites');
      expect(tables).toContain('profiles');
    });
  });

  describe('États : chargement / vide / erreur', () => {
    it('affiche l\'indicateur de chargement des créations IA tant que les rendus ne sont pas résolus', async () => {
      // render_results ne se résout jamais => isLoadingRenders reste vrai
      mocks.responses.render_results = new Promise<never>(() => {});

      render(<ProjectDetail />);

      expect(await screen.findByText('Chargement...')).toBeInTheDocument();
    });

    it('affiche l\'état vide quand le projet n\'a ni photo ni création', async () => {
      mocks.responses.project_photos = { data: [], error: null };

      render(<ProjectDetail />);

      expect(await screen.findByText('Aucune photo')).toBeInTheDocument();
      expect(
        screen.getByText(/Commencez par uploader une photo/),
      ).toBeInTheDocument();
    });

    it('redirige vers le dashboard et notifie en cas d\'erreur de chargement du projet', async () => {
      mocks.responses.projects = { data: null, error: { message: 'boom' } };

      render(<ProjectDetail />);

      await waitFor(() => {
        expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
      });
      expect(toast.error).toHaveBeenCalledWith('Erreur lors du chargement du projet');
    });
  });

  describe('Rendu des sections', () => {
    it('affiche la section "Créations Assistant IA" avec son compteur', async () => {
      render(<ProjectDetail />);

      expect(await screen.findByText('Créations Assistant IA')).toBeInTheDocument();
      // 1 seule création IA (render avec decor_id null)
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('affiche la carte photo avec le bouton "Appliquer un décor" et le compteur de rendus', async () => {
      render(<ProjectDetail />);

      expect(await screen.findByText('Photo originale')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Appliquer un décor/ })).toBeInTheDocument();
      expect(screen.getByText('Rendus générés (1)')).toBeInTheDocument();
    });
  });

  describe('Accessibilité des uploads (LOT 3)', () => {
    it('associe le label principal d\'upload à l\'input via htmlFor + aria-label', async () => {
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Photos du projet');

      const input = container.querySelector('#photo-upload');
      const label = container.querySelector('label[for="photo-upload"]');
      expect(input).not.toBeNull();
      expect(input).toHaveAttribute('type', 'file');
      expect(label).not.toBeNull();
      expect(label).toHaveAttribute('aria-label', 'Uploader des photos du projet');
    });

    it('associe le label d\'upload de l\'état vide à son input dédié', async () => {
      mocks.responses.project_photos = { data: [], error: null };
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Aucune photo');

      const input = container.querySelector('#photo-upload-empty');
      const label = container.querySelector('label[for="photo-upload-empty"]');
      expect(input).not.toBeNull();
      expect(input).toHaveAttribute('type', 'file');
      expect(label).toHaveAttribute('aria-label', 'Uploader la première photo du projet');
    });
  });

  describe('Parcours : upload de photo', () => {
    it('compresse, upload et notifie le succès après sélection d\'un fichier image', async () => {
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Photos du projet');

      const input = container.querySelector('#photo-upload') as HTMLInputElement;
      const file = new File(['x'.repeat(2048)], 'photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalled();
      });
      expect(supabase.storage.from).toHaveBeenCalledWith('project-photos');
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Photo ajoutée'));
      });
    });

    it('refuse un fichier non-image et affiche une erreur', async () => {
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Photos du projet');

      const input = container.querySelector('#photo-upload') as HTMLInputElement;
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Veuillez sélectionner une image valide');
      });
      expect(compressImage).not.toHaveBeenCalled();
    });
  });

  describe('Parcours : favoris', () => {
    it('ajoute une création IA aux favoris et notifie le succès', async () => {
      render(<ProjectDetail />);
      await screen.findByText('Créations Assistant IA');

      const addButton = screen.getByRole('button', { name: 'Ajouter' });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Ajouté aux favoris');
      });
    });
  });

  describe('Parcours : suppression (optimistic update)', () => {
    it('supprime une création IA immédiatement et notifie', async () => {
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Créations Assistant IA');

      // La carte de la création IA est identifiable par son image alt "Création IA"
      const creativeImg = screen.getByAltText('Création IA');
      const creativeCard = creativeImg.closest('.group') as HTMLElement;
      const deleteButton = within(creativeCard).getByRole('button', { name: '' });
      // Le bouton sans nom accessible de la carte est la corbeille (icône seule)
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Supprimé !');
      });
    });
  });

  describe('Parcours : suppression de photo', () => {
    it('supprime la photo et notifie le succès', async () => {
      const { container } = render(<ProjectDetail />);
      await screen.findByText('Photo originale');

      const deleteButtons = container.querySelectorAll('button.text-destructive');
      // Dernier bouton destructif = suppression de la photo (carte photo)
      const photoDelete = deleteButtons[deleteButtons.length - 1] as HTMLElement;
      fireEvent.click(photoDelete);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Photo supprimée');
      });
    });
  });

  describe('Navigation', () => {
    it('revient au dashboard via le bouton "Retour"', async () => {
      render(<ProjectDetail />);
      await screen.findByText('Photos du projet');

      fireEvent.click(screen.getByRole('button', { name: /Retour/ }));
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('revient au dashboard via le bouton "Accueil"', async () => {
      render(<ProjectDetail />);
      await screen.findByText('Photos du projet');

      fireEvent.click(screen.getByRole('button', { name: /Accueil/ }));
      expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
