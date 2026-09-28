import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// DICA Decorator — Vite configuration
// Propriété KOREV AI — application développée pour DICA France
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      // CSP injected only in production builds (dev HMR needs inline scripts)
      name: "inject-csp",
      apply: "build",
      transformIndexHtml(html: string) {
        const csp = [
          "default-src 'self'",
          "script-src 'self' https://cdn.gpteng.co https://*.lovable.app https://*.lovable.dev",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' data: blob: https:",
          "connect-src 'self' https: wss://*.supabase.co",
          "worker-src 'self' blob:",
          "frame-src 'self' https://accounts.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://accounts.google.com",
        ].join("; ");
        return html.replace(
          "<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        );
      },
    },
  ],
  esbuild: mode === "production" ? { drop: ["debugger"], pure: ["console.log", "console.info", "console.debug"] } : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks - core libraries only
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          // Let Vite auto-split UI, Supabase, forms, and charts for better code-splitting
        },
      },
    },
    // Enable source maps for debugging in dev
    sourcemap: mode === 'development',
    // Minify in production
    minify: mode === 'production' ? 'esbuild' : false,
    // Target modern browsers
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
  },
}));
