import { test, expect, skipIfNoCredentials } from "./fixtures/auth";

/**
 * E2E de caractérisation — page ProjectDetail (`src/pages/ProjectDetail.tsx`).
 * LOT 4 vague 1 : fige le comportement ACTUEL avant refacto (S3776 ~16, S2004).
 *
 * Page protégée + dépendante des données : nécessite E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD ET au moins un projet existant sur le compte de test.
 * Sans identifiants → SKIP. Sans projet → le test ouvrant un projet est SKIP
 * dynamiquement (le compte vide reste un état légitime).
 */

test.describe("Page ProjectDetail — caractérisation", () => {
  // 1er hook sans fixture authentifiée : skip AVANT toute tentative de login.
  test.beforeEach(() => skipIfNoCredentials(test));
  // 2e hook : la fixture authentifiée n'est instanciée que si l'on n'a pas skip.
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
  });

  test("ouvre le premier projet et affiche son détail", async ({ authenticatedPage: page }) => {
    const firstProject = page.getByRole("button", { name: /Ouvrir le projet/i }).first();
    const hasProject = await firstProject.isVisible().catch(() => false);
    test.skip(!hasProject, "Aucun projet sur le compte de test : impossible de caractériser le détail.");

    await firstProject.click();
    await expect(page).toHaveURL(/\/project\/[^/]+$/);
    // Le titre du projet est rendu dans un <h1> (header du détail).
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("expose un bouton de retour vers la liste des projets", async ({ authenticatedPage: page }) => {
    const firstProject = page.getByRole("button", { name: /Ouvrir le projet/i }).first();
    const hasProject = await firstProject.isVisible().catch(() => false);
    test.skip(!hasProject, "Aucun projet sur le compte de test.");

    await firstProject.click();
    await expect(page).toHaveURL(/\/project\/[^/]+$/);
    await expect(page.getByRole("button", { name: /Retour/i }).first()).toBeVisible();
  });
});
