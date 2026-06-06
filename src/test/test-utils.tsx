import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi } from 'vitest';

// Create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: Readonly<AllProvidersProps>) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Custom render function with all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data builders
export const buildTestUser = (overrides?: Partial<{
  id: string;
  email: string;
  role: 'admin' | 'client';
}>) => ({
  id: 'test-user-id',
  email: 'test@dica.com',
  role: 'client' as const,
  ...overrides,
});

export const buildTestProject = (overrides?: Partial<{
  id: string;
  title: string;
  use_case: string;
  user_id: string;
}>) => ({
  id: 'test-project-id',
  title: 'Test Project',
  use_case: 'ascenseur',
  user_id: 'test-user-id',
  client_reference: 'REF-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const buildTestDecor = (overrides?: Partial<{
  id: string;
  name: string;
  category: string;
  reference_code: string;
}>) => ({
  id: 'test-decor-id',
  name: 'Inox Brossé',
  reference_code: 'DIC-A23',
  category: 'metal',
  usage_contexts: ['ascenseur', 'van'],
  texture_image_url: '/decor-textures/test.jpg',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const buildTestOrganization = (overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
  monthly_render_quota: number;
  renders_used_this_month: number;
}>) => ({
  id: 'test-org-id',
  name: 'DICA Revendeur Test',
  slug: 'dica-test',
  logo_url: null,
  primary_color: '#E94E5D',
  subscription_tier: 'pro',
  monthly_render_quota: 500,
  renders_used_this_month: 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Async utilities
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock Supabase client for unit tests
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    not: vi.fn().mockReturnThis(),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.png' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/test.png' } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.com/test.png?token=mock' }, error: null }),
      download: vi.fn(),
    }),
  },
  functions: {
    invoke: vi.fn(),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
});

// Type assertion helpers
function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
  return value;
}

export { assertDefined };

// Rate limiting test helpers
export const simulateRateLimitedUser = () => ({
  userId: 'rate-limited-user',
  dailyRenderCount: 50,
  monthlyRenderCount: 500,
});

// Image test helpers
export const createMockImageFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const blob = new Blob([''], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
};

export const createBase64Image = () => 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// URL validation test helpers
export const maliciousUrls = [
  'http://localhost:8080/secret',
  'http://127.0.0.1/admin',
  'http://169.254.169.254/latest/meta-data', // AWS metadata
  'http://[::1]/internal',
  'file:///etc/passwd',
  'gopher://internal:25',
  'http://internal.company.local/api',
  'http://10.0.0.1/private',
  'http://192.168.1.1/router',
];

export const validExternalUrls = [
  'https://images.unsplash.com/photo-123.jpg',
  'https://cdn.example.com/texture.png',
  'https://storage.googleapis.com/bucket/image.jpg',
];
