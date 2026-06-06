import { test, expect } from "@playwright/test";

/**
 * E2E de caractérisation — page Auth (`src/pages/Auth.tsx`).
 * LOT 4 vague 1 : fige le comportement ACTUEL avant refacto de complexité (S3776 ~17).
 *
 * La page /auth est PUBLIQUE : ces tests ne nécessitent aucun identifiant et
 * s'exécutent sans la fixture authentifiée. Sélecteurs robustes (rôles + ids
 * stables hérités du travail a11y du LOT 3).
 */

test.describe("Page Auth — caractérisation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("affiche l'en-tête et les deux onglets Connexion / Inscription", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "DICA Visual Studio" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Connexion" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Inscription" })).toBeVisible();
  });

  test("affiche le formulaire de connexion par défaut", async ({ page }) => {
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mot de passe oublié ?" })).toBeVisible();
  });

  test("bascule vers l'onglet Inscription et révèle ses champs", async ({ page }) => {
    await page.getByRole("tab", { name: "Inscription" }).click();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    await expect(page.locator("#signup-confirm")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer un compte" })).toBeVisible();
  });

  test("bloque la soumission d'un email invalide (validation native + reste sur /auth)", async ({ page }) => {
    const email = page.locator("#login-email");
    await email.fill("pas-un-email");
    await page.locator("#login-password").fill("Whatever1!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Le champ type="email" required est invalide → la soumission est bloquée
    // par le navigateur et l'utilisateur reste sur la page d'authentification.
    const isValid = await email.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("expose le lien vers les mentions légales", async ({ page }) => {
    const legal = page.getByRole("link", { name: /Mentions légales/i });
    await expect(legal).toBeVisible();
    await expect(legal).toHaveAttribute("href", "/mentions-legales");
  });

  test("bouton afficher/masquer le mot de passe sur le champ connexion", async ({ page }) => {
    const pwd = page.locator("#login-password");
    await expect(pwd).toHaveAttribute("type", "password");
    // Le bouton œil est le premier bouton ghost adjacent au champ mot de passe.
    await pwd.fill("Secret123!");
    await page.locator("#login-password").locator("xpath=following-sibling::button").click();
    await expect(pwd).toHaveAttribute("type", "text");
  });
});
