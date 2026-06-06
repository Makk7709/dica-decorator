/**
 * @fileoverview Filet de caractérisation pour la page Creative (Assistant Créatif)
 *
 * Tests composants Vitest + React Testing Library avec Supabase MOCKÉ.
 * Objectif : verrouiller le COMPORTEMENT OBSERVABLE de la page AVANT le refacto
 * de réduction de complexité cognitive (LOT 4 vague 2), puis garantir qu'il
 * reste identique APRÈS extraction des sous-composants / hooks.
 *
 * Le backend Supabase de test étant indisponible (projet en pause), ce filet
 * remplace les E2E Playwright : aucun appel réseau réel, tout est mocké.
 *
 * @author KOREV AI pour DICA France
 * @date 2026-06-06
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import Creative from '../Creative';

// ============================================================================
// Mocks — état Supabase configurable par test
// ============================================================================

interface QueryResult {
  data: unknown;
  error: unknown;
}

const { supabaseMock, mockState } = vi.hoisted(() => {
  const state: { results: Record<string, { data: unknown; error: unknown }> } = {
    results: {},
  };
  const defaultResult = { data: [] as unknown[], error: null };

  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {};
    const result = () => state.results[table] ?? defaultResult;
    const chainable = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'not', 'limit'];
    for (const method of chainable) {
      builder[method] = () => builder;
    }
    builder.single = () => Promise.resolve(result());
    builder.maybeSingle = () => Promise.resolve(result());
    // Le builder est « thenable » : on peut l'await directement (cf. .eq() terminal).
    builder.then = (
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result()).then(onFulfilled, onRejected);
    return builder;
  };

  const supabaseMock = {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'p' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/p.png' } })),
      })),
    },
  };

  return { supabaseMock, mockState: state };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Référence utilisateur STABLE : un nouvel objet à chaque rendu re-déclencherait
// le useEffect([user, navigate]) en boucle (faux positif propre au test).
vi.mock('@/contexts/AuthContext', () => {
  const stableUser = { id: 'test-user-id', email: 'test@dica.com' };
  return {
    useAuth: () => ({ user: stableUser }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

// ThemeToggle dépend d'un ThemeProvider non monté dans le harness de test ;
// il s'agit d'un composant de présentation hors périmètre de ce filet.
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => null,
}));

// jsdom n'implémente pas scrollIntoView (utilisé pour l'auto-scroll du chat).
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ============================================================================
// Helpers
// ============================================================================

const setTable = (table: string, data: unknown, error: unknown = null) => {
  mockState.results[table] = { data, error };
};

const buildFavorite = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'fav-1',
  title: 'Mood board marbre',
  prompt: 'Crée un mood board marbre',
  response: 'Voici votre mood board',
  image_data: null,
  created_at: '2026-01-15T10:00:00Z',
  ...overrides,
});

const buildDecor = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'decor-1',
  name: 'Inox Brossé',
  reference_code: 'DIC-A23',
  category: 'metal',
  usage_contexts: ['ascenseur'],
  texture_image_url: '/textures/inox.jpg',
  ...overrides,
});

const mockFetchJson = (payload: unknown) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => payload,
  }) as unknown as typeof fetch;
};

const mockFetchError = (status = 500) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    headers: { get: () => 'application/json' },
    json: async () => ({ error: 'rate limited' }),
  }) as unknown as typeof fetch;
};

const sendPrompt = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  const input = screen.getByPlaceholderText(/Créer un mood board/i);
  await user.type(input, text);
  // Le bouton d'envoi est l'icône Send (bouton sans label textuel, à droite de l'input).
  const sendButton = input.parentElement?.querySelector('button');
  if (!sendButton) throw new Error('Bouton envoyer introuvable');
  await user.click(sendButton);
};

beforeEach(() => {
  mockState.results = {};
  mockNavigate.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  supabaseMock.from.mockClear();
  supabaseMock.auth.getSession.mockClear();
});

// ============================================================================
// 1. Rendu des sections clés
// ============================================================================

describe('Creative — rendu des sections clés', () => {
  it("affiche l'en-tête Assistant Créatif et le studio", async () => {
    render(<Creative />);

    expect(await screen.findByRole('heading', { name: 'Assistant Créatif' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studio Créatif DICA' })).toBeInTheDocument();
    expect(screen.getByText('Powered by DICA AI')).toBeInTheDocument();
  });

  it('affiche les deux onglets (Nouvelle création / Favoris)', async () => {
    render(<Creative />);

    expect(await screen.findByRole('tab', { name: /Nouvelle création/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Favoris/i })).toBeInTheDocument();
  });

  it('affiche la zone de saisie du prompt et le bloc astuces', async () => {
    render(<Creative />);

    expect(await screen.findByPlaceholderText(/Créer un mood board/i)).toBeInTheDocument();
    expect(screen.getByText('💡 Astuces')).toBeInTheDocument();
    expect(screen.getByText('🏷️ Afficher les références DICA')).toBeInTheDocument();
  });

  it('affiche le message de bienvenue de l’assistant', async () => {
    render(<Creative />);

    expect(
      await screen.findByText(/Bonjour ! Je suis votre assistant créatif DICA/i)
    ).toBeInTheDocument();
  });
});

// ============================================================================
// 2. Catalogue de décors — chargement / succès / erreur
// ============================================================================

describe('Creative — état du catalogue de décors', () => {
  it('affiche le nombre de décors disponibles après chargement', async () => {
    setTable('decors', [buildDecor(), buildDecor({ id: 'decor-2', reference_code: 'DIC-B10' })]);
    render(<Creative />);

    // « {decors.length} disponibles » est scindé en plusieurs nœuds DOM par JSX :
    // un matcher regex tolère cette fragmentation.
    expect(await screen.findByText(/2\s+disponibles/, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('affiche « Indisponible » en cas d’erreur de chargement des décors', async () => {
    setTable('decors', null, { message: 'connexion refusée' });
    render(<Creative />);

    expect(await screen.findByText('Indisponible', {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Erreur lors du chargement des décors')
    );
  });

  it('signale un catalogue vide', async () => {
    setTable('decors', []);
    render(<Creative />);

    expect(
      await screen.findByText('Aucun décor actif trouvé dans le catalogue', {}, { timeout: 4000 })
    ).toBeInTheDocument();
  });
});

// ============================================================================
// 3. Parcours heureux — envoi de prompt et affichage des réponses
// ============================================================================

describe('Creative — envoi de prompt et réponses IA', () => {
  it('affiche le message utilisateur puis la visualisation générée (réponse image)', async () => {
    const user = userEvent.setup();
    mockFetchJson({
      type: 'image',
      text: 'Voici votre visualisation',
      imageUrl: 'data:image/png;base64,AAAA',
      decorReferences: [{ reference: 'DIC-A23', label: 'Inox Brossé' }],
    });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    await sendPrompt(user, 'Mood board marbre');

    expect(await screen.findByText('Mood board marbre')).toBeInTheDocument();
    expect(await screen.findByText('Voici votre visualisation')).toBeInTheDocument();
    expect(screen.getByAltText('Visualisation générée')).toBeInTheDocument();
    expect(screen.getByText('Décors DICA utilisés')).toBeInTheDocument();
    expect(screen.getByText('DIC-A23')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('affiche une réponse texte de l’assistant', async () => {
    const user = userEvent.setup();
    mockFetchJson({ type: 'text', content: 'Réponse textuelle de l’IA' });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    await sendPrompt(user, 'Donne-moi des conseils');

    expect(await screen.findByText('Réponse textuelle de l’IA')).toBeInTheDocument();
  });

  it('affiche un toast d’erreur quand le service IA échoue', async () => {
    const user = userEvent.setup();
    mockFetchError(500);

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    await sendPrompt(user, 'Prompt qui échoue');

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Échec de la connexion au service IA')
    );
  });

  it('envoie le prompt via la touche Entrée', async () => {
    const user = userEvent.setup();
    mockFetchJson({ type: 'text', content: 'Réponse via Entrée' });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    const input = screen.getByPlaceholderText(/Créer un mood board/i);
    await user.type(input, 'Prompt Entrée{Enter}');

    expect(await screen.findByText('Réponse via Entrée')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// 4. Dialogues — favori, projet, zoom
// ============================================================================

describe('Creative — dialogues', () => {
  it('ouvre le dialogue d’enregistrement en favori', async () => {
    const user = userEvent.setup();
    mockFetchJson({ type: 'text', content: 'Réponse à sauvegarder' });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });
    await sendPrompt(user, 'Un prompt');
    await screen.findByText('Réponse à sauvegarder');

    await user.click(screen.getByRole('button', { name: /Sauvegarder en favori/i }));

    expect(await screen.findByRole('heading', { name: 'Sauvegarder en favori' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Mood board marbre salle de bain/i)).toBeInTheDocument();
  });

  it('ouvre le dialogue d’enregistrement dans un projet et zoome l’image', async () => {
    const user = userEvent.setup();
    mockFetchJson({
      type: 'image',
      text: 'Visualisation',
      imageUrl: 'data:image/png;base64,BBBB',
      decorReferences: [],
    });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });
    await sendPrompt(user, 'Génère une image');
    await screen.findByAltText('Visualisation générée');

    // Le dialogue projet est accessible depuis le message de visualisation.
    await user.click(screen.getByRole('button', { name: /Enregistrer dans un projet/i }));
    expect(await screen.findByRole('heading', { name: 'Enregistrer dans un projet' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nom du nouveau projet')).toBeInTheDocument();

    // Fermeture du dialogue puis zoom de l'image (accessibilité LOT 3 : role=button + aria-label)
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Enregistrer dans un projet' })).not.toBeInTheDocument()
    );
    await user.click(screen.getByLabelText('Agrandir la visualisation'));
    expect(await screen.findByAltText('Visualisation en plein écran')).toBeInTheDocument();
  });
});

// ============================================================================
// 5. Favoris — affichage et suppression
// ============================================================================

describe('Creative — onglet Favoris', () => {
  it('affiche l’état vide quand il n’y a aucun favori', async () => {
    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /Favoris/i }));

    expect(await screen.findByText('Aucun favori')).toBeInTheDocument();
  });

  it('affiche la liste des favoris et permet la suppression', async () => {
    setTable('creative_favorites', [buildFavorite()]);
    const user = userEvent.setup();

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });
    await user.click(screen.getByRole('tab', { name: /Favoris/i }));

    expect(await screen.findByText('Mood board marbre')).toBeInTheDocument();

    const card = screen.getByText('Mood board marbre').closest('div.rounded-xl') as HTMLElement;
    const deleteButton = within(card)
      .getAllByRole('button')
      .find((b) => b.className.includes('text-red-500'));
    expect(deleteButton).toBeDefined();
    await user.click(deleteButton as HTMLElement);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Favori supprimé'));
  });

  it('affiche le compteur de favoris dans l’onglet', async () => {
    setTable('creative_favorites', [buildFavorite(), buildFavorite({ id: 'fav-2', title: 'Autre' })]);

    render(<Creative />);

    expect(await screen.findByRole('tab', { name: /Favoris \(2\)/i })).toBeInTheDocument();
  });
});

// ============================================================================
// 6. Sauvegarde d’un favori (insert Supabase mocké)
// ============================================================================

describe('Creative — sauvegarde d’un favori', () => {
  it('enregistre un favori texte et affiche un toast de succès', async () => {
    const user = userEvent.setup();
    mockFetchJson({ type: 'text', content: 'Contenu à sauvegarder' });

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });
    await sendPrompt(user, 'Prompt favori');
    await screen.findByText('Contenu à sauvegarder');

    await user.click(screen.getByRole('button', { name: /Sauvegarder en favori/i }));
    await screen.findByRole('heading', { name: 'Sauvegarder en favori' });

    await user.type(screen.getByPlaceholderText(/Mood board marbre salle de bain/i), 'Mon titre');
    await user.click(screen.getByRole('button', { name: /^Enregistrer$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Favori enregistré !'));
  });
});

// ============================================================================
// 7. Upload d’image source
// ============================================================================

describe('Creative — upload d’image source', () => {
  it('ajoute une image source à combiner et affiche son étiquette', async () => {
    const user = userEvent.setup();

    render(<Creative />);
    await screen.findByRole('heading', { name: 'Studio Créatif DICA' });

    await user.type(screen.getByPlaceholderText(/Étiquette/i), 'Van');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'van.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Images à combiner \(1\/5\)/i)).toBeInTheDocument();
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Van uploadée'));
  });
});
