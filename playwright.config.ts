import { defineConfig, devices } from "@playwright/test";

/**
 * DICA Decorator — Configuration Playwright (E2E).
 * Mise en place LOT 4 vague 1 (filet anti-régression avant refactos de complexité).
 * Propriété KOREV AI — application développée pour DICA France.
 *
 * Prérequis d'exécution :
 *   - Variables Vite obligatoires pour que l'application démarre :
 *       VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 *     (cf. .env.example — l'app appelle createClient au boot et plante sans elles).
 *   - Variables E2E pour les parcours authentifiés (sinon les specs sont SKIP) :
 *       E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 *   - Port du serveur Vite : 8080 (cf. vite.config.ts).
 *
 * Le baseURL est surchargeable via E2E_BASE_URL pour cibler un environnement déployé.
 */

const PORT = 8080;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

// On ne démarre le serveur local que si l'on cible localhost (sinon on suppose
// que E2E_BASE_URL pointe vers un environnement déjà déployé).
const usesLocalServer = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

export default defineConfig({
  testDir: "./e2e",
  // Un fichier par page cible (creative, auth, project-detail, admin, dashboard).
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: usesLocalServer
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      }
    : undefined,
});
