import { test, expect, skipIfNoCredentials } from "./fixtures/auth";

/**
 * E2E de caractérisation — page Admin (`src/pages/Admin.tsx`).
 * LOT 4 vague 1 : fige le comportement ACTUEL avant refacto.
 *
 * Page protégée par `requireAdmin` : nécessite E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD. Selon le rôle du compte de test, /admin :
 *   - rend "Administration DICA" (compte admin) ;
 *   - redirige vers /dashboard (compte non-admin).
 * Les deux comportements sont caractérisés ici. Sans identifiants → SKIP.
 */

test.describe("Page Admin — caractérisation", () => {
  // 1er hook sans fixture authentifiée : skip AVANT toute tentative de login.
  test.beforeEach(() => skipIfNoCredentials(test));
  // 2e hook : la fixture authentifiée n'est instanciée que si l'on n'a pas skip.
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/admin");
  });

  test("rend l'administration pour un admin, sinon redirige vers le dashboard", async ({ authenticatedPage: page }) => {
    const adminHeading = page.getByRole("heading", { name: "Administration DICA" });
    const isAdmin = await adminHeading.isVisible().catch(() => false);

    if (isAdmin) {
      await expect(adminHeading).toBeVisible();
      await expect(page.getByRole("tab", { name: /Utilisateurs/i })).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("expose les onglets de gestion quand l'utilisateur est admin", async ({ authenticatedPage: page }) => {
    const adminHeading = page.getByRole("heading", { name: "Administration DICA" });
    const isAdmin = await adminHeading.isVisible().catch(() => false);
    test.skip(!isAdmin, "Compte de test non-admin : onglets d'administration non disponibles.");

    await expect(page.getByRole("tab", { name: /Décors/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Catégories/i })).toBeVisible();
  });
});
