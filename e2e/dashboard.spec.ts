import { test, expect, skipIfNoCredentials } from "./fixtures/auth";

/**
 * E2E de caractérisation — page Dashboard (`src/pages/Dashboard.tsx`).
 * LOT 4 vague 1 : fige le comportement ACTUEL avant refacto.
 *
 * Page protégée (ProtectedRoute) : nécessite E2E_TEST_EMAIL / E2E_TEST_PASSWORD.
 * Sans identifiants, ces tests sont SKIP (suite non rouge par défaut).
 */

test.describe("Page Dashboard — caractérisation", () => {
  test.beforeEach(() => skipIfNoCredentials(test));

  test("affiche le titre 'Mes Projets' et le bouton de création", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Mes Projets" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nouveau Projet/i })).toBeVisible();
  });

  test("expose la navigation principale (Assistant Créatif, Favoris, Déconnexion)", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("button", { name: /Assistant Créatif/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Mes Favoris/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Déconnexion/i })).toBeVisible();
  });

  test("le bouton Assistant Créatif navigue vers /creative", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: /Assistant Créatif/i }).first().click();
    await expect(page).toHaveURL(/\/creative$/);
  });

  test("affiche soit une grille de projets, soit l'état vide", async ({ authenticatedPage: page }) => {
    const emptyState = page.getByRole("heading", { name: "Aucun projet" });
    const projectCard = page.getByRole("button", { name: /Ouvrir le projet/i }).first();
    await expect(emptyState.or(projectCard)).toBeVisible();
  });
});
