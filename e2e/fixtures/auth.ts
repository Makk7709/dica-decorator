import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fixture d'authentification réutilisable pour les E2E DICA Decorator.
 * Mise en place LOT 4 vague 1.
 *
 * Les pages cibles (dashboard, creative, project, admin) sont protégées par
 * `ProtectedRoute` + Supabase Auth. Comme on ne versionne aucun secret, les
 * identifiants de test sont lus depuis l'environnement :
 *   - E2E_TEST_EMAIL
 *   - E2E_TEST_PASSWORD
 *
 * Si l'une de ces variables est absente, les tests qui dépendent de la fixture
 * `authenticatedPage` (ou qui appellent `skipIfNoCredentials`) sont marqués
 * SKIP — la suite ne devient donc jamais ROUGE par défaut.
 */

export const E2E_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
export const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

export const hasE2ECredentials = E2E_EMAIL.length > 0 && E2E_PASSWORD.length > 0;

/**
 * À appeler en tête de `test()` / `test.beforeEach()` : marque le test SKIP
 * proprement si les identifiants de test ne sont pas fournis.
 */
export function skipIfNoCredentials(test: typeof base): void {
  test.skip(
    !hasE2ECredentials,
    "Identifiants E2E absents (définir E2E_TEST_EMAIL et E2E_TEST_PASSWORD pour activer ces tests).",
  );
}

/**
 * Connecte l'utilisateur via le formulaire de la page /auth, puis attend la
 * redirection vers /dashboard (comportement actuel de `handleLogin`).
 * Sélecteurs stables : ids de champs (#login-email / #login-password) et nom
 * accessible du bouton ("Se connecter").
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/auth");
  await page.locator("#login-email").fill(E2E_EMAIL);
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

/**
 * Étend le `test` Playwright avec une fixture `authenticatedPage` :
 * une page déjà connectée et positionnée sur /dashboard.
 *
 * IMPORTANT : protéger les specs qui consomment cette fixture par
 * `test.beforeEach(() => skipIfNoCredentials(test))`. Le skip empêche
 * l'instanciation de la fixture quand les identifiants sont absents, évitant
 * tout échec de connexion.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect };
