import { test, expect, skipIfNoCredentials } from "./fixtures/auth";

/**
 * E2E de caractérisation — page Creative / Assistant Créatif (`src/pages/Creative.tsx`).
 * LOT 4 vague 1 : fige le comportement ACTUEL avant refacto (S3776 ~36, la plus complexe).
 *
 * Page protégée : nécessite E2E_TEST_EMAIL / E2E_TEST_PASSWORD, sinon SKIP.
 */

test.describe("Page Creative — caractérisation", () => {
  // 1er hook sans fixture authentifiée : skip AVANT toute tentative de login.
  test.beforeEach(() => skipIfNoCredentials(test));
  // 2e hook : la fixture authentifiée n'est instanciée que si l'on n'a pas skip.
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/creative");
  });

  test("affiche l'en-tête Assistant Créatif et le bloc Studio", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Assistant Créatif" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Studio Créatif DICA" })).toBeVisible();
  });

  test("expose la navigation Retour / Accueil", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("button", { name: /Retour/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Accueil/i }).first()).toBeVisible();
  });

  test("affiche la zone de saisie du prompt", async ({ authenticatedPage: page }) => {
    await expect(
      page.getByPlaceholder(/mood board|Décrivez comment combiner/i).first(),
    ).toBeVisible();
  });

  test("affiche la section des créations favorites", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Mes créations favorites" })).toBeVisible();
  });

  test("le bouton Accueil ramène au dashboard", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: /Accueil/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
