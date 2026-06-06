import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://test-project.supabase.co';

// Types for mock data
interface MockUser {
  id: string;
  email: string;
  role: 'authenticated';
}

interface MockSession {
  access_token: string;
  refresh_token: string;
  user: MockUser;
}

// Mock data factories
export const mockUserFactory = (overrides?: Partial<MockUser>): MockUser => ({
  id: 'user-123-uuid',
  email: 'test@dica.com',
  role: 'authenticated',
  ...overrides,
});

export const mockSessionFactory = (overrides?: Partial<MockSession>): MockSession => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUserFactory(),
  ...overrides,
});

export const mockDecorFactory = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'decor-123-uuid',
  name: 'Inox Brossé Premium',
  reference_code: 'DIC-A23',
  category: 'metal',
  usage_contexts: ['ascenseur', 'van'],
  texture_image_url: '/decor-textures/3040_BN_FC.jpg',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockProjectFactory = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'project-123-uuid',
  user_id: 'user-123-uuid',
  title: 'Rénovation Ascenseur Haussmann',
  use_case: 'ascenseur',
  client_reference: 'CMD-2024-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockProjectPhotoFactory = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'photo-123-uuid',
  project_id: 'project-123-uuid',
  original_image_url: 'https://test-project.supabase.co/storage/v1/object/public/project-photos/user-123/photo.jpg',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockRenderResultFactory = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'render-123-uuid',
  project_photo_id: 'photo-123-uuid',
  decor_id: 'decor-123-uuid',
  result_image_url: 'https://test-project.supabase.co/storage/v1/object/public/render-results/user-123/render.png',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const mockOrganizationFactory = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'org-123-uuid',
  name: 'DICA Revendeur Paris',
  slug: 'dica-paris',
  logo_url: null,
  primary_color: '#E94E5D',
  subscription_tier: 'pro',
  monthly_render_quota: 500,
  renders_used_this_month: 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

// MSW Handlers
export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;
    
    if (body.email === 'blocked@test.com') {
      return HttpResponse.json(
        { error: 'User is blocked', message: 'Too many attempts' },
        { status: 429 }
      );
    }

    if (body.email === 'invalid@test.com') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUserFactory({ email: body.email }),
    });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUserFactory());
  }),

  // Database REST API endpoints
  http.get(`${SUPABASE_URL}/rest/v1/decors`, ({ request }) => {
    const url = new URL(request.url);
    const isActiveFilter = url.searchParams.get('is_active');
    
    const decors = [
      mockDecorFactory({ id: 'decor-1', name: 'Inox Brossé', category: 'metal' }),
      mockDecorFactory({ id: 'decor-2', name: 'Marbre Carrare', category: 'marbre', is_active: false }),
      mockDecorFactory({ id: 'decor-3', name: 'Chêne Naturel', category: 'bois' }),
    ];

    if (isActiveFilter === 'eq.true') {
      return HttpResponse.json(decors.filter(d => d.is_active));
    }

    return HttpResponse.json(decors);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return HttpResponse.json([
      mockProjectFactory({ id: 'project-1', title: 'Projet Alpha' }),
      mockProjectFactory({ id: 'project-2', title: 'Projet Beta' }),
    ]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([mockProjectFactory(body)], { status: 201 });
  }),

  http.get(`${SUPABASE_URL}/rest/v1/project_photos`, () => {
    return HttpResponse.json([mockProjectPhotoFactory()]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/render_results`, ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.get('user_id');
    const countOnly = request.headers.get('Prefer')?.includes('count=exact');
    
    // For rate limiting tests - return count header
    if (countOnly) {
      return HttpResponse.json(
        [],
        { 
          headers: { 
            'Content-Range': '0-49/50',
            'x-total-count': '50'
          } 
        }
      );
    }

    return HttpResponse.json([mockRenderResultFactory()]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/render_results`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([mockRenderResultFactory(body)], { status: 201 });
  }),

  http.get(`${SUPABASE_URL}/rest/v1/user_roles`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId === 'eq.admin-user-uuid') {
      return HttpResponse.json([{ id: 'role-1', user_id: 'admin-user-uuid', role: 'admin' }]);
    }
    
    return HttpResponse.json([{ id: 'role-2', user_id: 'user-123-uuid', role: 'client' }]);
  }),

  // Organizations (multi-tenant)
  http.get(`${SUPABASE_URL}/rest/v1/organizations`, () => {
    return HttpResponse.json([mockOrganizationFactory()]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/organization_members`, () => {
    return HttpResponse.json([{
      id: 'member-1',
      organization_id: 'org-123-uuid',
      user_id: 'user-123-uuid',
      role: 'member',
    }]);
  }),

  // Render usage (quotas)
  http.get(`${SUPABASE_URL}/rest/v1/render_usage`, () => {
    return HttpResponse.json([{
      id: 'usage-1',
      organization_id: 'org-123-uuid',
      user_id: 'user-123-uuid',
      render_count: 45,
      month: new Date().toISOString().slice(0, 7) + '-01',
    }]);
  }),

  // Storage endpoints
  http.post(`${SUPABASE_URL}/storage/v1/object/:bucket/:path*`, () => {
    return HttpResponse.json({ Key: 'uploaded-file.png' }, { status: 200 });
  }),

  http.get(`${SUPABASE_URL}/storage/v1/object/public/:bucket/:path*`, () => {
    // Return a small valid PNG for image tests
    const pngBuffer = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
      0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
      0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    return new HttpResponse(pngBuffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  }),

  // Edge Functions
  http.post(`${SUPABASE_URL}/functions/v1/apply-decor`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    
    // Simulate rate limit exceeded
    if (body.photoUrl === 'rate-limit-exceeded') {
      return HttpResponse.json(
        { error: 'Quota journalier atteint (50/50)' },
        { status: 429 }
      );
    }

    // Simulate SSRF attempt blocked
    if (typeof body.photoUrl === 'string' && body.photoUrl.includes('localhost')) {
      return HttpResponse.json(
        { error: 'URL non autorisée' },
        { status: 400 }
      );
    }

    // Simulate successful render
    return HttpResponse.json({
      success: true,
      resultUrls: [
        'https://test-project.supabase.co/storage/v1/object/public/render-results/user-123/render-1.png'
      ],
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/creative-chat`, async () => {
    return HttpResponse.json({
      type: 'text',
      content: 'Voici ma suggestion créative pour votre projet...',
    });
  }),
];

// Handlers for specific test scenarios
export const errorHandlers = {
  quotaExceeded: http.post(`${SUPABASE_URL}/functions/v1/apply-decor`, () => {
    return HttpResponse.json(
      { error: 'Quota mensuel dépassé (500/500 rendus)' },
      { status: 402 }
    );
  }),

  serverError: http.post(`${SUPABASE_URL}/functions/v1/apply-decor`, () => {
    return HttpResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }),

  invalidImage: http.post(`${SUPABASE_URL}/functions/v1/apply-decor`, () => {
    return HttpResponse.json(
      { error: 'Format d\'image non supporté' },
      { status: 400 }
    );
  }),

  unauthorized: http.get(`${SUPABASE_URL}/rest/v1/*`, () => {
    return HttpResponse.json(
      { error: 'JWT expired' },
      { status: 401 }
    );
  }),
};

